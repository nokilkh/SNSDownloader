const {setTimeout:delay}=require('node:timers/promises');
const {decode,mediaURL,normalize}=require('./sources');

const origin='https://www.instagram.com';
const timelineField='xdt_api__v1__feed__user_timeline_graphql_connection';
const documentId='29104886249145907';
const reelsDocumentId='28170354102656082';
const highlightsTrayOp={name:'PolarisProfileStoryHighlightsTrayContentQuery',docId:'26970053832668570',params:[]};
const storiesGalleryOp={name:'PolarisStoriesV3ReelPageGalleryQuery',docId:'30276333305287704',params:['PolarisCommunityNoteStoriesLabelEnabled']};
const relayPrefix='__relay_internal__pv__Polaris';
const appId='936619743392459';
const asbdId='359341';
const bundlePrefix='https://static.cdninstagram.com/rsrc.php/';
const invalid='ig-web-unverified';
const scopeIssue={reels:'reels-unverified',story:'stories-unverified',highlight:'highlights-unverified'};
const bootstrapFailure='ig-web-bootstrap';
const queryFailure='ig-web-query';
const identityFailure='ig-web-identity';
const stopCodes=new Set(['access','forbidden','network','rate-limit',invalid,bootstrapFailure,queryFailure,identityFailure]);

function igCookies(jar) {
  const result=new Map();
  const now=Date.now()/1000;
  for(const line of jar.split(/\r?\n/)){
    const [domain,children,path,secure,expiry,name,value]=line.replace(/^#HttpOnly_/,'').split('\t');
    if(!domain || domain.startsWith('#') || path!=='/' ||
      !['TRUE','FALSE'].includes(secure) ||
      !((domain.replace(/^\./,'')==='instagram.com' && children==='TRUE') || domain.replace(/^\./,'')==='www.instagram.com') ||
      !/^[a-z\d_.-]+$/i.test(name || '') || !value || /[^\x21-\x7e]|[;,]/.test(value) ||
      !/^\d+$/.test(expiry || '') || (Number(expiry)!==0 && Number(expiry)<=now))continue;
    result.set(name,value);
  }
  return result;
}

function queryVariables(handle,cursor) {
  const result={
    username:handle,first:12,include_multi_captions:true,
    data:{count:12,include_reel_media_seen_timestamp:true,include_relationship_info:true,
      latest_besties_reel_media:true,latest_reel_media:true}
  };
  for(const [provider,enabled] of Object.entries({
    MultiCaptionCarouselEnabled:true,ShortDramaEnabled:true,SEOIsCrawler:false,
    ThreadsStyleCommentsEnabled:false,ReelsRecoDebugOverlayEnabled:false
  }))result[relayPrefix+provider+'relayprovider']=enabled;
  if(cursor)Object.assign(result,{after:cursor,before:null,last:null});
  return result;
}

function updateIgCookies(cookies,headers,pathname) {
  for(const header of headers.getSetCookie()){
    const [pair,...fields]=header.split(';');
    const equals=pair.indexOf('=');
    if(equals<1)continue;
    const name=pair.slice(0,equals).trim();
    const value=pair.slice(equals+1).trim();
    const attrs=new Map(fields.map(field=>{
      const [key,...parts]=field.trim().split('=');
      return [key.toLowerCase(),parts.join('=')];
    }));
    const domain=attrs.get('domain')?.replace(/^\./,'').toLowerCase();
    const cookiePath=attrs.get('path') || pathname.slice(0,pathname.lastIndexOf('/')) || '/';
    if((domain && !['instagram.com','www.instagram.com'].includes(domain)) || cookiePath!=='/' ||
      !/^[a-z\d_.-]+$/i.test(name) || /[^\x21-\x7e]|[;,]/.test(value))continue;
    const maxAge=attrs.get('max-age');
    const expired=maxAge!==undefined && /^-?\d+$/.test(maxAge) ? Number(maxAge)<=0 :
      Date.parse(attrs.get('expires') || '')<=Date.now();
    if(!value || expired)cookies.delete(name);
    else cookies.set(name,value);
  }
}

async function readResponse(fetcher,url,options,signal,cookies,stage) {
  let response;
  try{
    response=await fetcher(url,{...options,redirect:'manual',signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});
  }catch{
    signal.throwIfAborted();
    throw new Error('network');
  }
  if(!response.ok){
    await response.body?.cancel().catch(()=>{});
    if(response.status===429)throw new Error('rate-limit');
    if(response.status===403)throw new Error('forbidden');
    if(response.status===401 || (response.status>=300 && response.status<400))throw new Error('access');
    throw new Error(stage);
  }
  if(!response.body)throw new Error(stage);
  updateIgCookies(cookies,response.headers,new URL(url).pathname);
  let bytes=0;
  const chunks=[];
  for await(const chunk of response.body){
    bytes+=chunk.length;
    if(bytes>16*1024*1024)throw new Error(stage);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function markDirect(posts) {
  for(const post of posts)for(const media of post.media)if(media.type==='video'){
    media.videoUseTool=false;
    media.directBest=true;
  }
  return posts;
}

function graphqlConnection(payload) {
  const queue=[payload?.data];
  const seen=new Set();
  while(queue.length){
    const value=queue.shift();
    if(!value || typeof value!=='object' || seen.has(value))continue;
    seen.add(value);
    if(Array.isArray(value.edges) && typeof value.page_info?.has_next_page==='boolean')return value;
    if(seen.size>40)break;
    for(const child of Object.values(value))if(child && typeof child==='object')queue.push(child);
  }
  return null;
}

function payloadMessage(payload) {
  return [payload?.message,...(Array.isArray(payload?.errors)?payload.errors.map(error=>error?.message):[])].join(' ');
}

function assertPayload(payload) {
  const message=payloadMessage(payload);
  if(payload?.challenge || payload?.checkpoint_url || /login_required|checkpoint_required|challenge_required/i.test(message))throw new Error('access');
  if(/feedback_required|please wait a few minutes|rate limit|too many requests/i.test(message))throw new Error('rate-limit');
}

function bestVariant(item) {
  const versions=item?.video_versions;
  const video=Number(item?.media_type)===2 || (Array.isArray(versions) && versions.length>0);
  const choices=video?versions:item?.image_versions2?.candidates;
  if(!Array.isArray(choices))return null;
  const variants=choices.filter(choice=>mediaURL(choice?.url)).sort((a,b)=>(b.width*b.height||0)-(a.width*a.height||0));
  if(!variants.length)return null;
  const [best]=variants;
  return {url:best.url,width:best.width,height:best.height,ext:video?'mp4':'jpg',fallback:variants.slice(1).map(choice=>choice.url)};
}

function storyRows(reel,account,highlight) {
  const owner=reel?.user||{};
  const ownerId=String(owner.pk||owner.id||'');
  const reelId=String(reel?.id||'').split(':').pop();
  if(account.accountId && ownerId && ownerId!==String(account.accountId))return [];
  const username=typeof owner.username==='string' && owner.username ? owner.username :
    ownerId && ownerId===String(account.accountId) ? account.handle : '';
  const items=Array.isArray(reel?.items)?reel.items:[];
  const rows=[];
  for(const [index,item] of items.entries()){
    const media=bestVariant(item);
    const id=String(item?.pk||String(item?.id||'').split('_')[0]||'');
    if(!media || !/^\d+$/.test(id))continue;
    const taken=new Date(Number(item.taken_at)*1000);
    rows.push([3,media.url,{
      media_id:id,post_id:highlight && /^\d+$/.test(reelId)?reelId:id,
      ...(highlight?{highlight_title:String(reel?.title||'')}:{}),
      user:{pk:ownerId||String(account.accountId||''),username},
      date:Number(item.taken_at)>0 && Number.isFinite(+taken)?taken.toISOString():null,
      description:typeof item?.caption?.text==='string'?item.caption.text:'',
      extension:media.ext,width:media.width,height:media.height,num:index+1,count:items.length,
      _fallback:media.fallback
    }]);
  }
  return rows;
}

function relayVariables(variables,params=[]) {
  const result={...variables};
  for(const param of params){
    const key='__relay_internal__pv__'+param+'relayprovider';
    if(!(key in result))result[key]=param!=='PolarisSEOIsCrawler';
  }
  return result;
}

const MAX_BUNDLE_BYTES=8*1024*1024;

async function scanOpsFromHtml(session,html,signal,targetName) {
  if(!html || !html.includes(bundlePrefix))return;
  const hasTarget=()=>{
    if(!targetName)return false;
    const found=session.ops.get(targetName);
    return Boolean(found?.docId && found?.params!==undefined);
  };
  if(hasTarget())return;
  const hrefs=[...new Set([...html.matchAll(/href="(https:\/\/static\.cdninstagram\.com\/rsrc\.php\/[^"]+\.js[^"]*)"/g)]
    .map(match=>match[1].replace(/&amp;/g,'&')))].slice(0,40);
  const opNames=[highlightsTrayOp.name,storiesGalleryOp.name].join('|');
  const docRe=new RegExp(`__d\\("(${opNames})_instagramRelayOperation",\\[\\],\\(function\\([^)]+\\).+?\\bexports="([^"]+)"`,'g');
  const paramRe=new RegExp(`__d\\("(${opNames})(?:\\.graphql|\\$Parameters)",\\[([^\\]]+)\\]`,'g');
  for(const href of hrefs){
    if(session.scannedBundles.has(href))continue;
    session.scannedBundles.add(href);
    let js='';
    try{
      const response=await session.fetcher(href,{redirect:'manual',signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});
      if(!response.ok || !response.body){await response.body?.cancel().catch(()=>{});continue;}
      let bytes=0;
      const chunks=[];
      let oversized=false;
      for await(const chunk of response.body){
        bytes+=chunk.length;
        if(bytes>MAX_BUNDLE_BYTES){oversized=true;break;}
        chunks.push(chunk);
      }
      if(oversized){await response.body?.cancel().catch(()=>{});continue;}
      js=Buffer.concat(chunks).toString('utf8');
    }catch{
      signal.throwIfAborted();
      continue;
    }
    for(const match of js.matchAll(docRe)){
      const current=session.ops.get(match[1])||{};
      session.ops.set(match[1],{...current,docId:match[2]});
    }
    for(const match of js.matchAll(paramRe)){
      const params=[...new Set(match[2].split(',').map(item=>item.trim()).filter(item=>item.endsWith('.relayprovider"')).map(item=>item.slice(1,-15)))];
      const current=session.ops.get(match[1])||{};
      session.ops.set(match[1],{...current,params});
    }
    if(hasTarget())return;
  }
}

async function resolveOp(session,account,signal,op) {
  const read=()=>{
    const found=session.ops.get(op.name);
    return found?.docId ? {docId:found.docId,params:found.params??op.params} : null;
  };
  let resolved=read();
  if(resolved)return resolved;
  await scanOpsFromHtml(session,session.home,signal,op.name);
  resolved=read();
  if(resolved)return resolved;
  if(session.home.includes(bundlePrefix)){
    if(!session.profileHtml && !session.scannedProfile){
      session.scannedProfile=true;
      try{
        session.profileHtml=await readResponse(session.fetcher,origin+'/'+account.handle+'/',{headers:{...session.headers(),accept:'text/html,*/*;q=0.8'}},signal,session.cookies,op.name);
      }catch{
        signal.throwIfAborted();
      }
    }
    if(session.profileHtml){
      await scanOpsFromHtml(session,session.profileHtml,signal,op.name);
      resolved=read();
      if(resolved)return resolved;
    }
  }
  return {docId:op.docId,params:op.params};
}

async function openSession(account,jar,signal,{fetcher,userAgent,sessionBox}) {
  if(sessionBox?.current && sessionBox.jar===jar && sessionBox.handle===account.handle.toLowerCase())return sessionBox.current;
  if(!/^[a-z\d_][a-z\d_.]{0,29}$/i.test(account.handle))throw new Error(invalid);
  const cookies=igCookies(jar);
  if(!cookies.get('sessionid') || !cookies.get('csrftoken'))throw new Error('access');
  const headers=()=>({
    accept:'*/*',...(userAgent?{'user-agent':userAgent}:{}),
    cookie:[...cookies].map(([name,value])=>name+'='+value).join('; '),
    'x-csrftoken':cookies.get('csrftoken') || ''
  });
  const home=await readResponse(fetcher,origin+'/',{headers:headers()},signal,cookies,bootstrapFailure);
  const tokens={
    fb_dtsg:home.match(/"DTSGInitialData",\[\],\{[^{}]*"token":"([^"]+)"/)?.[1],
    lsd:home.match(/"LSD",\[\],\{[^{}]*"token":"([^"]+)"/)?.[1],
    av:home.match(/"IG_USER_EIMU":"?(\d+)/)?.[1]
  };
  if(tokens.av==='0')throw new Error('access');
  if(Object.values(tokens).some(value=>!value))throw new Error(bootstrapFailure);
  const session={cookies,headers,tokens,fetcher,jar,handle:account.handle.toLowerCase(),home,ops:new Map(),scannedBundles:new Set(),scannedHome:false,scannedProfile:false};
  if(sessionBox)Object.assign(sessionBox,{jar,handle:session.handle,current:session});
  return session;
}

async function graphqlPage(session,account,signal,stage,docId,variables) {
  if(!session.cookies.get('sessionid') || !session.cookies.get('csrftoken'))throw new Error('access');
  const body=new URLSearchParams({...session.tokens,doc_id:docId,
    variables:JSON.stringify(variables),server_timestamps:'true'});
  const raw=await readResponse(session.fetcher,origin+'/api/graphql',{method:'POST',body,
    headers:{...session.headers(),origin,referer:origin+'/'+account.handle+'/', 'x-fb-lsd':session.tokens.lsd,
      'x-ig-app-id':appId,'x-asbd-id':asbdId,'sec-fetch-dest':'empty','sec-fetch-site':'same-origin'}},signal,session.cookies,stage);
  try{return decode(raw.replace(/^for\s*\(\s*;\s*;\s*\)\s*;\s*/,''));}
  catch{throw new Error(stage);}
}

async function apiGet(session,account,signal,url,stage) {
  if(!session.cookies.get('sessionid') || !session.cookies.get('csrftoken'))throw new Error('access');
  const raw=await readResponse(session.fetcher,url,{headers:{...session.headers(),'x-ig-app-id':appId,'x-asbd-id':asbdId,
    'x-requested-with':'XMLHttpRequest',referer:origin+'/'+account.handle+'/'}},signal,session.cookies,stage);
  try{return decode(raw.replace(/^for\s*\(\s*;\s*;\s*\)\s*;\s*/,''));}
  catch{throw new Error(stage);}
}

function rowsForNode(node,account) {
  const postId=String(node?.pk || '');
  const ownerId=String(node?.user?.pk || node?.user?.id || '');
  const owner=node?.user?.username;
  if(!/^\d+$/.test(postId) || !/^\d+$/.test(ownerId) || !/^[\w-]+$/.test(node?.code || '') ||
    typeof owner!=='string' || owner.toLowerCase()!==account.handle.toLowerCase() ||
    (account.accountId && account.accountId!==ownerId))return [];
  if(node.carousel_media!==undefined && node.carousel_media!==null && !Array.isArray(node.carousel_media))return [];
  const children=node.carousel_media || [node];
  if(!children.length || children.length>20)return [];
  const taken=new Date(Number(node.taken_at)*1000);
  const base={post_id:postId,post_shortcode:node.code,user:{pk:ownerId,username:owner},
    date:Number(node.taken_at)>0 && Number.isFinite(+taken)?taken.toISOString():null,
    description:typeof node.caption?.text==='string'?node.caption.text:'',
    count:Math.max(children.length,Number(node.carousel_media_count)||0)};
  const rows=[[2,base]];
  for(const [index,child] of children.entries()){
    const mediaId=String(child?.pk || child?.id || '');
    const type=Number(child?.media_type);
    if(!/^\d+$/.test(mediaId) || ![1,2].includes(type))continue;
    const choices=type===2?child.video_versions:child.image_versions2?.candidates;
    if(!Array.isArray(choices))continue;
    const variants=choices.filter(item=>mediaURL(item?.url)).sort((a,b)=>(b.width*b.height||0)-(a.width*a.height||0));
    if(!variants.length)continue;
    const [best]=variants;
    rows.push([3,best.url,{...base,media_id:mediaId,num:index+1,extension:type===2?'mp4':'jpg',
      width:best.width,height:best.height,_fallback:variants.slice(1).map(item=>item.url)}]);
  }
  return rows;
}

function isForeignCollabNode(node,account,hasVerifiedOwnPosts) {
  const postId=String(node?.pk || '');
  const ownerId=String(node?.user?.pk || node?.user?.id || '');
  const owner=node?.user?.username;
  if(!/^\d+$/.test(postId) || !/^\d+$/.test(ownerId) || !/^[\w-]+$/.test(node?.code || '') || typeof owner!=='string')return false;
  const foreignOwner=owner.toLowerCase()!==account.handle.toLowerCase() || (Boolean(account.accountId) && account.accountId!==ownerId);
  if(!foreignOwner)return false;
  const coauthors=Array.isArray(node.coauthor_producers)?node.coauthor_producers:[];
  const listedCoauthor=coauthors.some(coauthor=>{
    const coId=String(coauthor?.pk || coauthor?.id || '');
    const coName=typeof coauthor?.username==='string'?coauthor.username.toLowerCase():'';
    return (coName && coName===account.handle.toLowerCase()) || (account.accountId && coId===String(account.accountId));
  });
  return listedCoauthor || hasVerifiedOwnPosts;
}

async function instagramWebPosts(account,jar,signal,{probe=false,fetcher=fetch,interval=6000,userAgent,onScan,sessionBox}={}) {
  const posts=new Map();
  const issues=new Set();
  let cursor,pages=0,stop='end';
  const cursors=new Set();
  const seenCollabs=new Set();
  try{
    const session=await openSession(account,jar,signal,{fetcher,userAgent,sessionBox});
    while(true){
      if(pages)await delay(interval,undefined,{signal});
      const payload=await graphqlPage(session,account,signal,queryFailure,documentId,queryVariables(account.handle,cursor));
      assertPayload(payload);
      const onlyLocationErrors=Array.isArray(payload?.errors) && payload.errors.every(error=>{
        const path=error?.path;
        return Array.isArray(path) && path.length===6 && path[0]===timelineField &&
          path[1]==='edges' && Number.isInteger(path[2]) && path[3]==='node' &&
          path[4]==='location' && path[5]==='profile_pic_url';
      });
      if(payload?.errors && !onlyLocationErrors)throw new Error(queryFailure);
      const page=payload?.data?.[timelineField];
      if(!Array.isArray(page?.edges) || typeof page.page_info?.has_next_page!=='boolean')throw new Error(queryFailure);
      pages++;
      const parsedEdges=page.edges.map(edge=>({node:edge?.node,post:normalize(account,'posts',rowsForNode(edge?.node,account))[0] || null}));
      const hasVerifiedOwnPosts=posts.size>0 || parsedEdges.some(entry=>Boolean(entry.post));
      let fresh=0,freshCollabs=0;
      for(const {node,post} of parsedEdges){
        if(!post){
          if(isForeignCollabNode(node,account,hasVerifiedOwnPosts)){
            const collabId=String(node.pk);
            if(!seenCollabs.has(collabId)){seenCollabs.add(collabId);freshCollabs++;}
            continue;
          }
          issues.add(identityFailure);
          continue;
        }
        if(!posts.has(post.id)){
          markDirect([post]);
          posts.set(post.id,post);
          fresh++;
        }
      }
      if(!fresh && !freshCollabs && (pages===1 || page.edges.length || page.page_info.has_next_page)){
        if(!posts.size && issues.has(identityFailure))throw new Error(identityFailure);
        stop='no-progress';
        throw new Error(pages===1?queryFailure:invalid);
      }
      if(!page.page_info.has_next_page)break;
      if(probe){stop='probe';break;}
      cursor=page.page_info.end_cursor;
      if(typeof cursor!=='string' || !cursor || cursors.has(cursor)){
        stop='invalid-cursor';
        throw new Error(invalid);
      }
      cursors.add(cursor);
    }
  }catch(error){
    signal.throwIfAborted();
    const issue=stopCodes.has(error.message)?error.message:invalid;
    if(stop==='end')stop=issue;
    issues.add(issue);
  }finally{
    onScan?.({pages,posts:posts.size,stop:signal.aborted?'stopped':stop});
  }
  return {posts:[...posts.values()],errors:[...issues]};
}

function reelsVariables(userId,cursor) {
  const result={
    after:cursor||'',data:{include_feed_video:true,page_size:12,target_user_id:userId},
    first:12,id:userId
  };
  for(const [provider,enabled] of Object.entries({ShortDramaEnabled:false,ReelsRecoDebugOverlayEnabled:false}))
    result[relayPrefix+provider+'relayprovider']=enabled;
  return result;
}

async function instagramWebReels(account,jar,signal,{probe=false,fetcher=fetch,interval=6000,userAgent,onScan,sessionBox,knownPosts}={}) {
  const posts=new Map();
  const issue=scopeIssue.reels;
  const issues=new Set();
  let cursor='',pages=0,stop='end',hydrated=0;
  const cursors=new Set();
  const seenReels=new Set();
  try{
    if(!/^\d+$/.test(account.accountId||''))throw new Error(issue);
    const session=await openSession(account,jar,signal,{fetcher,userAgent,sessionBox});
    while(true){
      if(pages)await delay(interval,undefined,{signal});
      const payload=await graphqlPage(session,account,signal,issue,reelsDocumentId,reelsVariables(account.accountId,cursor));
      assertPayload(payload);
      const page=graphqlConnection(payload);
      if(!page)throw new Error(issue);
      pages++;
      let fresh=0;
      for(const edge of page.edges){
        const node=edge?.node?.media?.code ? edge.node.media : edge?.node;
        const postId=String(node?.pk || String(node?.id||'').split('_')[0] || '');
        if(!/^\d+$/.test(postId)){issues.add(issue);continue;}
        if(!seenReels.has(postId)){seenReels.add(postId);fresh++;}
        const ownerId=String(node?.user?.pk || node?.user?.id || '');
        if(account.accountId && ownerId && ownerId!==String(account.accountId))continue;
        if(knownPosts?.has(postId)){
          if(!posts.has(postId))posts.set(postId,{...knownPosts.get(postId),kind:'reel'});
          if(probe && posts.size)break;
          continue;
        }
        const directReady=Boolean(node?.taken_at) && (Number(node?.media_type)!==2 || Array.isArray(node?.video_versions));
        let [post]=directReady ? normalize(account,'reels',rowsForNode({...node,pk:postId},account)) : [];
        if(!post){
          if(hydrated && interval>0)await delay(Math.min(interval,1500),undefined,{signal});
          hydrated++;
          const info=await apiGet(session,account,signal,origin+'/api/v1/media/'+postId+'/info/',issue);
          assertPayload(info);
          const full=Array.isArray(info?.items)?info.items[0]:null;
          const fullOwner=String(full?.user?.pk || full?.user?.id || '');
          if(full && account.accountId && fullOwner && fullOwner!==String(account.accountId))continue;
          if(full)[post]=normalize(account,'reels',rowsForNode(full,account));
        }
        if(!post){issues.add(issue);continue;}
        if(!posts.has(post.id)){markDirect([post]);posts.set(post.id,post);}
        if(probe && posts.size)break;
      }
      if(!page.edges.length){
        if(page.page_info.has_next_page){stop='no-progress';throw new Error(issue);}
        break;
      }
      if(!fresh){stop='no-progress';throw new Error(issue);}
      if(!page.page_info.has_next_page)break;
      if(probe){stop='probe';break;}
      cursor=page.page_info.end_cursor;
      if(typeof cursor!=='string' || !cursor || cursors.has(cursor)){
        stop='invalid-cursor';
        throw new Error(issue);
      }
      cursors.add(cursor);
    }
  }catch(error){
    signal.throwIfAborted();
    const kept=['rate-limit','network'].includes(error.message)?error.message:issue;
    if(stop==='end')stop=kept;
    issues.add(kept);
  }finally{
    onScan?.({pages,posts:posts.size,stop:signal.aborted?'stopped':stop});
  }
  if(posts.size && stop==='end')issues.delete(issue);
  return {posts:[...posts.values()],errors:[...issues]};
}

async function fetchStoriesConnection(session,account,signal,issue,op,reelIds,interval) {
  const reels=[];
  const cursors=new Set();
  let cursor=null,pages=0;
  while(true){
    if(pages && interval>0)await delay(interval,undefined,{signal});
    const variables=relayVariables({
      after:cursor,initial_reel_id:reelIds[0],reel_ids:reelIds,
      first:Math.max(3,reelIds.length),last:2
    },op.params);
    const payload=await graphqlPage(session,account,signal,issue,op.docId,variables);
    assertPayload(payload);
    if(Array.isArray(payload?.errors) && payload.errors.length)throw new Error(issue);
    const page=payload?.data?.xdt_api__v1__feed__reels_media__connection || graphqlConnection(payload);
    if(!page)throw new Error(issue);
    pages++;
    for(const edge of page.edges)if(edge?.node)reels.push(edge.node);
    if(!page.page_info.has_next_page)break;
    cursor=page.page_info.end_cursor;
    if(typeof cursor!=='string' || !cursor || cursors.has(cursor))throw new Error(issue);
    cursors.add(cursor);
  }
  return reels;
}

async function readStories(account,jar,signal,options,highlight) {
  const issue=scopeIssue[highlight?'highlight':'story'];
  const posts=[];
  const interval=options.interval ?? 6000;
  let stop='end',seen=0;
  try{
    if(!/^\d+$/.test(account.accountId||''))throw new Error(issue);
    const session=await openSession(account,jar,signal,options);
    let reels=[];
    if(!highlight){
      const op=await resolveOp(session,account,signal,storiesGalleryOp);
      reels=await fetchStoriesConnection(session,account,signal,issue,op,[account.accountId],interval);
    }else{
      const trayOp=await resolveOp(session,account,signal,highlightsTrayOp);
      const trayPayload=await graphqlPage(session,account,signal,issue,trayOp.docId,
        relayVariables({user_id:account.accountId},trayOp.params));
      assertPayload(trayPayload);
      if(Array.isArray(trayPayload?.errors) && trayPayload.errors.length)throw new Error(issue);
      const edges=trayPayload?.data?.highlights?.edges;
      if(!Array.isArray(edges))throw new Error(issue);
      const titles=new Map();
      const ids=[];
      for(const edge of edges){
        const item=edge?.node;
        const id=String(item?.id||item?.reel_id||'');
        if(!/^highlight:\d+$/.test(id))continue;
        ids.push(id);
        titles.set(id,item?.title);
      }
      if(ids.length){
        const op=await resolveOp(session,account,signal,storiesGalleryOp);
        for(let index=0;index<ids.length;index+=5){
          if(index && interval>0)await delay(Math.min(interval,2000),undefined,{signal});
          const batch=ids.slice(index,index+5);
          const page=await fetchStoriesConnection(session,account,signal,issue,op,batch,interval);
          for(const reel of page){
            const id=String(reel?.id||'');
            if(!reel?.title && titles.has(id))reel.title=titles.get(id);
            if(!reel?.user)reel.user={pk:account.accountId,username:account.handle};
            reels.push(reel);
          }
        }
      }
    }
    for(const reel of reels){
      const reelId=String(reel?.id||'').split(':').pop();
      if(!reel?.user && reelId===String(account.accountId))reel.user={pk:account.accountId,username:account.handle};
      const items=Array.isArray(reel?.items)?reel.items:[];
      seen+=items.length;
      const normalized=markDirect(normalize(account,highlight?'highlight':'story',storyRows(reel,account,highlight)));
      posts.push(...normalized);
    }
    if(seen && !posts.length)throw new Error(issue);
  }catch(error){
    signal.throwIfAborted();
    stop=['rate-limit','network'].includes(error.message)?error.message:issue;
    return {posts,errors:[stop],scan:{posts:posts.length,stop}};
  }
  return {posts,errors:[],scan:{posts:posts.length,stop}};
}

async function instagramWebScope(account,jar,signal,options={}) {
  const scope=options.scope;
  if(scope==='reels')return instagramWebReels(account,jar,signal,options);
  if(scope!=='story' && scope!=='highlight')return {posts:[],errors:[invalid]};
  const result=await readStories(account,jar,signal,options,scope==='highlight');
  options.onScan?.({...result.scan,pages:result.scan.stop==='end'||result.posts.length?1:0});
  return {posts:result.posts,errors:result.errors};
}

module.exports={instagramWebPosts,instagramWebScope};
