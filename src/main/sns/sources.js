const { spawn } = require('node:child_process');
const { existsSync, readdirSync } = require('node:fs');
const path = require('node:path');

const MAX_COMMAND_BUFFER = 96 * 1024 * 1024;
const sites = {
  X: { host:'x.com', aliases:['twitter.com'], login:'https://x.com/i/flow/login', loginCookies:['auth_token','ct0'] },
  IG: { host:'instagram.com', aliases:[], login:'https://www.instagram.com/accounts/login/', loginCookies:['sessionid','csrftoken'] },
  TikTok: { host:'tiktok.com', aliases:[], login:'https://www.tiktok.com/login', loginCookies:['sessionid'] }
};
const own = (host, domain) => host === domain || host.endsWith('.' + domain);

function target(platform, input) {
  if (!Object.hasOwn(sites, platform) || typeof input !== 'string') throw new Error('invalid-account');
  let handle = input.trim();
  if (handle.includes('/')) {
    const url = new URL(handle.includes('://') ? handle : 'https://' + handle);
    const site = sites[platform];
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        ![site.host,...site.aliases].some(domain => [domain,'www.'+domain,'mobile.'+domain].includes(url.hostname)) ||
        !/^\/[^/]+\/?$/.test(url.pathname)) throw new Error('invalid-account');
    handle = url.pathname.split('/')[1];
  }
  handle = handle.replace(/^@/, '');
  const pattern = platform === 'X' ? /^[a-z0-9_]{1,15}$/i : /^[a-z0-9_][a-z0-9_.]{0,29}$/i;
  if (!pattern.test(handle) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(handle) || handle.endsWith('.')) throw new Error('invalid-account');
  return {platform, handle, key:platform+':'+handle.toLowerCase()};
}

function decode(json) {
  return JSON.parse(json.replace(/"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, token =>
    /^-?\d{16,}$/.test(token) ? JSON.stringify(token) : token));
}

function routes(account) {
  const {platform,handle} = account;
  if (platform === 'X') return [['posts',`https://x.com/${handle}/with_replies`]];
  if (platform === 'TikTok') return [['posts',`https://www.tiktok.com/@${handle}/posts`]];
  const ig = 'https://www.instagram.com/';
  return [['posts',ig+handle+'/posts/'],['reels',ig+handle+'/reels/'],
    ['story',ig+'stories/'+handle+'/'],['highlight',ig+handle+'/highlights/']];
}

function mediaURL(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.port && !url.username && !url.password &&
      (/^v\d+[a-z]*-webapp-prime\.tiktok\.com$/i.test(url.hostname) ||
      ['twimg.com','cdninstagram.com','fbcdn.net','tiktokcdn.com','tiktokcdn-us.com','tiktokcdn-eu.com','tiktokv.com','byteoversea.com','ibytedtos.com','muscdn.com','ttwstatic.com']
        .some(domain => own(url.hostname, domain)));
  } catch { return false; }
}

function sourceDate(value) {
  if (!value || !/^\d{4}-\d\d-\d\d/.test(String(value))) return null;
  const date = String(value).replace(' ', 'T');
  const parsed = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(date) ? date : date+'Z');
  return Number.isFinite(+parsed) && parsed.getUTCFullYear()>1900 ? parsed.toISOString() : null;
}

function normalize(account, scope, rows) {
  const posts = new Map();
  for (const row of rows) {
    if (!Array.isArray(row) || ![2,3].includes(row[0])) continue;
    const m = row.at(-1);
    if (!m || typeof m !== 'object') continue;
    const x = account.platform === 'X';
    const ig = account.platform === 'IG';
    const story = ig && ['story','highlight'].includes(scope);
    if (story && row[0] !== 3) continue;
    if (x && (Number(m.retweet_id) || Number(m.quote_id) ||
        m.author?.name?.toLowerCase() !== account.handle.toLowerCase() ||
        (m.user?.id && String(m.user.id) !== String(m.author?.id)))) continue;
    const author = x ? m.author : ig ? m.user : m.author;
    const handle = x ? author?.name : ig ? (author?.username || m.username) : author?.uniqueId;
    if (handle && handle.toLowerCase() !== account.handle.toLowerCase()) continue;
    const accountId = String(author?.id || author?.pk || m.user_id || '');
    const id = String((x ? m.tweet_id : ig ? (story ? m.media_id : m.post_id) : m.id) || '');
    if (!/^\d+$/.test(id) || !/^\d+$/.test(accountId)) continue;
    if (row[0] === 3 && /^(audio|preview|cover|avatar)$/i.test(m.type || '')) continue;
    const shortcode = m.post_shortcode || m.shortcode;
    const kind = x ? (Number(m.reply_id) ? 'reply':'post') : story ? 'story' : scope === 'reels' ? 'reel' : 'post';
    const url = x ? `https://x.com/${account.handle}/status/${id}` :
      ig ? (story ? `https://www.instagram.com/stories/${account.handle}/${id}/` : /^[\w-]+$/.test(shortcode || '') ? `https://www.instagram.com/p/${shortcode}/` : null) :
        `https://www.tiktok.com/@${account.handle}/${m.post_type === 'image' ? 'photo':'video'}/${id}`;
    const post = posts.get(id) || {
      platform:account.platform, account:account.handle, accountId, id, date:sourceDate(m.date),
      ...(x && author.date ? {accountCreated:sourceDate(author.date)} : {}),
      text:String((x ? m.content : ig ? m.description : m.desc) || ''), kind, url,
      parent:x && Number(m.reply_id) ? String(m.reply_id):null, media:[], memberships:[],
      expected:!story && Number(m.count) > 0 ? Number(m.count) : 0
    };
    if (!post.date) post.date=sourceDate(m.date);
    posts.set(id,post);
    if (scope === 'highlight') post.memberships.push({id:String(m.post_id),title:String(m.highlight_title || '')});
    if (row[0] !== 3) continue;
    const ext = String(m.extension || '').toLowerCase();
    const type = /^(mp4|webm|mkv|mov|m4v)$/.test(ext) || /^(video|animated_gif)$/.test(m.type) || String(row[1]).startsWith('ytdl:') ? 'video' : 'image';
    const order = Number(m.num) || 0;
    const alt = x && type === 'image' && typeof m.description === 'string' && m.description.length ? m.description : undefined;
    let urls = [row[1],m.video_url,...(Array.isArray(m._fallback) ? m._fallback : [])].filter(mediaURL);
    if (x && type === 'image' && urls[0]) {
      const original = new URL(urls[0]);
      const sizes = ['orig','4096x4096','large','medium','small'];
      urls = sizes.map(size => {
        original.searchParams.set('name',size);
        return original.href;
      });
    }
    const mediaId = String(m.media_id || m.file_id || (x && urls[0] ? new URL(urls[0]).pathname.split('/').at(-1) : '') || order);
    const videoUseTool = type === 'video' && Boolean(url);
    const media = { id:mediaId, order,type,ext,alt, altState:alt ? 'present' : x && type === 'image' ? 'unknown' : 'na',
      urls:[...new Set(urls)], postUrl:url, videoUseTool,
      width:Number(m.width_original || m.width)||0,height:Number(m.height_original || m.height)||0 };
    if (!post.media.some(item => item.id===media.id)) post.media.push(media);
  }
  return [...posts.values()].map(post => {
    post.media.sort((a,b)=>a.order-b.order);
    if (post.media.filter(item=>item.type==='video').length>1) {
      for (const item of post.media) item.videoUseTool=false;
    }
    return post;
  });
}

function pythonFrameworkBins() {
  if (process.platform !== 'darwin') return [];
  const root = '/Library/Frameworks/Python.framework/Versions';
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && /^\d+\.\d+/.test(entry.name))
      .map(entry => entry.name)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map(version => path.join(root, version, 'bin'))
      .filter(existsSync);
  } catch {
    return [];
  }
}

function killProcessTree(child) {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).unref();
    } else {
      process.kill(-child.pid, 'SIGTERM');
      const force = setTimeout(() => {
        try { process.kill(-child.pid, 'SIGKILL'); } catch {}
      }, 2000);
      force.unref();
    }
  } catch {
    try { child.kill('SIGKILL'); } catch {}
  }
}

function runFile(exe, args, { signal, timeout = 120000, env, maxBuffer = MAX_COMMAND_BUFFER } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      err.code = 'ABORT_ERR';
      reject(err);
      return;
    }
    const child = spawn(exe, args, {
      env,
      windowsHide: true,
      shell: false,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;
    let killed = false;
    let killReason = null;
    let timer = null;

    const cleanup = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      signal?.removeEventListener('abort', onAbort);
    };
    const terminate = (reason) => {
      if (killed) return;
      killed = true;
      killReason = reason;
      killProcessTree(child);
    };
    const onAbort = () => terminate('abort');
    signal?.addEventListener('abort', onAbort, { once: true });
    if (timeout > 0) {
      timer = setTimeout(() => terminate('timeout'), timeout);
    }

    const collect = (chunks, getBytes, setBytes) => chunk => {
      const next = getBytes() + chunk.length;
      if (next > maxBuffer) {
        terminate('maxBuffer');
        return;
      }
      setBytes(next);
      chunks.push(chunk);
    };
    child.stdout.on('data', collect(stdoutChunks, () => stdoutBytes, v => { stdoutBytes = v; }));
    child.stderr.on('data', collect(stderrChunks, () => stderrBytes, v => { stderrBytes = v; }));

    child.on('error', error => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    });
    child.on('close', (code, exitSignal) => {
      if (settled) return;
      settled = true;
      cleanup();
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');
      if (killReason === 'abort') {
        const err = Object.assign(new Error('The operation was aborted'), { name: 'AbortError', code: 'ABORT_ERR', killed: true, stdout, stderr });
        reject(err);
        return;
      }
      if (killReason === 'maxBuffer') {
        const err = Object.assign(new Error('Command stdout/stderr maxBuffer exceeded'), { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER', killed: true, stdout, stderr });
        reject(err);
        return;
      }
      if (code === 0 && !killed) {
        resolve({ stdout, stderr });
        return;
      }
      const err = Object.assign(new Error(`Command failed: ${exe}`), {
        code: code ?? exitSignal ?? 1,
        signal: exitSignal,
        killed,
        stdout,
        stderr
      });
      reject(err);
    });
  });
}

function command(name, args, signal, timeout = 120000, environment) {
  const key = Object.keys(process.env).find(k => k.toUpperCase() === 'PATH') || 'PATH';
  const bundled = process.platform === 'win32' && process.resourcesPath ? path.join(process.resourcesPath, 'tools', 'windows') : null;
  const exe = bundled ? path.join(bundled, name + '.exe') : name;
  const env = {
    ...process.env,
    ...environment,
    [key]: [
      bundled,
      process.env[key],
      '/opt/homebrew/bin',
      '/usr/local/bin',
      process.env.HOME && path.join(process.env.HOME, '.local', 'bin'),
      ...pythonFrameworkBins()
    ].filter(Boolean).join(path.delimiter)
  };
  const opts = { signal, timeout, env, maxBuffer: MAX_COMMAND_BUFFER };
  return runFile(exe, args, opts).catch(error => {
    if (process.platform === 'win32' && exe !== name && error.code === 'ENOENT') return runFile(name, args, opts);
    throw error;
  });
}

function toolIssue(error) {
  const details = [error?.error, error?.stderr || error?.message || error].filter(Boolean).join(' ').slice(-16000);
  if (error?.code === 'ENOENT') return 'missing-tool';
  if (['access','rate-limit','network','forbidden','missing-tool','storage','unverified'].includes(error?.code)) return error.code;
  if (error?.code === 'incomplete-media' || error?.name === 'TimeoutError') return 'network';
  if (/login|authrequired|authenticated cookies|private account|sign in|HTTP(?: Error)? 401/i.test(details)) return 'access';
  if (/429|rate.?limit/i.test(details)) return 'rate-limit';
  if (/\b403 Forbidden\b|\bHTTP(?: Error)? 403\b/i.test(details)) return 'forbidden';
  if (/^NotFoundError Requested user could not be found\b|^KeyError ['"]username['"]$/i.test(details)) return 'profile-unverified';
  if (/no space|enospc/i.test(details)) return 'storage';
  if (/network|connection|timeout|timed out|permission|resolve host|operation not permitted/i.test(details)) return 'network';
  return 'extractor';
}

async function enumerate(account, scope, url, cookieFile, signal, probe=false) {
  const args = ['--config-ignore','--no-download','--no-colors','--http-timeout',probe?'8':'20','-R',probe?'0':'1',
    '-o','extractor.twitter.text-tweets=true','-o','extractor.twitter.replies=true',
    '-o','extractor.twitter.retweets=false','-o','extractor.twitter.quoted=false',
    '-o','extractor.twitter.articles=false','-o','extractor.tiktok.audio=false',
    '-o','output.private=true','-J'];
  if (account.platform==='X' && (url.startsWith('https://x.com/search?') || (!probe && !account.until))) args.push('-o','extractor.twitter.ratelimit=abort');
  if (cookieFile) args.push('-o','extractor.cookies-update=false','--cookies',cookieFile);
  if (probe) args.push('--post-range','1-3');
  let environment;
  if (process.platform==='darwin' && account.platform==='TikTok' && /^https:\/\/www\.tiktok\.com\/@[^/]+\/photo\/\d+$/.test(url)) {
    const name='gallery_dl-1.32.21-py3-none-any.whl';
    const roots=[process.resourcesPath,path.resolve(__dirname,'../../../resources')].filter(Boolean);
    const archive=roots.map(root=>path.join(root,'tools','macos',name)).find(existsSync);
    if (archive) environment={PYTHONPATH:[archive,process.env.PYTHONPATH].filter(Boolean).join(path.delimiter)};
  }
  const {stdout, stderr} = await command('gallery-dl',[...args,'--',url],signal,probe?25000:480000,environment);
  const rows = decode(stdout);
  if (!Array.isArray(rows)) throw new Error('Invalid extractor response');
  const errors = rows.filter(r=>r[0]===-1).map(r=>toolIssue(r[1]));
  if (/\b(error|critical)\b/i.test(stderr) || /login required|authenticated cookies|429/i.test(stderr)) errors.push(toolIssue({stderr}));
  const posts = normalize(account,scope,rows);
  if (!posts.length && rows.some(r=>[2,3,6].includes(r[0]))) errors.push('unverified');
  return {posts, errors:[...new Set(errors)]};
}

function tiktokPlaylist(account, stdout) {
  const rows = stdout.trim().split(/\r?\n/).filter(Boolean).flatMap(line => {
    const item = decode(line);
    const date = new Date(Number(item.timestamp)*1000);
    if (typeof item.uploader !== 'string' || item.uploader.toLowerCase() !== account.handle.toLowerCase() ||
        !/^\d+$/.test(String(item.id)) || !/^\d+$/.test(String(item.uploader_id)) ||
        !item.timestamp || !Number.isFinite(+date) || !(Number(item.duration)>0)) return [];
    const videoUrl = 'https://www.tiktok.com/@'+item.uploader+'/video/'+item.id;
    if (typeof item.url !== 'string' || item.url.split('?')[0].toLowerCase() !== videoUrl.toLowerCase()) return [];
    return [[3,'ytdl:'+videoUrl,{
      id:item.id, author:{id:item.uploader_id,uniqueId:item.uploader},
      date:date.toISOString(), desc:item.description, type:'video', extension:'mp4', num:0
    }]];
  });
  return {posts:normalize(account,'posts',rows).map(post=>({...post,fromPublicPlaylist:true})),errors:['photos-unverified']};
}

async function findTikTokAlbum(post,signal) {
  const account=target('TikTok',post.account);
  if (!/^\d+$/.test(post.id)) return null;
  const url='https://www.tiktok.com/@'+account.handle+'/photo/'+post.id;
  try {
    const result=await enumerate(account,'posts',url,null,signal,true);
    return result.posts.find(candidate=>candidate.id===post.id && candidate.accountId===post.accountId &&
      candidate.url===url && candidate.media.some(media=>media.type==='image') &&
      candidate.media.every(media=>media.type==='image')) || null;
  } catch(error) {
    signal.throwIfAborted();
    return null;
  }
}

async function publicFallback(account, signal, probe=false) {
  if (account.platform === 'X') {
    return enumerate(account,'posts','https://x.com/'+account.handle+'/tweets',null,signal,probe);
  }
  const args = ['--ignore-config','--flat-playlist','--no-progress','--no-warnings','--socket-timeout','12','--retries','0','--dump-json'];
  if (probe) args.push('--playlist-items','1:3');
  const {stdout,stderr} = await command('yt-dlp',[...args,'--','https://www.tiktok.com/@'+account.handle],signal,probe?25000:480000);
  const result = tiktokPlaylist(account,stdout);
  if (/\berror\b/i.test(stderr)) result.errors.push(toolIssue({stderr}));
  return result;
}

module.exports = {sites, own, target, routes, decode, normalize, command, toolIssue, enumerate, mediaURL, tiktokPlaylist, publicFallback, findTikTokAlbum};
