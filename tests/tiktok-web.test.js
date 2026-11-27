const assert=require('node:assert/strict');
const {accountPage}=require('../src/main/sns/tiktokWeb');
const {checkAccountAccess}=require('../src/main/sns/login');
const account={handle:'sample',platform:'TikTok'};
const item={author:{uniqueId:'sample',id:'100'},id:'7710980391611518226',createTime:110,
  imagePost:{images:[{imageURL:{urlList:['https://cdn.tiktokcdn.com/1.jpg']}},{imageURL:{urlList:[]}}]}};
const page={itemList:[item],statusCode:0,hasMore:true};
const partial=accountPage(account,page);
assert.equal(partial.incomplete,true);
assert.equal(partial.posts[0].expected,2);
assert.equal(partial.posts[0].media.length,1);
assert.equal(accountPage({...account,handle:'other'},page).posts.length,0);
assert.throws(()=>accountPage(account,{...page,statusCode:1}));
checkAccountAccess(account,async()=>({posts:[],errors:['tiktok-empty-body']}),async()=>({posts:[{}]}))
  .then(status=>assert.equal(status,'videos-empty-body')).catch(error=>{console.error(error);process.exitCode=1;});

const {test}=require('node:test');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {creatorPosts}=require('../src/main/sns/tiktokWeb');
const {mediaURL}=require('../src/main/sns/sources');

test('TikTok primary timeout still checks the independent public video listing',async()=>{
  const timedOut=async()=>{throw Object.assign(new Error('deadline'),{killed:true});};
  assert.equal(await checkAccountAccess(account,timedOut,async()=>({posts:[{}]})),'videos-access');
  assert.equal(await checkAccountAccess(account,timedOut,async()=>({posts:[]})),'timeout');
});

test('mediaURL and accountPage accept numbered TikTok webapp-prime CDN hosts while rejecting web pages',()=>{
  assert.equal(mediaURL('https://v19-webapp-prime.tiktok.com/video/tos/useast2a/sample.mp4'),true);
  assert.equal(mediaURL('https://v77-webapp-prime.tiktok.com/video/tos/useast2a/sample.mp4'),true);
  assert.equal(mediaURL('https://www.tiktok.com/@sample/video/7710980391611518226'),false);
  const videoItem={
    author:{uniqueId:'sample',id:'100',secUid:'MS4wLjABAAAA1234567890abcdef'},
    id:'7710980391611518226',createTime:1700000000,desc:'hello',
    video:{width:1080,height:1920,bitrateInfo:[{Bitrate:1000,PlayAddr:{Width:1080,Height:1920,UrlList:['https://v19-webapp-prime.tiktok.com/video/tos/sample.mp4']}}]}
  };
  const parsed=accountPage(account,{itemList:[videoItem],statusCode:0,hasMore:false});
  assert.equal(parsed.incomplete,false);
  assert.equal(parsed.posts.length,1);
  assert.equal(parsed.posts[0].media.length,1);
  assert.equal(parsed.secUid,'MS4wLjABAAAA1234567890abcdef');
});

test('SNSAccountIE handles None aweme during embed secUid lookup, exports secUid and supports direct sec_uid extraction',()=>{
  const ytdlp=['/opt/homebrew/bin/yt-dlp','/usr/local/bin/yt-dlp'].find(p=>fs.existsSync(p));
  assert.ok(ytdlp,'yt-dlp must be installed to verify the TikTok extractor plugin');
  const shebang=fs.readFileSync(ytdlp,'utf8').split('\n')[0].replace(/^#!/,'').trim();
  const pluginFile=path.resolve(__dirname,'../resources/tiktok-plugins/sns/yt_dlp_plugins/extractor/sns_tiktok.py');
  const py=`
import importlib.util, json
from yt_dlp import YoutubeDL
spec = importlib.util.spec_from_file_location('sns_tiktok', ${JSON.stringify(pluginFile)})
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
ydl = YoutubeDL({'quiet': True, 'extractor_args': {'snsaccount': {'sec_uid': ['MS4wLjABAAAAtestSecUid123456']}}})
ie = mod.SNSAccountIE(ydl)
none_res = ie._parse_aweme_video_web(None, 'https://www.tiktok.com/@sample/video/1', '1', extract_flat=True)
assert isinstance(none_res, dict) and 'sns_item' not in none_res, none_res
valid_aweme = {'id': '1', 'createTime': 1700000000, 'desc': 'ok', 'author': {'id': '100', 'uniqueId': 'sample', 'secUid': 'MS4wLjABAAAAtestSecUid123456'}, 'video': {'width': 1080, 'height': 1920}}
parsed = ie._parse_aweme_video_web(valid_aweme, 'https://www.tiktok.com/@sample/video/1', '1', extract_flat=True)
assert parsed['sns_item']['author']['secUid'] == 'MS4wLjABAAAAtestSecUid123456', parsed['sns_item']
called = []
ie._entries = lambda sec_uid, user_name, fail_early=False: (called.append((sec_uid, user_name, fail_early)) or iter([]))
ie._download_webpage = lambda *a, **kw: (_ for _ in ()).throw(AssertionError('should not download webpage when sec_uid is provided'))
playlist = ie._real_extract('https://www.tiktok.com/@sample')
assert called == [('MS4wLjABAAAAtestSecUid123456', 'sample', False)], called
assert playlist['id'] == 'MS4wLjABAAAAtestSecUid123456', playlist
print('OK')
`;
  const out=execFileSync(shebang,['-c',py],{encoding:'utf8'});
  assert.equal(out.trim(),'OK');
});

test('creatorPosts enables extractor retries, forwards secUid and falls back to handle if cached secUid yields no posts',async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sns-tiktok-test-'));
  const callsFile=path.join(tmp,'calls.json');
  const fakeYtDlp=path.join(tmp,'yt-dlp');
  fs.writeFileSync(fakeYtDlp,`#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
const calls = fs.existsSync(${JSON.stringify(callsFile)}) ? JSON.parse(fs.readFileSync(${JSON.stringify(callsFile)}, 'utf8')) : [];
calls.push(args);
fs.writeFileSync(${JSON.stringify(callsFile)}, JSON.stringify(calls));
const hasStaleSecUid = args.some(a => a.includes('sec_uid=MS4wLjABAAAAstale'));
if (hasStaleSecUid) {
  process.stdout.write('');
  process.exit(0);
}
process.stdout.write(JSON.stringify({
  id: '7710980391611518226', createTime: 1700000000, desc: 'ok',
  author: { id: '100', uniqueId: 'sample', secUid: 'MS4wLjABAAAAfreshSecUid999' },
  video: { width: 1080, height: 1920, bitrateInfo: [{ Bitrate: 1000, PlayAddr: { Width: 1080, Height: 1920, UrlList: ['https://v19-webapp-prime.tiktok.com/v.mp4'] } }] },
  last: true
}) + '\\n');
`,{mode:0o755});
  const oldPath=process.env.PATH;
  process.env.PATH=tmp+path.delimiter+(oldPath || '');
  try{
    const res=await creatorPosts({...account,secUid:'MS4wLjABAAAAstale'},new AbortController().signal,{probe:true});
    const calls=JSON.parse(fs.readFileSync(callsFile,'utf8'));
    assert.equal(calls.length,2,'should try cached secUid first and fall back to @handle');
    const retriesIndex=calls[0].indexOf('--extractor-retries');
    assert.ok(retriesIndex>=0 && Number(calls[0][retriesIndex+1])>=3,'must allow TikTokUserIE RetryManager retries');
    assert.ok(calls[0].some(a=>a.includes('sec_uid=MS4wLjABAAAAstale')));
    assert.ok(!calls[1].some(a=>a.includes('sec_uid=')));
    assert.equal(res.posts.length,1);
    assert.deepEqual(res.errors,[]);
    assert.equal(res.secUid,'MS4wLjABAAAAfreshSecUid999');
  }finally{
    process.env.PATH=oldPath;
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('TikTok creator listing check reports connected status instead of a yellow warning',()=>{
  const mainSource=fs.readFileSync(path.resolve(__dirname,'../src/main/sns/main.js'),'utf8');
  const appSource=fs.readFileSync(path.resolve(__dirname,'../src/renderer/sns/app.js'),'utf8');
  assert.match(mainSource,/if\(result\.posts\.length && !result\.errors\.length\)return 'connected';/);
  assert.doesNotMatch(mainSource,/creator-access/);
  assert.doesNotMatch(appSource,/creator-access/);
});
