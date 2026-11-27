const fs = require('node:fs/promises');
const {createReadStream} = require('node:fs');
const path = require('node:path');
const {randomUUID,createHash} = require('node:crypto');
const {target, command, toolIssue} = require('./sources');
const {downloadMedia}=require('./mediaDownload');

const extensions = new Set(['jpg','jpeg','png','webp','gif','avif','heic','mp4','mkv','webm','mov','m4v']);
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const inside = (root,file) => file.startsWith(root+path.sep);
const fileName = (file) => typeof file==='string' && /^media-[a-f0-9]{16}\.[a-z0-9]+$/.test(file);

function dateParts(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return ['unknown-year','unknown-month','unknown-date'];
  const iso = new Date(Date.parse(value)+8*3600000).toISOString();
  return [iso.slice(0,4),iso.slice(5,7),iso.slice(0,10)+'_'+iso.slice(11,19).replaceAll(':','')];
}

async function atomic(file, text) {
  const tmp = file+'.'+randomUUID()+'.part';
  try {
    await fs.writeFile(tmp,text,{flag:'wx',mode:0o600});
    await fs.rename(tmp,file);
  } finally { await fs.rm(tmp,{force:true}).catch(()=>{}); }
}

async function directory(root, parts) {
  let here=root;
  for (const name of parts) {
    here=path.join(here,name);
    try { await fs.mkdir(here); } catch(error) { if(error.code!=='EEXIST') throw error; }
    const stat=await fs.lstat(here);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('storage');
  }
  if (!inside(root,await fs.realpath(here))) throw new Error('storage');
  return here;
}

async function readRecord(folder) {
  const file=path.join(folder,'metadata.json');
  const stat=await fs.lstat(file);
  if (!stat.isFile() || stat.size>32*1024*1024) throw new Error('Invalid archive metadata');
  const value=JSON.parse(await fs.readFile(file,'utf8'));
  if (value.schema!==1 || !Array.isArray(value.media) || !Array.isArray(value.versions)) throw new Error('Invalid archive metadata');
  return {...value,folder};
}

async function scan(input) {
  const root=await fs.realpath(input);
  const results=[];
  async function walk(folder,depth) {
    if (depth===5) {
      const record=await readRecord(folder).catch(()=>null);
      if (record) results.push(record);
      return;
    }
    for (const entry of await fs.readdir(folder,{withFileTypes:true})) {
      if (!entry.isDirectory() || (depth===0 && !['X','IG','TikTok'].includes(entry.name))) continue;
      await walk(path.join(folder,entry.name),depth+1);
    }
  }
  await walk(root,0);
  return results.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}

async function digest(file) {
  const hash=createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function verified(folder,media) {
  if (!fileName(media.file) || !media.sha256) return false;
  const file=path.join(folder,media.file);
  try {
    const stat=await fs.lstat(file);
    return stat.isFile() && stat.size===media.bytes && await digest(file)===media.sha256;
  } catch(error) {
    if (error.code==='ENOENT') return false;
    throw error;
  }
}

function markdown(post) {
  const lines=[`# ${post.account} · ${post.id}`,'',`**Sender**: @${post.account}`,
    `**Date**: ${post.date || '未知'}`, `**Source**: ${post.url || '未取得'}`,'','---','',post.text || ''];
  for(const item of post.media) {
    if (fileName(item.file)) lines.push('',item.type==='image' ? `![圖片](${item.file})` : `[影片](${item.file})`);
    else lines.push('', '媒體未完成');
    if (item.altState==='present') lines.push('', '**ALT**','',item.alt);
  }
  return lines.join('\n')+'\n';
}

function revisionValue(post) {
  return {text:post.text,alt:Object.fromEntries(post.media.filter(m=>m.altState==='present').map(m=>[m.id,m.alt]))};
}

function changed(before,after) {
  return before.text!==after.text || after.media.some(item => item.altState==='present' &&
    before.media.some(old=>old.id===item.id && old.altState==='present' && old.alt!==item.alt));
}

function gap(media) {
  return !media.file || Boolean(media.error) || media.quality!=='best' || media.altState==='unknown';
}

async function archive(post,{root, transfer,signal, previous, accountFolder, retry=false}) {
  root=await fs.realpath(root);
  target(post.platform,post.account);
  if (!/^\d+$/.test(post.accountId) || !/^\d+$/.test(post.id)) throw new Error('invalid-account');
  const [year,month,date]=dateParts(post.date);
  const folder=previous?.folder || await directory(root,[post.platform,accountFolder || post.account,year,month,date+'__'+post.id]);
  if (!inside(root,await fs.realpath(folder))) throw new Error('storage');
  const old=previous || await readRecord(folder).catch(error=>{if(error.code==='ENOENT') return null;throw error;});
  if (old && (old.accountId !== post.accountId || old.id !== post.id)) throw new Error('Archive identity conflict');
  const counts={added:0,skipped:0,versions:0,upgraded:0,failed:0,limited:0};
  const record={schema:1,platform:post.platform,account:post.account,accountId:post.accountId,id:post.id,date:post.date || old?.date || null,
    kind:post.kind,text:retry && old ? old.text : post.text,url:post.url || old?.url || null,parent:post.parent || old?.parent || null,
    memberships:[...new Map([...(old?.memberships||[]),...(post.memberships||[])].map(v=>[v.id,v])).values()],
    media:[],versions:old?.versions || [],observed:new Date().toISOString(),missing:0,contentMissing:false};
  record.contentMissing=Boolean(post.contentMissing || (retry && old?.contentMissing));
  for (const input of post.media) {
    signal.throwIfAborted();
    const prior=old?.media.find(item=>item.id===input.id);
    const media={...prior,id:input.id,type:input.type,order:input.order};
    if (input.altState==='present' || !prior?.altState) {
      media.altState=input.altState;
      media.alt=input.alt;
    }
    const good=prior && await verified(folder,prior);
    if (good && prior.quality==='best') {
      counts.skipped++;
      delete media.error;
    } else {
      if (!good) delete media.file;
      const tmp=path.join(folder,'.media-'+randomUUID()+'.part');
      try {
        const result=await transfer(input,tmp,signal);
        signal.throwIfAborted();
        const sha256=await digest(tmp);
        if (!extensions.has(result.ext)) throw new Error('Unsupported media');
        const bytes=(await fs.stat(tmp)).size;
        if (!bytes) throw new Error('Empty media');
        if (good && (result.width*result.height < prior.width*prior.height ||
          (prior.quality==='best' && result.quality!=='best'))) {
          counts.skipped++;
        } else {
          const fingerprint=createHash('sha256').update(input.id+':'+sha256).digest('hex').slice(0,16);
          const file=`media-${fingerprint}.${result.ext}`;
          await fs.rename(tmp,path.join(folder,file));
          if(good && (result.width*result.height>prior.width*prior.height || result.quality==='best')) counts.upgraded++;
          Object.assign(media,result,{sha256,bytes,file});
        }
        delete media.error;
      } catch(error) {
        if (signal.aborted || ['ENOSPC','EACCES','EROFS','ENODEV','EIO','ENOTDIR'].includes(error.code)) throw error;
        media.error=toolIssue(error);
        counts.failed++;
      } finally { await fs.rm(tmp,{force:true}).catch(()=>{}); }
    }
    if (media.file && media.quality!=='best') counts.limited++;
    record.media.push(media);
  }
  const confirmedAlbum=post.platform==='TikTok' && post.url?.includes('/photo/') &&
    post.media.some(media=>media.type==='image');
  for (const item of old?.media || []) {
    if(confirmedAlbum && old.url?.includes('/video/') && item.type==='video' && !item.file && item.error)continue;
    if (!record.media.some(m=>m.id===item.id)) record.media.push(item);
  }
  record.media.sort((a,b)=>(a.order||0)-(b.order||0));
  record.missing=Math.max(0,(post.expected || 0)-post.media.length, retry ? (old?.missing || 0):0);
  counts.limited+=record.missing+Number(record.contentMissing);
  if (old && changed(old,record) && !same(revisionValue(old),revisionValue(record))) {
    record.versions=[{text:old.text,media:old.media,observed:old.observed},...record.versions];
    counts.versions++;
  }
  signal.throwIfAborted();
  await atomic(path.join(folder,'metadata.json'),JSON.stringify(record,null,2)+'\n');
  await atomic(path.join(folder,'index.md'),markdown(record));
  if (!old) counts.added++;
  return {record:{...record,folder},counts};
}

async function probe(file,signal) {
  const {stdout}=await command('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],signal,20000);
  const data=JSON.parse(stdout);
  const video=data.streams.find(stream=>stream.codec_type==='video');
  if (!video?.width || !video.height) throw new Error('Invalid media dimensions');
  return {width:video.width,height:video.height, hasAudio:data.streams.some(s=>s.codec_type==='audio'),codec:video.codec_name};
}

async function transfer(media,file,signal,cookieFile) {
  if (media.videoUseTool && media.postUrl) {
    const output=file+'.%(ext)s';
    let final;
    try {
      const args=['--ignore-config','--no-playlist','--no-progress','--no-warnings','--socket-timeout','25','--retries','1',
        '--format-sort-force','-S','res,fps,vbr,tbr','-f','bv*+ba/b','-o',output,
        '--print','after_move:%(.{filepath,width,height})j'];
      if(cookieFile) args.push('--cookies',cookieFile);
      const {stdout}=await command('yt-dlp',[...args,'--',media.postUrl],signal,300000);
      const selected=JSON.parse(stdout.trim().split('\n').at(-1));
      final=selected.filepath;
      if(!final || !final.startsWith(file+'.') || path.dirname(final)!==path.dirname(file)) throw new Error('Invalid video result');
      const ext=path.extname(final).slice(1);
      const actual=await probe(final,signal);
      const expected=media.width && media.height ? media : selected;
      const quality=matchesResolution(actual,expected)?'best':'limited';
      await fs.rename(final,file);
      return {...actual,ext,quality,source:'yt-dlp'};
    } catch(error) {
      if(signal.aborted || ['ENOSPC','EACCES','EROFS','ENODEV','EIO'].includes(error.code) || toolIssue(error)==='storage' || !media.urls.length) throw error;
    } finally {
      const dir=path.dirname(file), prefix=path.basename(file)+'.';
      for(const name of await fs.readdir(dir).catch(()=>[])) if(name.startsWith(prefix)) await fs.rm(path.join(dir,name),{force:true}).catch(()=>{});
    }
  }
  let error;
  for(const [index,url] of (media.urls||[]).entries()) {
    try {
      await downloadMedia(url,file,signal);
      const actual=await probe(file,signal);
      const ext=({mjpeg:'jpg',png:'png',webp:'webp',gif:'gif',av1:'avif'})[actual.codec];
      return {...actual,source:'direct',ext:media.type==='image' && ext ? ext:media.ext,
        quality:(media.type==='image' || media.directBest) && index===0 && matchesResolution(actual,media) ? 'best':'limited'};
    } catch (cause) {
      if(signal.aborted || ['rate-limit','ENOSPC','EACCES','EROFS','ENODEV','EIO','EEXIST'].includes(cause.code)) throw cause;
      error=cause;
      await fs.rm(file,{force:true});
    }
  }
  throw error || new Error('No supported media URL');
}

function matchesResolution(actual,media) {
  if (!(Number(media.width)>0) || !(Number(media.height)>0)) return false;
  const expected=[media.width,media.height].sort((a,b)=>a-b);
  const measured=[actual.width,actual.height].sort((a,b)=>a-b);
  return measured.every((v,i)=>v>=expected[i]);
}

module.exports={archive,scan,transfer,gap,verified,fileName,markdown,dateParts};
