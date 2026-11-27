const {randomUUID}=require('node:crypto');
const {setTimeout:delay}=require('node:timers/promises');
const {normalize,mediaURL,decode,command,toolIssue}=require('./sources');
const path=require('node:path');
const {existsSync}=require('node:fs');

const secUidPattern=/^MS4wLjABAAAA[\w-]+$/;

async function runCreatorQuery(account,pluginDir,signal,{probe=false,id,secUid}={}){
  const args=['--ignore-config','--no-plugin-dirs','--plugin-dirs',pluginDir,'--use-extractors','sns:tiktok',
    '--no-cache-dir','--flat-playlist','--lazy-playlist','--no-progress','--no-warnings','--socket-timeout','12',
    '--extractor-retries',probe?'3':'5','--retries','0','--print','%(sns_item)j'];
  if(probe)args.push('--playlist-items','1:3');
  const extra=[];
  if(id && /^\d+$/.test(id))extra.push('post_id='+id);
  if(secUid && secUidPattern.test(secUid))extra.push('sec_uid='+secUid);
  if(extra.length)args.push('--extractor-args','snsaccount:'+extra.join(';'));
  let stdout,issue;
  try{
    ({stdout}=await command('yt-dlp',[...args,'--','https://www.tiktok.com/@'+account.handle],signal,probe?45000:480000,{PYTHONDONTWRITEBYTECODE:'1'}));
  }catch(error){
    signal.throwIfAborted();
    stdout=error.stdout || '';
    issue=toolIssue(error);
  }
  const posts=[];
  let end=false,incomplete=false,observedSecUid;
  for(const line of stdout.trim().split('\n').filter(Boolean)){
    try{
      const item=decode(line);
      const batch=accountPage(account,{itemList:[item],statusCode:0,hasMore:!item.last});
      posts.push(...batch.posts);
      if(!observedSecUid && batch.secUid)observedSecUid=batch.secUid;
      incomplete ||= batch.incomplete;
      end=item.last===true;
    }catch{incomplete=true;}
  }
  const errors=issue?[issue]:[];
  if(incomplete || (!end && !probe && !id))errors.push('photos-unverified');
  return {posts,errors,secUid:observedSecUid};
}

async function creatorPosts(account,signal,{probe=false,id}={}){
  const pluginDir=[process.resourcesPath,path.resolve(__dirname,'../../../resources')].filter(Boolean)
    .map(root=>path.join(root,'tiktok-plugins')).find(dir=>existsSync(path.join(dir,'sns','yt_dlp_plugins','extractor','sns_tiktok.py')));
  if(!pluginDir)return {posts:[],errors:['missing-tool']};
  const cached=secUidPattern.test(account.secUid || '') ? account.secUid : null;
  if(cached){
    const fast=await runCreatorQuery(account,pluginDir,signal,{probe,id,secUid:cached});
    if(fast.posts.length || fast.errors.includes('rate-limit'))return fast;
  }
  return runCreatorQuery(account,pluginDir,signal,{probe,id});
}

function accountPage(account,page) {
  if(page.statusCode!==0 || !Array.isArray(page.itemList) || typeof page.hasMore!=='boolean')throw Error('unverified');
  const posts=[];
  let incomplete=false, secUid;
  for(const item of page.itemList){
    if(item?.author?.uniqueId?.toLowerCase()!==account.handle.toLowerCase() || !/^\d+$/.test(item.author.id) || !/^\d+$/.test(item.id)){
      incomplete=true;
      continue;
    }
    if(!secUid && secUidPattern.test(item.author.secUid || ''))secUid=item.author.secUid;
    const images=item.imagePost?.images;
    const variants=(item.video?.bitrateInfo || []).filter(v=>v.PlayAddr?.UrlList?.some(mediaURL))
      .sort((a,b)=>b.PlayAddr.Height*b.PlayAddr.Width-a.PlayAddr.Height*a.PlayAddr.Width || b.Bitrate-a.Bitrate);
    const base={id:item.id,author:item.author,desc:item.desc,date:new Date(Number(item.createTime)*1000).toISOString(),
      count:images?.length || 1,post_type:images?'image':'video'};
    const rows=[];
    if(images){
      for(const [index,img] of images.entries()){
        const urls=(img.imageURL?.urlList || []).filter(mediaURL);
        if(urls.length)rows.push([3,urls[0],{...base,num:index+1,extension:'jpg',width:img.imageWidth,height:img.imageHeight,_fallback:urls.slice(1)}]);
      }
    }else{
      const addr=variants[0]?.PlayAddr;
      const urls=variants.flatMap(v=>v.PlayAddr.UrlList).concat(item.video?.playAddr || []).filter(mediaURL);
      if(urls.length)rows.push([3,urls[0],{...base,num:0,extension:'mp4',width:addr?.Width || item.video.width,height:addr?.Height || item.video.height,_fallback:urls.slice(1)}]);
    }
    if(rows.length!==base.count)incomplete=true;
    const [post]=normalize(account,'posts',[[2,base],...rows]);
    if(post){
      for(const m of post.media)if(m.type==='video')m.directBest=Boolean(variants.length);
      posts.push(post);
    }
  }
  return {posts,incomplete,secUid};
}

async function webPosts(account,jar,signal,{probe=false,id}={}) {
  const {BrowserWindow}=require('electron');
  const win=new BrowserWindow({show:false,webPreferences:{partition:'sns-list-'+randomUUID(),sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  const wc=win.webContents, dbg=wc.debugger;
  const posts=new Map(), pending=new Map();
  const visited=new Set();
  let cursor='0',end=false,partial=false,received=false,emptyBody=false,last=Date.now();
  const destroy=()=>{if(!win.isDestroyed())win.destroy();};
  signal.addEventListener('abort',destroy,{once:true});
  try{
    signal.throwIfAborted();
    wc.setWindowOpenHandler(()=>({action:'deny'}));
    wc.session.setPermissionRequestHandler((_wc,_perm,cb)=>cb(false));
    wc.session.on('will-download',event=>event.preventDefault());
    for(const line of (jar || '').split('\n')){
      const [domain,subs,cookiePath,secure,expiry,name,value]=line.replace(/^#HttpOnly_/,'').split('\t');
      if(!name || !/^(?:\.?[\w-]+\.)*\.?tiktok\.com$/i.test(domain) || (Number(expiry)>0 && Number(expiry)<=Date.now()/1000))continue;
      try{
        await wc.session.cookies.set({url:'https://'+domain.replace(/^\./,'')+cookiePath,...(subs==='TRUE'?{domain}:{}),path:cookiePath,name,value,secure:secure==='TRUE',httpOnly:line.startsWith('#HttpOnly_'),...(Number(expiry)?{expirationDate:Number(expiry)}:{})});
      }catch{}
    }
    await wc.loadURL('about:blank');
    dbg.attach('1.3');
    dbg.on('message',async(_event,method,p)=>{
      try{
        if(method==='Network.responseReceived'){
          if(!p?.response?.url)return;
          let u;
          try{u=new URL(p.response.url);}catch{return;}
          if(u.origin==='https://www.tiktok.com' && u.pathname==='/api/post/item_list/' && p.response.status===200)
            pending.set(p.requestId,u.searchParams.get('cursor') || '0');
          return;
        }
        if(method!=='Network.loadingFinished' || !pending.has(p.requestId))return;
        const start=pending.get(p.requestId);pending.delete(p.requestId);
        const r=await dbg.sendCommand('Network.getResponseBody',{requestId:p.requestId});
        if(start!==cursor || end)return;
        if(!r.body){emptyBody=true;return;}
        const page=decode(r.base64Encoded?Buffer.from(r.body,'base64').toString():r.body);
        const batch=accountPage(account,page);
        for(const post of batch.posts)posts.set(post.id,post);
        received=true;partial ||= batch.incomplete;last=Date.now();
        end=page.hasMore===false;
        visited.add(start);
        if(!end && (!page.cursor || visited.has(String(page.cursor)))){partial=true;end=true;}
        cursor=String(page.cursor);
      }catch{partial=true;}
    });
    await dbg.sendCommand('Network.enable');
    await Promise.race([wc.loadURL('https://www.tiktok.com/@'+account.handle),delay(15000,undefined,{signal,ref:false})]);
    const deadline=Date.now()+(probe?15000:180000);
    while(!end && !(id && posts.has(id)) && !(probe && received) && Date.now()<deadline && Date.now()-last<20000){
      signal.throwIfAborted();
      await Promise.race([
        wc.executeJavaScript('window.scrollTo(0,document.documentElement.scrollHeight)').catch(()=>{}),
        delay(1000,undefined,{signal,ref:false})
      ]);
      await delay(500,undefined,{signal});
    }
  }catch{signal.throwIfAborted();}
  finally{
    signal.removeEventListener('abort',destroy);
    try{if(!win.isDestroyed() && dbg.isAttached())dbg.detach();}catch{}
    destroy();
  }
  return {posts:[...posts.values()],errors:received && end && !partial?[]:[emptyBody && !received?'tiktok-empty-body':'photos-unverified']};
}
module.exports={accountPage,webPosts,creatorPosts};
