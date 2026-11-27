const {app,BrowserWindow,ipcMain,dialog,protocol,net,safeStorage,shell,Menu,clipboard}=require('electron');
const Store=require('electron-store');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
const {createHash,randomUUID}=require('node:crypto');
const {sites,own,target,routes,enumerate,toolIssue,publicFallback,findTikTokAlbum}=require('./sources');
const {MAX_COOKIE_FILE_BYTES,importCookieSnapshot,pastedXSnapshot,loginSnapshot,accessStatus,shouldTrySavedLogin,checkAccountAccess}=require('./login');
const {archive,scan,transfer,gap,verified,fileName,inside}=require('./archive');
const {postLink,readLinkedPost}=require('./postLink');
const {scanHistory,dateSearchUrl}=require('./xHistory');
const {instagramWebPosts,instagramWebScope}=require('./instagramWeb');

protocol.registerSchemesAsPrivileged([{scheme:'sns-media',privileges:{standard:true,secure:true,stream:true}}]);
const store=new Store({name:'sns-settings'});
const loginWindows=new Map();
const loginStates=new Map();
const loginProbes=new Map();
let mediaPaths=new Map();
let exportPaths=new Map();
let librarySequence=0;
let window, job;
const sameOrInside=(root,candidate)=>candidate===root || inside(root,candidate);
const stableKey=(kind,value)=>createHash('sha256').update(kind+':'+value).digest('hex').slice(0,32);
async function mapLimit(items,limit,fn) {
  const results=new Array(items.length);
  let next=0;
  const workers=Array.from({length:Math.min(limit,items.length)},async()=>{
    while(next<items.length){
      const current=next++;
      results[current]=await fn(items[current],current);
    }
  });
  await Promise.all(workers);
  return results;
}
const accounts=()=>store.get('accounts',[]);
const langCode=()=>{const value=store.get('lang','zh-Hant');return ['zh-Hant','en','ja'].includes(value)?value:'zh-Hant';};
const pick=table=>table[langCode()]||table['zh-Hant'];
const rootPath=()=>store.get('root',path.join(app.getPath('downloads'),'SNSDownloader'));
const libraryPath=()=>store.get('library',rootPath());
const busy=()=>{if(job) throw new Error('busy');};
const emit=()=>{
  if(window && !window.isDestroyed()) window.webContents.send('sns:change');
};
const credentialKey=platform=>'credentials.'+platform;
const accountKey=post=>[post.platform,post.accountId,post.id].join(':');
const storageCodes=new Set(['ENOSPC','EACCES','EROFS','ENODEV','EIO','ENOTDIR','ESTALE','ENOENT']);

function rollup() {return {added:0,skipped:0,versions:0,upgraded:0,failed:0,limited:0};}
function setResult(account,result) {
  store.set('accounts',accounts().map(row=>row.key===account.key ? {...row,result,accountId:result.accountId || row.accountId} : row));
  emit();
}

async function configuredRoot() {
  const requested=rootPath();
  if(!store.has('root')) await fs.mkdir(requested,{recursive:true});
  const real=await fs.realpath(requested);
  const stat=await fs.stat(real);
  await fs.access(real,require('node:fs').constants.W_OK);
  return {real,dev:stat.dev,ino:stat.ino};
}

async function ensureRoot(root) {
  const stat=await fs.stat(root.real);
  if(stat.dev!==root.dev || stat.ino!==root.ino) throw new Error('storage');
  const space=await fs.statfs(root.real);
  if(space.bavail<=0) throw new Error('storage');
}

async function withJar(content,fn) {
  if(!content) return fn(null);
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sns-auth-'));
  try {
    await fs.chmod(dir,0o700);
    const file=path.join(dir,'session.txt');
    await fs.writeFile(file,content,{mode:0o600,flag:'wx'});
    return await fn(file);
  } finally {await fs.rm(dir,{force:true,recursive:true}).catch(()=>{});}
}

async function withLazyJar(getContent,fn) {
  let dir=null;
  let file=null;
  let created=false;
  const getFile=async()=>{
    if(created)return file;
    created=true;
    const content=getContent();
    if(!content)return null;
    dir=await fs.mkdtemp(path.join(os.tmpdir(),'sns-auth-'));
    await fs.chmod(dir,0o700);
    file=path.join(dir,'session.txt');
    await fs.writeFile(file,content,{mode:0o600,flag:'wx'});
    return file;
  };
  try {
    return await fn(getFile);
  } finally {
    if(dir)await fs.rm(dir,{force:true,recursive:true}).catch(()=>{});
  }
}

function secret(platform) {
  const blob=store.get(credentialKey(platform));
  if(!blob || !safeStorage.isEncryptionAvailable()) return null;
  try {return safeStorage.decryptString(Buffer.from(blob,'base64'));} catch{return null;}
}

function saveLogin(platform,content) {
  if(!safeStorage.isEncryptionAvailable() || safeStorage.getSelectedStorageBackend?.()==='basic_text') {
    throw new Error('no-encryption');
  }
  store.set(credentialKey(platform),safeStorage.encryptString(content).toString('base64'));
}

function loginStatus(platform) {
  return loginStates.get(platform) || (store.has(credentialKey(platform))?'saved':'anonymous');
}

function setLoginStatus(platform,status) {
  loginStates.set(platform,status);
  emit();
}

async function checkSavedAccess(platform, content, signal) {
  const account=accounts().find(row=>row.platform===platform);
  if(!account)return 'no-target';
  try {
    if(platform==='TikTok'){
      const result=await require('./tiktokWeb').creatorPosts(account,signal,{probe:true});
      if(result.secUid && result.secUid!==account.secUid){
        store.set('accounts',accounts().map(row=>row.key===account.key ? {...row,secUid:result.secUid} : row));
      }
      if(result.posts.length && !result.errors.length)return 'connected';
      if(result.errors.includes('rate-limit'))return 'rate-limit';
    }
    return await withJar(content,file=>checkAccountAccess(account,
      (scope,url)=>enumerateSignedIn(account,scope,url,content,file,signal,true),
      ()=>publicFallback(account,signal,true)
    ));
  } catch(error) {
    return accessStatus(null,error);
  }
}

async function enumerateSignedIn(account,scope,url,content,file,signal,probe=false,onScan,sessionBox,knownPosts) {
  if(account.platform==='TikTok' && scope==='posts'){
    const result=await require('./tiktokWeb').webPosts(account,content,signal,{probe});
    if(result.posts.length || !result.errors.length)return result;
    if(result.errors.includes('tiktok-empty-body')){
      try{
        const other=await enumerate(account,scope,url,file,signal,probe);
        if(other.posts.length)return other;
        return {posts:[],errors:[...result.errors,...other.errors]};
      }catch(error){
        signal.throwIfAborted();
        return {posts:[],errors:[...result.errors,toolIssue(error)]};
      }
    }
  }
  if(account.platform==='IG' && scope!=='posts')return instagramWebScope(account,content,signal,{scope,probe,onScan,sessionBox,knownPosts,userAgent:app.userAgentFallback});
  if(account.platform!=='IG')return enumerate(account,scope,url,file,signal,probe);
  const web=await instagramWebPosts(account,content,signal,{probe,onScan,sessionBox,userAgent:app.userAgentFallback});
  if(web.posts.length || !web.errors.some(issue=>issue.startsWith('ig-web-')))return web;
  try{
    const fallback=await enumerate(account,scope,url,file,signal,probe);
    if(fallback.posts.length)return fallback;
    return {posts:[],errors:[...new Set([...web.errors,...fallback.errors])]};
  }catch(error){
    signal.throwIfAborted();
    return {posts:[],errors:[...new Set([...web.errors,toolIssue(error)])]};
  }
}

async function refreshSavedAccess(platform,content) {
  loginProbes.get(platform)?.abort();
  const controller=new AbortController();
  loginProbes.set(platform,controller);
  const blob=store.get(credentialKey(platform));
  setLoginStatus(platform,'checking');
  try {
    const status=await checkSavedAccess(platform,content,controller.signal);
    if(!controller.signal.aborted && loginProbes.get(platform)===controller && store.get(credentialKey(platform))===blob){
      setLoginStatus(platform,status);
    }
  } finally {
    if(loginProbes.get(platform)===controller)loginProbes.delete(platform);
  }
}

async function readCookieFile(file) {
  if(!(await fs.stat(file)).isFile())throw new Error('invalid-cookie-file');
  const handle=await fs.open(file,'r');
  try {
    const stat=await handle.stat();
    if(!stat.isFile() || stat.size>MAX_COOKIE_FILE_BYTES)throw new Error('invalid-cookie-file');
    const buffer=Buffer.alloc(stat.size);
    const {bytesRead}=await handle.read(buffer);
    if(bytesRead!==stat.size || (await handle.stat()).size!==stat.size)throw new Error('invalid-cookie-file');
    return buffer.toString('utf8');
  } finally {
    await handle.close();
  }
}

async function importInstagramLogin() {
  const platform='IG';
  if(!window || window.isDestroyed())create();
  const parent=window;
  const siteName='Instagram';
  const formats='Netscape TXT';
  const title=pick({
    'zh-Hant':`匯入 ${siteName} Cookie`,
    en:`Import ${siteName} Cookie`,
    ja:`${siteName} の Cookie を読み込む`
  });
  try {
    busy();
    const {canceled,filePaths}=await dialog.showOpenDialog(parent,{
      title,properties:['openFile'],filters:[
        {name:formats,extensions:['txt']},
        {name:pick({'zh-Hant':'所有檔案',en:'All Files',ja:'すべてのファイル'}),extensions:['*']}
      ]
    });
    if(canceled || !filePaths[0] || parent.isDestroyed())return;
    const source=await readCookieFile(filePaths[0]).catch(()=>{throw new Error('invalid-cookie-file');});
    if(parent.isDestroyed())return;
    const content=importCookieSnapshot(source,platform);
    busy();
    saveLogin(platform,content);
    loginWindows.get(platform)?.close();
    await refreshSavedAccess(platform,content);
  } catch(error) {
    if(parent.isDestroyed())return;
    const messages={
      'busy':pick({
        'zh-Hant':'請等待目前的備份完成後，再匯入登入資料。',
        en:'Wait for the current backup to finish before importing login data.',
        ja:'バックアップの終了後にもう一度お試しください。'
      }),
      'no-encryption':pick({
        'zh-Hant':'系統加密暫時不可用。',
        en:'System encryption is currently unavailable.',
        ja:'システムの暗号化を利用できません。'
      }),
      'missing-session':pick({
        'zh-Hant':`檔案缺少有效的 ${siteName} 登入資料。請在瀏覽器重新登入，再匯出檔案。`,
        en:`The file does not contain valid ${siteName} login data. Sign in again in your browser and export the file.`,
        ja:`${siteName} にログインし直し、有効な Cookie ファイルを選んでください。`
      }),
      'invalid-cookie-file':pick({
        'zh-Hant':`請選擇可讀取、1 MB 或以下的 ${formats} 檔案。`,
        en:`Choose a readable ${formats} file that is 1 MB or smaller.`,
        ja:`読み取れる 1 MB 以下の ${formats} ファイルを選んでください。`
      })
    };
    const message=(Object.hasOwn(messages,error.message) && messages[error.message]) ||
      pick({
        'zh-Hant':'未能儲存登入資料。',
        en:'Could not save login data.',
        ja:'ログイン情報を保存できませんでした。'
      });
    await dialog.showMessageBox(parent,{type:'warning',title,message});
  }
}

function setupMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform==='darwin'?[{role:'appMenu'}]:[]),
    {label:pick({'zh-Hant':'檔案',en:'File',ja:'ファイル'}),submenu:[
      {label:pick({'zh-Hant':'匯入登入資料',en:'Import Login',ja:'ログイン情報を読み込む'}),submenu:[
        {label:'Instagram Cookie…',click:importInstagramLogin}
      ]},
      {label:pick({'zh-Hant':'備份已複製的貼文連結…',en:'Back Up Copied Post Link…',ja:'コピーした投稿リンクをバックアップ…'}),click:backupCopiedPost},
      {type:'separator'},
      {role:process.platform==='darwin'?'close':'quit'}
    ]},
    {role:'editMenu'},{role:'viewMenu'},{role:'windowMenu'}
  ]));
}

async function openLogin(platform) {
  if(!Object.hasOwn(sites,platform)) throw new Error('invalid-account');
  if(platform==='X')throw new Error('manual-login');
  const current=loginWindows.get(platform);
  if(current && !current.isDestroyed()){current.focus();return;}
  const site=sites[platform];
  const login=new BrowserWindow({width:940,height:760,parent:window,
    title:pick({'zh-Hant':platform+' 登入',en:platform+' Sign In',ja:platform+' ログイン'}),
    webPreferences:{partition:'sns-login-'+randomUUID(),nodeIntegration:false,contextIsolation:true,sandbox:true}});
  loginWindows.set(platform,login);
  const web=login.webContents;
  const browserSession=web.session;
  const allowed=url=>{
    try {const parsed=new URL(url);return parsed.protocol==='https:' && own(parsed.hostname,site.host);}
    catch {return false;}
  };
  web.on('will-navigate',(event,url)=>{if(!allowed(typeof url==='string'?url:event.url))event.preventDefault();});
  web.on('will-redirect',(event,url)=>{if(!allowed(typeof url==='string'?url:event.url))event.preventDefault();});
  web.setWindowOpenHandler(()=>({action:'deny'}));
  browserSession.setPermissionRequestHandler((_web,_permission,callback)=>callback(false));
  browserSession.setPermissionCheckHandler(()=>false);
  browserSession.on('will-download',event=>event.preventDefault());
  const controller=new AbortController();
  const set=status=>setLoginStatus(platform,status);
  let checking=false, lastSnapshot=null, completed=false, pending=false, timer;
  async function check() {
    if(completed || login.isDestroyed())return;
    if(checking){pending=true;return;}
    checking=true;
    try {
      const cookies=await browserSession.cookies.get({domain:site.host});
      const snapshot=loginSnapshot(cookies,platform);
      if(!snapshot || controller.signal.aborted)return;
      if(snapshot===lastSnapshot){
        if(['connected','no-target'].includes(loginStatus(platform)) && !pending && !timer){
          completed=true;
          login.close();
        }
        return;
      }
      saveLogin(platform,snapshot);
      lastSnapshot=snapshot;
      set('checking');
      const status=await checkSavedAccess(platform,snapshot,controller.signal);
      if(controller.signal.aborted)return;
      set(status);
      if(['connected','no-target'].includes(status) && !pending && !timer){
        completed=true;
        login.close();
      }
    }catch(error){
      if(!controller.signal.aborted)set(error.message==='no-encryption'?'no-encryption':lastSnapshot?'unverified':'capture-failed');
    }finally{
      checking=false;
      if(pending){pending=false;queueCheck();}
    }
  }
  const queueCheck=()=>{
    clearTimeout(timer);
    timer=setTimeout(()=>{timer=null;check();},1800);
  };
  const onCookieChanged=(_event,cookie)=>{
    if(own(cookie.domain.replace(/^\./,''),site.host))queueCheck();
  };
  browserSession.cookies.on('changed',onCookieChanged);
  web.on('did-finish-load',queueCheck);
  login.on('closed',()=>{
    clearTimeout(timer);
    controller.abort();
    browserSession.cookies.removeListener('changed',onCookieChanged);
    loginWindows.delete(platform);
    if(loginStatus(platform)==='waiting')set('not-captured');
    else if(loginStatus(platform)==='checking')set('saved');
  });
  set('waiting');
  login.loadURL(site.login).catch(error=>{
    if(!controller.signal.aborted && error.code!=='ERR_ABORTED' && !lastSnapshot)set('page-failed');
  });
}

function merge(posts,post) {
  const key=accountKey(post);
  const old=posts.get(key);
  if(!old){posts.set(key,post);return;}
  if(post.kind==='reel')old.kind='reel';
  old.expected=Math.max(old.expected,post.expected);
  old.memberships.push(...post.memberships);
  for(const item of post.media) {
    const current=old.media.find(m=>m.id===item.id);
    if(!current)old.media.push(item);
    else if(item.altState==='present')Object.assign(current,{alt:item.alt,altState:item.altState});
  }
}

function backupFolder(root,index,post) {
  const sameAccount=[...index.values()].find(p=>p.platform===post.platform && p.accountId===post.accountId);
  if(sameAccount)return path.relative(root.real,sameAccount.folder).split(path.sep)[1];
  const conflict=[...index.values()].some(p=>p.platform===post.platform &&
    path.relative(root.real,p.folder).split(path.sep)[1]?.toLowerCase()===post.account.toLowerCase());
  return conflict?post.account+'__'+post.accountId:post.account;
}

async function backupCopiedPost() {
  if(!window || window.isDestroyed())create();
  try {await backupPost(clipboard.readText());}
  catch(error){
    const message=error.message==='busy'
      ? pick({
        'zh-Hant':'請等待目前的備份完成後，再試一次。',
        en:'Wait for the current backup to finish, then try again.',
        ja:'現在のバックアップが終わってからお試しください。'
      })
      : pick({
        'zh-Hant':'請先複製一個 X、Instagram 或 TikTok 的貼文連結。',
        en:'Copy an X, Instagram, or TikTok post link first.',
        ja:'X、Instagram、TikTok の投稿リンクをコピーしてください。'
      });
    if(!window.isDestroyed())await dialog.showMessageBox(window,{type:'warning',
      title:pick({'zh-Hant':'備份貼文連結',en:'Back Up Post Link',ja:'投稿リンクのバックアップ'}),message});
  }
}

async function backupPost(value) {
  busy();
  let link;
  try {
    if(typeof value!=='string' || value.length>2048)throw new Error('invalid-post-link');
    link=postLink(value);
  } catch {throw new Error('invalid-post-link');}
  const parent=window;
  const title=pick({'zh-Hant':'備份貼文連結',en:'Back Up Post Link',ja:'投稿リンクのバックアップ'});
  const showResult=(type,message)=>parent.isDestroyed()?undefined:dialog.showMessageBox(parent,{type,title,message});
  const run={phase:'preparing',paused:false,controller:new AbortController(),active:null,single:true};
  const signal=run.controller.signal;
  job=run;emit();
  let notification;
  try {
    const root=await configuredRoot();
    await ensureRoot(root);
    const index=new Map((await scan(root.real)).map(post=>[accountKey(post),post]));
    await waitUntilRunning(run);
    run.phase='reading';emit();
    let post;
    let login;
    try {
      if(link.platform==='TikTok'){
        const savedAccount=accounts().find(row=>row.key===link.account.key);
        const result=await require('./tiktokWeb').creatorPosts(savedAccount || link.account,signal,{id:link.id});
        if(savedAccount && result.secUid && result.secUid!==savedAccount.secUid){
          store.set('accounts',accounts().map(row=>row.key===savedAccount.key ? {...row,secUid:result.secUid} : row));
        }
        post=result.posts.find(p=>p.id===link.id && p.media.length && (!link.url.includes('/photo/') || p.url.includes('/photo/')));
        if(!post && result.errors.includes('rate-limit'))throw Object.assign(Error('rate-limit'),{code:'rate-limit'});
      }
      if(!post)post=await readLinkedPost(link,signal,null);
    }
    catch(error) {
      signal.throwIfAborted();
      login=link.platform==='IG'?null:secret(link.platform);
      if(['network','rate-limit'].includes(toolIssue(error)))throw error;
      if(link.platform==='TikTok'){
        const web=await require('./tiktokWeb').webPosts(link.account,login,signal,{id:link.id});
        post=web.posts.find(item=>item.id===link.id && item.media.length && (!link.url.includes('/photo/') || item.url.includes('/photo/')));
      }
      if(!post){
        if(!login || toolIssue(error)==='missing-tool')throw error;
        post=await withJar(login,file=>readLinkedPost(link,signal,file));
      }
    }
    await waitUntilRunning(run);
    await ensureRoot(root);
    run.phase='saving';emit();
    const result=await withLazyJar(()=>login,getCookieFile=>archive(post,{
      root:root.real,previous:index.get(accountKey(post)),accountFolder:backupFolder(root,index,post),signal,
      transfer:async(media,file)=>transfer(media,file,signal,media.videoUseTool && media.postUrl ? await getCookieFile() : null)
    }));
    const downloaded=(await Promise.all(result.record.media.map(media=>verified(result.record.folder,media)))).filter(Boolean).length;
    const partial=result.counts.failed || result.counts.limited;
    notification=[
      partial?'warning':'info',
      pick({
        'zh-Hant':'已保存 '+downloaded+' 個媒體檔案，跳過 '+result.counts.skipped+' 個。'+(partial?'部分檔案或資料未能取得或核對。':''),
        en:'Saved '+downloaded+' media file'+(downloaded===1?'':'s')+', skipped '+result.counts.skipped+'.'+(partial?' Some files or details could not be retrieved or verified.':''),
        ja:'保存済みのファイル '+downloaded+' 件、スキップ '+result.counts.skipped+' 件。'+(partial?'一部に未取得または未確認の項目があります。':'')
      })
    ];
  }catch(error) {
    if(!signal.aborted){
      const issue=storageCodes.has(error.code)||error.message==='storage'?'storage':toolIssue(error);
      const reason={
        access:pick({
          'zh-Hant':'平台要求登入，請核對平台登入狀態。',
          en:'Sign-in is required. Check your login status for this platform.',
          ja:'ログイン情報を確認してください。'
        }),
        'rate-limit':pick({
          'zh-Hant':'平台暫時限制讀取，請稍後再試。',
          en:'The platform temporarily limited requests. Try again later.',
          ja:'時間をおいて再試行してください。'
        }),
        network:pick({
          'zh-Hant':'請檢查網絡連線。',
          en:'Check your network connection.',
          ja:'接続を確認してください。'
        }),
        'missing-tool':pick({
          'zh-Hant':'請檢查下載工具。',
          en:'Check your download tools.',
          ja:'ダウンロードツールを確認してください。'
        }),
        storage:pick({
          'zh-Hant':'請檢查儲存位置。',
          en:'Check your storage location.',
          ja:'保存先を確認してください。'
        })
      }[issue] || pick({
        'zh-Hant':'公開頁面未能提供此篇貼文的資料。',
        en:'The public page did not provide data for this post.',
        ja:'公開ページから取得できませんでした。'
      });
      notification=['warning',pick({
        'zh-Hant':'未能備份此篇貼文。',
        en:'Could not back up this post. ',
        ja:'バックアップできませんでした。'
      })+reason];
    }
  }finally{
    job=null;emit();
  }
  if(notification)return showResult(...notification);
}

function issueSource(post) {
  try {
    const link=postLink(post.url);
    if(link.platform===post.platform)return link.url;
  }catch {}
  // A Story can have a source even though the single-post downloader only accepts posts and Reels.
  if(post.platform==='IG' && /^https:\/\/www\.instagram\.com\/stories\/[\w.]+\/\d+\/$/.test(post.url))return post.url;
  return null;
}

async function updateAccount(account,run,root,index) {
  const signal=run.controller.signal;
  const hasDateRange=Boolean(account.since || account.until);
  const since=account.since ? Date.parse(account.since+'T00:00:00+08:00') : -Infinity;
  const end=account.until ? Date.parse(account.until+'T00:00:00+08:00')+86400000 : Infinity;
  function inDateRange(date) {
    if(!hasDateRange)return true;
    const time=Date.parse(date);
    return time>=since && time<end;
  }
  const saved=[...index.values()].filter(p=>p.platform===account.platform &&
    (account.accountId ? p.accountId===account.accountId : p.account.toLowerCase()===account.handle.toLowerCase()));
  const gaps=new Map();
  if(run.retry) {
    for(const post of saved) {
      if(!inDateRange(post.date))continue;
      const ids=new Set();
      for(const item of post.media) if(gap(item) || !(await verified(post.folder,item)))ids.add(item.id);
      if(ids.size || post.missing || post.contentMissing)gaps.set(accountKey(post),ids);
    }
  }
  const counts=rollup();
  let savedContent=false;
  const reasons=new Set();
  const posts=new Map();
  const postIssues=new Map();
  let activePost;
  function noteIssue(post,failed=0,limited=0) {
    if(!failed && !limited)return;
    const key=accountKey(post);
    const prior=postIssues.get(key);
    postIssues.set(key,{url:issueSource(post) || prior?.url || null,
      failed:(prior?.failed || 0)+failed,limited:(prior?.limited || 0)+limited});
  }
  let observedAccountId=account.accountId;
  const previous=account.result||{};
  const status={attempt:new Date().toISOString(),success:previous.success,phase:'running',counts,reasons:[],postIssues:[]};
  setResult(account,status);
  const retryScope=previous.reasons?.length || gaps.size;
  const readListings=!run.retry || retryScope;
  const xDateRange=account.platform==='X' && account.until;
  const rangeLogin=readListings && xDateRange ? secret('X') : null;
  async function saveBatch(batch,history=false){
    const batchIssues=new Set();
    const fullRetry=run.retry && Boolean(previous.reasons?.length);
    return withLazyJar(()=>secret(account.platform),async getCookieFile=>{
      for(const [key,post] of batch){
        await waitUntilRunning(run);
        if(observedAccountId && observedAccountId!==post.accountId){batchIssues.add('identity');reasons.add('identity');noteIssue(post,0,1);continue;}
        observedAccountId=post.accountId;
        if(hasDateRange && !post.date){reasons.add('unknown-date');noteIssue(post,0,1);continue;}
        if(!inDateRange(post.date))continue;
        if(!history && run.retry && !fullRetry && !gaps.has(key))continue;
        activePost=post;
        await ensureRoot(root);
        run.phase='saving';emit();
        const prior=index.get(key);
        const ids=gaps.get(key);
        const recoverMissing=run.retry && prior && (prior.missing || prior.contentMissing);
        const priorAlbum=post.fromPublicPlaylist && prior?.url?.includes('/photo/');
        const suspectAlbum=post.fromPublicPlaylist && prior?.media.some(media=>media.type==='video' && !media.file && media.error);
        const album=priorAlbum || suspectAlbum ? await findTikTokAlbum(post,signal) : null;
        if(priorAlbum && !album){
          reasons.add('unavailable');
          noteIssue(prior,0,1);
          gaps.delete(key);
          activePost=null;
          continue;
        }
        const snapshot=album || (run.retry && prior && !recoverMissing && (!history || ids) ?
          {...post,media:post.media.filter(m=>ids?.has(m.id)),expected:0}:post);
        const missingRetryMedia=!album && run.retry && prior && ids?.size && [...ids].some(id=>!snapshot.media.some(m=>m.id===id));
        if(missingRetryMedia)reasons.add('unavailable');
        let result=await archive(snapshot,{
          root:root.real, previous:prior, accountFolder:backupFolder(root,index,post), retry:run.retry && !recoverMissing, signal,
          transfer:async(media,file)=>transfer(media,file,signal,!album && media.videoUseTool && media.postUrl ? await getCookieFile() : null)
        });
        if(post.fromPublicPlaylist && !album && !suspectAlbum && result.counts.failed){
          const detected=await findTikTokAlbum(post,signal);
          if(detected){
            const initial=result;
            result=await archive(detected,{
              root:root.real,previous:initial.record,signal,
              transfer:(media,file)=>transfer(media,file,signal,null)
            });
            result.counts.added=initial.counts.added;
          }
        }
        if(result.counts.failed)batchIssues.add('unavailable');
        index.set(key,result.record);
        savedContent ||= Boolean(result.record.text || result.record.media.some(media=>media.file));
        for(const field of Object.keys(counts))counts[field]+=result.counts[field];
        noteIssue(result.record,result.counts.failed,result.counts.limited+Number(Boolean(missingRetryMedia)));
        if(run.retry)gaps.delete(key);
        activePost=null;
        setResult(account,{...status,counts:{...counts}});
      }
      return batchIssues;
    });
  }

  let matchedRange=false;
  async function backfill(){
    const login=secret('X');
    if(!login || reasons.has('network') || reasons.has('missing-tool')){
      status.xHistory={state:login?'pending':'login'};
      reasons.add('x-date-unverified');
      if(!login)reasons.add('access');
      return;
    }
    const historyKey=()=> 'xHistoryHK.'+createHash('sha256')
      .update(JSON.stringify([root.real,root.dev,root.ino,account.key,observedAccountId])).digest('hex');
    let ranges=!rangeLogin && observedAccountId?store.get(historyKey(),[]):[];
    // Revisit days with known archive gaps when the user requests repair.
    if(run.retry && gaps.size){
      for(const key of gaps.keys()){
        const day=Math.floor((Date.parse(index.get(key)?.date)+28800000)/86400000);
        if(Number.isFinite(day))ranges=ranges.flatMap(([a,b])=>day<a || day>=b?[[a,b]]:
          [[a,day],[day+1,b]].filter(([left,right])=>left<right));
      }
    }
    const seen=new Set(posts.keys());
    let createdDay;
    function observeCreation(post){
      const time=Date.parse(post.accountCreated);
      if(post.accountId===observedAccountId && time<=Date.parse(post.date))createdDay=Math.floor((time+28800000)/86400000);
    }
    for(const post of posts.values())observeCreation(post);
    const wait=ms=>require('node:timers/promises').setTimeout(ms,undefined,{signal});
    if(reasons.delete('rate-limit')){
      status.xHistory={state:'cooldown'};setResult(account,status);
      await wait(15*60*1000);
    }
    const issues=await withJar(login,file=>scanHistory({ranges,wait,
      floor:account.since?Date.parse(account.since)/86400000:undefined,
      until:rangeLogin?Date.parse(account.until)/86400000+1:undefined,
      accountFloor:()=>!rangeLogin && createdDay!==undefined?createdDay:-Infinity,
      report:progress=>{status.xHistory=progress;setResult(account,status);},
      search:async(from,until)=>{
        await waitUntilRunning(run);
        await ensureRoot(root);
        run.phase='reading';emit();
        try{return await enumerate(account,'posts',dateSearchUrl(account.handle,from,until),file,signal);}
        catch(error){signal.throwIfAborted();return {posts:[],errors:[toolIssue(error)]};}
      },
      save:async listed=>{
        const batch=new Map();
        for(const post of listed){
          const key=accountKey(post);
          if(!seen.has(key))merge(batch,post);
        }
        const issues=await saveBatch(batch,!rangeLogin);
        for(const post of listed){observeCreation(post);if(post.accountId===observedAccountId)matchedRange=true;}
        for(const key of batch.keys())seen.add(key);
        return issues;
      },
      commit:async next=>{
        signal.throwIfAborted();
        if(!rangeLogin && observedAccountId)store.set(historyKey(),next);
      }
    }));
    for(const issue of issues)reasons.add(issue);
    if(issues.length)reasons.add('x-date-unverified');
  }
  try {
    if(rangeLogin) {
      await backfill();
    }else if(readListings)for(const [scope,url] of routes(account)){
      await waitUntilRunning(run);
      run.phase='reading';emit();
      try {
        const loggedIn=secret(account.platform);
        const sessionBox=run.igSession || (run.igSession={});
        let result;
        if(account.platform==='IG' && scope!=='posts' && loggedIn){
          try {
            const knownPosts=scope==='reels' ? new Map([...posts.values()].map(post=>[post.id,post])) : undefined;
            result=await withJar(loggedIn,file=>enumerateSignedIn(account,scope,url,loggedIn,file,signal,false,scan=>{
              status.igScopes={...status.igScopes,[scope]:scan};
            },sessionBox,knownPosts));
          }catch(error) {
            if(signal.aborted)throw error;
            const issue=toolIssue(error);
            result={posts:[],errors:[['rate-limit','network','missing-tool'].includes(issue)?issue:
              {reels:'reels-unverified',story:'stories-unverified',highlight:'highlights-unverified'}[scope]]};
          }
        }else{
        const creator=account.platform==='TikTok'?await require('./tiktokWeb').creatorPosts(account,signal):null;
        if(creator?.secUid && creator.secUid!==account.secUid){
          account.secUid=creator.secUid;
          store.set('accounts',accounts().map(row=>row.key===account.key ? {...row,secUid:creator.secUid} : row));
        }
        result=creator && (creator.posts.length || creator.errors.includes('rate-limit'))?creator:await enumerate(account,scope,url,null,signal).catch(error=>{
          signal.throwIfAborted();
          return {posts:[],errors:[toolIssue(error)]};
        });
        if(loggedIn && shouldTrySavedLogin(result)) {
          try {
            const authenticated=await withJar(loggedIn,file=>enumerateSignedIn(account,scope,url,loggedIn,file,signal,false,scan=>{status.igScan=scan;},sessionBox));
            if(!authenticated.errors.length || !result.posts.length) result=authenticated;
            else {
              const combined=new Map(result.posts.map(post=>[accountKey(post),post]));
              for(const post of authenticated.posts)merge(combined,post);
              result={posts:[...combined.values()],errors:[...new Set([...result.errors,...authenticated.errors])]};
            }
          }catch(error) {
            if(signal.aborted)throw error;
            result.errors.push(toolIssue(error));
          }
        }
        }
        for(const post of result.posts)merge(posts,post);
        if(!account.accountId){
          const found=result.posts.find(post=>/^\d+$/.test(post.accountId||''));
          if(found)account.accountId=found.accountId;
        }
        if(scope==='posts' && ['X','TikTok'].includes(account.platform) &&
          (!result.posts.length || result.errors.includes('access')) &&
          !result.errors.some(issue=>['rate-limit','network','missing-tool'].includes(issue))) {
          try {
            const fallback=await publicFallback(account,signal);
            if(fallback.posts.length) {
              for(const post of fallback.posts)merge(posts,post);
              if(account.platform==='X')reasons.add('replies-unverified');
            }
            result={posts:[...result.posts,...fallback.posts],errors:[...result.errors,...fallback.errors]};
          }catch(error) {
            if(signal.aborted)throw error;
            reasons.add(toolIssue(error));
          }
        }
        for(const issue of result.errors)reasons.add(issue);
        if(!result.posts.length && !result.errors.length && scope==='posts')reasons.add('unverified-empty');
        if(account.platform==='IG' && reasons.has('rate-limit'))break;
      }catch(error){
        if(signal.aborted)throw error;
        reasons.add(toolIssue(error));
      }
    }
    if(xDateRange && readListings) {
      const listed=[...posts.values()].filter(post=>post.date && (!observedAccountId || observedAccountId===post.accountId));
      const found=listed.some(post=>inDateRange(post.date));
      if(rangeLogin) {
        if(!matchedRange || reasons.size)reasons.add('x-date-unverified');
      }else if(!found || !listed.some(post=>Date.parse(post.date)<=since)) {
        if(!reasons.has('rate-limit'))reasons.add('access');
        reasons.add('x-date-unverified');
      }
    }
    await saveBatch(posts);
    if(account.platform==='X' && !account.until && readListings){
      const listed=[...posts.values()].filter(post=>post.date && (!observedAccountId || observedAccountId===post.accountId));
      const reachedBeforeSince=Boolean(account.since) && !reasons.size && listed.some(post=>Date.parse(post.date)<since);
      const reachedSinceDay=Boolean(account.since) && !reasons.size && listed.some(post=>Date.parse(post.date)<since+86400000);
      if(!account.since || (secret('X') ? !reachedBeforeSince : !reachedSinceDay))await backfill();
    }
    if(run.retry && gaps.size){
      reasons.add('unavailable');
      for(const key of gaps.keys())noteIssue(index.get(key),0,1);
    }
  }catch(error) {
    if(signal.aborted) {
      if(['searching','cooldown'].includes(status.xHistory?.state))status.xHistory.state='pending';
      setResult(account,{...status,phase:'stopped',counts,reasons:[...reasons],postIssues:[...postIssues.values()]});
      throw error;
    }
    if(activePost)noteIssue(activePost,1,0);
    if(storageCodes.has(error.code) || error.message==='storage') {
      reasons.add('storage');
      setResult(account,{...status,phase:savedContent?'partial':'failed',counts,reasons:[...reasons],postIssues:[...postIssues.values()]});
      throw new Error('storage');
    }
    reasons.add(toolIssue(error));
  }
  counts.limited+=reasons.size;
  const complete=!counts.failed && !counts.limited;
  setResult(account,{...status,reasons:[...reasons],postIssues:[...postIssues.values()],accountId:observedAccountId,
    phase:complete?'complete':savedContent?'partial':'failed',success:complete?new Date().toISOString():status.success});
}

async function waitUntilRunning(run) {
  while(run.paused && !run.controller.signal.aborted) {
    run.phase='paused';emit();
    await new Promise(resolve=>setTimeout(resolve,350));
  }
  run.controller.signal.throwIfAborted();
}

function start(key,retry) {
  busy();
  const selected=accounts().filter(a=>key==null || a.key===key);
  if(!selected.length || (retry && key==null))return false;
  const run={phase:'preparing',paused:false,controller:new AbortController(),active:null,retry};
  job=run;emit();
  (async()=>{
    try{
      const root=await configuredRoot();
      await ensureRoot(root);
      const index=new Map((await scan(root.real)).map(post=>[accountKey(post),post]));
      for(const account of selected){
        await waitUntilRunning(run);
        run.active=account.key;
        await updateAccount(account,run,root,index);
      }
    }catch(error){
      if(!run.controller.signal.aborted && !run.active) {
        for(const account of selected)setResult(account,{
          attempt:new Date().toISOString(),success:account.result?.success,
          phase:'partial',counts:rollup(),reasons:[storageCodes.has(error.code)||error.message==='storage'?'storage':toolIssue(error)]
        });
      }
    }finally{job=null;emit();}
  })();
  return true;
}

function register(name,handler){
  ipcMain.handle('sns:'+name,(event,...args)=>{
    if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Forbidden');
    return handler(...args);
  });
}

async function listArchive() {
  const seq=++librarySequence;
  const paths=new Map(), exports=new Map();
  let records;
  try {records=await scan(libraryPath());}
  catch(error){
    if(error.code==='ENOENT' && !store.has('root') && !store.has('library'))return {records:[],root:libraryPath()};
    return {records:[],root:libraryPath(),unavailable:true};
  }
  const checked=new Map();
  async function present(folder,items){
    const result=[];
    for(const item of items){
      const candidate=fileName(item.file)&&path.join(folder,item.file);
      let available=false;
      if(candidate){
        if(checked.has(candidate))available=checked.get(candidate);
        else {
          available=await fs.lstat(candidate).then(stat=>stat.isFile(),()=>false);
          checked.set(candidate,available);
        }
      }
      if(!available){result.push({...item,available:false});continue;}
      const key=stableKey('media',candidate);
      paths.set(key,candidate);
      result.push({...item,available:true,href:'sns-media://archive/'+key});
    }
    return result;
  }
  const views=await mapLimit(records,32,async p=>{
    const exportId=stableKey('export',p.folder);
    exports.set(exportId,p.folder);
    const media=await present(p.folder,p.media);
    const versions=[];
    for(const v of p.versions)versions.push({...v,media:await present(p.folder,v.media)});
    return {...p,exportId,media,versions};
  });
  if(seq===librarySequence){mediaPaths=paths;exportPaths=exports;}
  return {root:libraryPath(),records:views};
}

async function chooseFolder(kind) {
  busy();
  const {canceled,filePaths}=await dialog.showOpenDialog(window,{properties:['openDirectory','createDirectory']});
  if(!canceled){busy();store.set(kind,await fs.realpath(filePaths[0]));emit();}
}

function setup(){
  register('state',()=>({accounts:accounts(),root:rootPath(),library:libraryPath(),lang:langCode(),
    job:job&&{phase:job.phase,active:job.active,single:job.single,paused:job.paused,stopping:job.controller.signal.aborted},
    login:Object.fromEntries(Object.keys(sites).map(p=>[p,loginStatus(p)]))}));
  register('save-account',(platform,input,since,key,until)=>{
    busy();
    const next=target(platform,input);
    for(const date of [since,until]){
      if(date==null || date==='')continue;
      if(typeof date!=='string' || !/^\d{4}-\d\d-\d\d$/.test(date) || !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0,10)!==date)throw new Error('invalid-date');
    }
    if(until && !since)throw new Error('invalid-date');
    if(until && until<since)throw new Error('invalid-date-order');
    const rows=accounts();
    if(key && key!==next.key)throw new Error('invalid-account');
    const found=rows.findIndex(row=>row.key===next.key);
    const range={since:since||null,until:until||null};
    if(found>=0) rows[found]={...rows[found],...range};
    else rows.push({...next,...range});
    store.set('accounts',rows);emit();
  });
  register('remove-account',key=>{busy();store.set('accounts',accounts().filter(a=>a.key!==key));emit();});
  register('start',start);
  register('backup-post',backupPost);
  register('control',action=>{
    if(!job)return;
    if(action==='stop')job.controller.abort();
    else if(action==='pause')job.paused=true;
    else if(action==='resume')job.paused=false;
    emit();
  });
  register('folder',kind=>{if(['root','library'].includes(kind))return chooseFolder(kind);});
  register('library',listArchive);
  register('copy-text',value=>{if(typeof value==='string' && value.length<1000000)require('electron').clipboard.writeText(value);});
  register('login',openLogin);
  register('paste-x-login',(authToken,csrfToken)=>{
    busy();
    const content=pastedXSnapshot(authToken,csrfToken);
    saveLogin('X',content);
    void refreshSavedAccess('X',content);
  });
  register('clear-login',platform=>{
    busy();
    if(!Object.hasOwn(sites,platform))return;
    loginProbes.get(platform)?.abort();
    loginProbes.delete(platform);
    loginWindows.get(platform)?.close();
    store.delete(credentialKey(platform));loginStates.delete(platform);emit();
  });
  register('check-login',async platform=>{
    if(!Object.hasOwn(sites,platform) || loginStatus(platform)==='checking')return;
    const blob=store.get(credentialKey(platform));
    const content=secret(platform);
    if(!content){setLoginStatus(platform,blob?'capture-failed':'not-captured');return;}
    await refreshSavedAccess(platform,content);
  });
  register('language',lang=>{if(['zh-Hant','en','ja'].includes(lang)){store.set('lang',lang);setupMenu();}});
  register('source',value=>{
    const url=new URL(value);
    if(url.protocol==='https:'&&!url.port&&!url.username&&!url.password&&Object.values(sites).some(site=>own(url.hostname,site.host)))return shell.openExternal(url.href);
  });
  register('reveal',async folder=>{
    if(typeof folder!=='string' || !folder)throw new Error('invalid-path');
    const root=await fs.realpath(libraryPath());
    const real=await fs.realpath(folder);
    if(!inside(root,real))throw new Error('invalid-path');
    const issue=await shell.openPath(real);
    if(issue)throw new Error('storage');
  });
  register('copy',async (id,whole)=>{
    const source=whole?exportPaths.get(id):mediaPaths.get(id);
    if(!source)return;
    const root=await fs.realpath(libraryPath());
    if(await fs.realpath(source)!==source || !inside(root,source))throw new Error('invalid-path');
    const directory=whole?source:path.dirname(source);
    if(whole){
      const chosen=await dialog.showOpenDialog(window,{properties:['openDirectory','createDirectory']});
      if(chosen.canceled)return;
      const parent=await fs.realpath(chosen.filePaths[0]);
      const library=await fs.realpath(libraryPath());
      if(sameOrInside(library,parent))throw new Error('invalid-path');
      const dest=await fs.mkdtemp(path.join(parent,path.basename(directory)+'-'));
      try{
        for(const entry of await fs.readdir(directory,{withFileTypes:true})){
          if(entry.isFile() && (fileName(entry.name)||['index.md','metadata.json'].includes(entry.name)))await fs.copyFile(path.join(directory,entry.name),path.join(dest,entry.name));
        }
      }catch(error){await fs.rm(dest,{force:true,recursive:true}).catch(()=>{});throw error;}
    }else{
      const chosen=await dialog.showSaveDialog(window,{defaultPath:path.basename(source)});
      if(chosen.canceled)return;
      const library=await fs.realpath(libraryPath());
      const parent=await fs.realpath(path.dirname(chosen.filePath));
      if(sameOrInside(library,parent))throw new Error('invalid-path');
      const targetFile=path.join(parent,path.basename(chosen.filePath));
      try{
        if(sameOrInside(library,await fs.realpath(targetFile)))throw new Error('invalid-path');
      }catch(error){
        if(error.code!=='ENOENT')throw error;
      }
      const temp=path.join(parent,'.sns-save-'+randomUUID());
      try{
        await fs.copyFile(source,temp,require('node:fs').constants.COPYFILE_EXCL);
        await fs.rename(temp,targetFile);
      }finally{
        await fs.rm(temp,{force:true}).catch(()=>{});
      }
    }
  });
}

function create(){
  window=new BrowserWindow({width:1240,height:920,minWidth:820,minHeight:620,title:'SNS Downloader',
    titleBarStyle:'hiddenInset',backgroundColor:'#1E1E2E',
    webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.loadFile(path.join(__dirname,'../../renderer/sns/index.html'));
}

app.whenReady().then(()=>{
  setup();
  setupMenu();
  protocol.handle('sns-media',async request=>{
    const url=new URL(request.url);
    const file=mediaPaths.get(url.pathname.slice(1));
    if(url.hostname!=='archive' || !file)return new Response(null,{status:404});
    try{
      const actual=await fs.realpath(file), root=await fs.realpath(libraryPath());
      if(actual!==file || !inside(root,actual))return new Response(null,{status:404});
      const headers=new Headers();
      const range=request.headers.get('range');
      if(range)headers.set('range',range);
      return await net.fetch(pathToFileURL(actual).href,{headers});
    }catch{return new Response(null,{status:404});}
  });
  create();
  app.on('activate',()=>{if(!window || window.isDestroyed())create();});
});
app.on('before-quit',()=>{
  job?.controller.abort();
  for(const controller of loginProbes.values())controller.abort();
  loginProbes.clear();
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
