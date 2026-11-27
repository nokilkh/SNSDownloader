const { sites, own, routes, toolIssue } = require('./sources');

const MAX_COOKIE_FILE_BYTES = 1024 * 1024;
const jarHeader = '# Netscape HTTP Cookie File';

function loginSnapshot(cookies, platform, now = Date.now()/1000, importLegacy = false) {
  const site = sites[platform];
  const required = new Set(site.loginCookies);
  const loginHost = new URL(site.login).hostname;
  const rows = new Map();
  for (const cookie of cookies) {
    if (!cookie || typeof cookie.domain !== 'string' || !/^\.?[a-z\d-]+(?:\.[a-z\d-]+)+$/i.test(cookie.domain)) continue;
    const {path, name, value, httpOnly, secure} = cookie;
    if (typeof path !== 'string' || !/^\/[^\s\x00-\x1f\x7f]*$/.test(path) ||
        typeof name !== 'string' || !/^[!#$%&'*+.^_\x60|~\w-]+$/.test(name) ||
        typeof value !== 'string' || !value || /[^\x21-\x7e]|[;,]/.test(value)) continue;
    const expiry = cookie.expirationDate === undefined ? 0 : Math.floor(cookie.expirationDate);
    if (!Number.isSafeInteger(expiry) || (cookie.expirationDate !== undefined && expiry <= now)) continue;
    let host = cookie.domain.replace(/^\./,'').toLowerCase();
    if (importLegacy && platform === 'X' && host === 'twitter.com') host = site.host;
    if (!own(host,site.host)) continue;
    const subdomains = !cookie.hostOnly && cookie.domain.startsWith('.');
    const domain = subdomains ? '.' + host : host;
    if (path === '/' && (host === loginHost || (subdomains && own(loginHost,host)))) required.delete(name);
    rows.set([domain,path,name].join('\t'),[
      (httpOnly ? '#HttpOnly_' : '') + domain,
      subdomains ? 'TRUE' : 'FALSE', path,
      secure ? 'TRUE' : 'FALSE', expiry, name, value
    ].join('\t'));
  }
  if (required.size) return null;
  return jarHeader + '\n' + [...rows.values()].sort().join('\n') + '\n';
}

function importCookieSnapshot(content, platform, now = Date.now()/1000) {
  const invalid = () => new Error('invalid-cookie-file');
  if (!['X','IG'].includes(platform) || Buffer.byteLength(content) > MAX_COOKIE_FILE_BYTES) throw invalid();
  const source = content.trimStart();
  let cookies;
  if (platform === 'X' && /^[\[{]/.test(source)) {
    let data;
    try { data = JSON.parse(source); } catch { throw invalid(); }
    const entries = Array.isArray(data) ? data : data?.cookies;
    if (!Array.isArray(entries)) throw invalid();
    cookies = entries.filter(cookie => cookie && typeof cookie === 'object').map(cookie => {
      const expiry = cookie.expirationDate ?? cookie.expires ?? 0;
      const seconds = Number(expiry);
      return {...cookie, expirationDate:seconds === 0 || seconds === -1 ? undefined : seconds};
    });
  } else {
    const lines = source.split(/\r?\n/);
    if (!/^# (?:Netscape )?HTTP Cookie File\b/.test(lines[0]) && !lines.some(line => line.split('\t').length === 7)) throw invalid();
    cookies = [];
    for (const line of lines) {
      const httpOnly = line.startsWith('#HttpOnly_');
      if (!line || (line.startsWith('#') && !httpOnly)) continue;
      const fields = (httpOnly ? line.slice('#HttpOnly_'.length) : line).split('\t');
      const [domain, includeSubdomains, path, secure, expiry, name, value] = fields;
      if (fields.length !== 7 || !/^(TRUE|FALSE)$/.test(includeSubdomains) ||
          !/^(TRUE|FALSE)$/.test(secure) || !/^\d+$/.test(expiry)) throw invalid();
      cookies.push({domain: (includeSubdomains === 'TRUE' ? '.' : '') + domain.replace(/^\./,''),
        path, name, value, httpOnly, secure:secure === 'TRUE',
        expirationDate:Number(expiry) || undefined});
    }
  }
  const snapshot = loginSnapshot(cookies,platform,now,true);
  if (!snapshot) throw new Error('missing-session');
  return snapshot;
}

function pastedXSnapshot(authToken, csrfToken) {
  const values = [authToken,csrfToken];
  const invalid = () => new Error('invalid-x-values');
  if (values.some(value=>typeof value!=='string' || value.length>4096)) throw invalid();
  const cookies = sites.X.loginCookies.map((name,index)=>({
    name,value:values[index].trim(),domain:'.x.com',path:'/',secure:true,httpOnly:name==='auth_token'
  }));
  const snapshot = loginSnapshot(cookies,'X');
  if (!snapshot) throw invalid();
  return snapshot;
}

function accessStatus(result, error) {
  if (error) return error.killed || error.name === 'TimeoutError' ? 'timeout' : toolIssue(error);
  const { posts, errors } = result;
  if (posts.length) return errors.length ? 'partial-access' : 'connected';
  return ['missing-tool','rate-limit','tiktok-empty-body','access','network','forbidden','ig-web-bootstrap','ig-web-query','ig-web-identity',
    'ig-web-unverified','profile-unverified','extractor','unverified','reels-unverified','stories-unverified','highlights-unverified'].find(issue => errors.includes(issue)) || 'empty';
}

function shouldTrySavedLogin(result) {
  if (result.errors.some(issue => ['rate-limit','network','missing-tool'].includes(issue))) return false;
  return result.errors.includes('access') || !result.posts.length;
}

async function checkAccountAccess(account, read, readPublicVideos) {
  const [primary, reels] = routes(account);
  let status;
  try {
    const result = await read(...primary);
    status = accessStatus(result);
    if (result.posts.length) return status;
  } catch(error) {
    status = accessStatus(null,error);
  }
  if (['rate-limit','network','missing-tool'].includes(status)) return status;
  if (account.platform==='TikTok') {
    try {
      const videos=await readPublicVideos?.();
      if (videos?.posts.length) return status==='tiktok-empty-body'?'videos-empty-body':'videos-access';
    } catch {}
    return status;
  }
  if(status==='timeout')return status;
  const alternate = account.platform==='X' ? ['posts','https://x.com/'+account.handle+'/tweets'] : reels;
  if (!alternate) return status;
  try {
    const other = await read(...alternate);
    if (other.posts.length) return account.platform==='X'?'posts-access':'reels-access';
  } catch {}
  return status;
}

module.exports = { MAX_COOKIE_FILE_BYTES, importCookieSnapshot, pastedXSnapshot, loginSnapshot, accessStatus, shouldTrySavedLogin, checkAccountAccess };
