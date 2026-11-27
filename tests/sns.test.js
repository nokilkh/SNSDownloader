const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { decode, normalize, target, toolIssue, tiktokPlaylist } = require('../src/main/sns/sources');
const { archive, scan } = require('../src/main/sns/archive');
const { postLink, instagramEmbedPost } = require('../src/main/sns/postLink');

test('backup links are restricted to canonical platform posts', () => {
  assert.equal(postLink('https://www.instagram.com/p/Df1-qHsmG5H/?img_index=1').url,
    'https://www.instagram.com/p/Df1-qHsmG5H/');
  assert.equal(postLink('https://twitter.com/Boss/status/1828419307900149793/photo/1').id,'1828419307900149793');
  assert.throws(()=>postLink('https://instagram.com.example/p/Df1-qHsmG5H/'));
  assert.throws(()=>postLink('https://x.com/Boss'));
});

test('Instagram embed restores all visible images in order without creating ALT or a date', () => {
  const small='https://scontent.cdninstagram.com/small.jpg';
  const original='https://scontent.cdninstagram.com/original.jpg';
  const options={display_url:small,dimensions:{width:3000,height:4000},display_resources:[
    {src:small,config_width:1080,config_height:1440},
    {src:original,config_width:3000,config_height:4000}]};
  const media={shortcode:'Example',id:'999',owner:{id:'123',username:'sample'},
    edge_sidecar_to_children:{edges:[{node:{...options,id:'200'}},{node:{...options,id:'100'}}]}};
  const nested=JSON.stringify(JSON.stringify({gql_data:{shortcode_media:media}}));
  const html='<script>ServerJS.handle(['+nested+']);</script>';
  const post=instagramEmbedPost(html,'Example');
  assert.equal(post.accountId,'123');
  assert.equal(post.date,null);
  assert.equal(post.expected,2);
  assert.deepEqual(post.media.map(item=>item.id),['200','100']);
  assert.equal(post.media[0].urls[0],original);
  assert.equal(post.media[0].altState,'na');
  assert.throws(()=>instagramEmbedPost(html,'Different'));
});

test('X keeps exact IDs, own replies and per-image ALT', () => {
  const rows = decode('[[2,{"tweet_id":1828419307900149793,"author":{"id":99,"name":"Boss"},"user":{"id":99},"reply_id":1,"content":"hello"}],[3,"https://pbs.twimg.com/media/sample?name=orig",{"tweet_id":1828419307900149793,"author":{"id":99,"name":"Boss"},"user":{"id":99},"num":1,"extension":"jpg","description":"line 1\\nline 2"}],[2,{"tweet_id":2,"author":{"id":9,"name":"other"},"user":{"id":99}}]]');
  const posts = normalize(target('X', 'https://x.com/Boss'), 'posts', rows);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].id, '1828419307900149793');
  assert.equal(posts[0].media[0].alt, 'line 1\nline 2');
  assert.equal(posts[0].kind, 'reply');
});

test('archive uses Hong Kong month, preserves versions, skips and repairs media', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sns-test-'));
  t.after(() => fs.rm(root,{ recursive:true, force:true }));
  const post = { platform:'X', account:'Boss', accountId:'99', id:'123', date:'2024-07-31T16:00:00Z', text:'before', media:[{id:'1',type:'image',ext:'jpg',alt:'original',altState:'present',url:'https://pbs.twimg.com/media/example'}] };
  let calls = 0;
  const transfer = async (media, file) => {
    calls++;
    await fs.writeFile(file,'verified media');
    return {width:4096,height:2731,quality:'best',ext:media.ext};
  };
  const options = {root,transfer,signal:new AbortController().signal};
  await archive(post,options);
  let [record] = await scan(root);
  assert.match(record.folder, /X\/Boss\/2024\/08\/2024-08-01_000000__123$/);
  await archive({...post,text:'after'},options);
  [record] = await scan(root);
  assert.equal(calls,1);
  assert.equal(record.text,'after');
  assert.equal(record.versions[0].text,'before');
  await fs.unlink(path.join(record.folder,record.media[0].file));
  await archive({...post,text:'after'},options);
  assert.equal(calls,2);
  assert.equal((await scan(root))[0].versions.length,1);
});

test('a saved X image without ALT is skipped without counting an access limitation', async t => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'sns-alt-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const media={id:'1',type:'image',ext:'png',order:1,altState:'unknown'};
  const post={platform:'X',account:'Boss',accountId:'99',id:'123',kind:'post',
    date:'2024-07-31T16:00:00Z',text:'caption',media:[media],expected:1};
  let calls=0;
  const transfer=async (_item,file)=>{
    calls++;
    await fs.writeFile(file,'fixture image');
    return {ext:'png',width:1,height:1,quality:'best'};
  };
  const options={root,transfer,signal:new AbortController().signal};
  const first=await archive(post,options);
  const repeat=await archive(post,{...options,previous:first.record,retry:true});
  assert.equal(calls,1);
  assert.equal(repeat.counts.skipped,1);
  assert.equal(first.counts.limited,0);
  assert.equal(repeat.counts.limited,0);
  const index=path.join(first.record.folder,'index.md');
  assert.doesNotMatch(await fs.readFile(index,'utf8'),/ALT 未能確認/);
  const added=await archive({...post,media:[{...media,altState:'present',alt:'原始 ALT'}]},options);
  const kept=await archive(post,options);
  assert.equal(added.record.media[0].alt,'原始 ALT');
  assert.equal(kept.record.media[0].alt,'原始 ALT');
  assert.match(await fs.readFile(index,'utf8'),/原始 ALT/);
  assert.equal((await archive({...post,expected:2},options)).counts.limited,1);
});

test('TikTok photo posts preserve source order and exclude audio previews', () => {
  const meta={id:'7631562466413186324',author:{id:'12',uniqueId:'example'},desc:'album',post_type:'image'};
  const posts=normalize(target('TikTok','@example'),'posts',[
    [2,meta],
    [3,'https://p16.tiktokcdn.com/second',{...meta,type:'image',num:2,file_id:'second',extension:'jpg',date:'2026-04-23 12:00:00'}],
    [3,'https://p16.tiktokcdn.com/first',{...meta,type:'image',num:1,file_id:'first',extension:'jpg'}],
    [3,'https://p16.tiktokcdn.com/audio',{...meta,type:'audio',num:0,file_id:'audio',extension:'m4a'}]
  ]);
  assert.equal(posts[0].id,meta.id);
  assert.equal(posts[0].date,'2026-04-23T12:00:00.000Z');
  assert.deepEqual(posts[0].media.map(m=>m.id),['first','second']);
  assert.match(posts[0].url,/\/photo\//);
});

test('a confirmed TikTok album replaces an old failed video placeholder', async t => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'sns-album-repair-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const signal=new AbortController().signal;
  const post={platform:'TikTok',account:'example',accountId:'12',id:'7631562466413186324',
    date:'2026-04-23T12:00:00Z',url:'https://www.tiktok.com/@example/video/7631562466413186324',
    text:'caption',media:[{id:'0',type:'video',order:0,altState:'na'}]};
  const old=await archive(post,{root,signal,transfer:async()=>{throw new Error('No video formats');}});
  const album={...post,url:post.url.replace('/video/','/photo/'),expected:2,media:[
    {id:'first',type:'image',order:1,altState:'na'},
    {id:'second',type:'image',order:2,altState:'na'}
  ]};
  const transfer=async (_media,file)=>{
    await fs.writeFile(file,'fixture photo');
    return {ext:'jpg',width:2160,height:2880,quality:'best'};
  };
  const repaired=await archive(album,{root,signal,previous:old.record,transfer});
  assert.deepEqual(repaired.record.media.map(item=>item.id),['first','second']);
  assert.equal(repaired.record.folder,old.record.folder);
  const repeated=await archive(album,{root,signal,previous:repaired.record,transfer});
  assert.equal(repeated.counts.skipped,2);
});

test('IG story and highlight use the same stable story and media IDs', () => {
  const common={media_id:'123456',user:{pk:'12',username:'example'},num:1,extension:'jpg'};
  const row=(post_id,extra)=>[3,'https://scontent.cdninstagram.com/photo',{...common,post_id,...extra}];
  const account=target('IG','example');
  const [story]=normalize(account,'story',[row('12',{})]);
  const [highlight]=normalize(account,'highlight',[row('99',{highlight_title:'Saved'})]);
  assert.equal(story.id,highlight.id);
  assert.equal(story.media[0].id,highlight.media[0].id);
  assert.deepEqual(highlight.memberships,[{id:'99',title:'Saved'}]);
});

test('classifies gallery-dl structured errors without exposing upstream text', () => {
  assert.equal(toolIssue({error:'AuthRequired',message:'authenticated cookies needed'}),'access');
  assert.equal(toolIssue({error:'HttpError',message:"'403 Forbidden' for profile"}),'forbidden');
  assert.equal(toolIssue({error:'NotFoundError',message:'Requested user could not be found'}),'profile-unverified');
});

test('TikTok playlist accepts owned videos with stable IDs and records incomplete coverage', () => {
  const account=target('TikTok','@Example');
  const video={id:'7709134472410631445',uploader_id:'7312057023712396295',
    uploader:'example',timestamp:1794922745,duration:15,description:'caption',
    url:'https://www.tiktok.com/@example/video/7709134472410631445'};
  const data=[video,video,{...video,id:'99',uploader:'other'},
    {...video,id:'777',url:'https://www.tiktok.com/@example/photo/777'},
    {...video,id:'888',duration:0,url:'https://www.tiktok.com/@example/video/888'}];
  const result=tiktokPlaylist(account,data.map(item=>JSON.stringify(item)).join('\n'));
  assert.equal(result.posts.length,1);
  assert.deepEqual(result.errors,['photos-unverified']);
  const [post]=result.posts;
  assert.equal(post.accountId,video.uploader_id);
  assert.equal(post.text,'caption');
  assert.equal(post.date,'2026-11-17T13:39:05.000Z');
  assert.equal(post.media[0].id,'0');
  assert.equal(post.media[0].postUrl.toLowerCase(),video.url);
});
