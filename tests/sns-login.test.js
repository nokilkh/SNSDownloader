const test = require('node:test');
const assert = require('node:assert/strict');
const { accessStatus, shouldTrySavedLogin, loginSnapshot, importCookieSnapshot, checkAccountAccess, pastedXSnapshot } = require('../src/main/sns/login');

test('pasted X credentials create a scoped cookie jar and require two valid values', () => {
  const result=pastedXSnapshot(' fixture-auth\n','fixture-csrf ');
  assert.match(result,/\.x\.com\tTRUE\t\/\tTRUE\t0\tauth_token\tfixture-auth/);
  assert.match(result,/\tct0\tfixture-csrf/);
  for(const values of [['','fixture'],['fixture','broken\nvalue'],['fixture','a'.repeat(4097)],[null,'fixture']]){
    assert.throws(()=>pastedXSnapshot(...values),{message:'invalid-x-values'});
  }
});

test('X and IG preserve partial coverage when the primary authenticated list is unavailable', async () => {
  for (const [platform, alternate, failure] of [
    ['X','/tweets','access'],['IG','/reels/','profile-unverified']
  ]) {
    const seen=[];
    const status=await checkAccountAccess({platform,handle:'Example'},async (_scope,url)=>{
      seen.push(url);
      return url.endsWith(alternate)?{posts:[{}],errors:[]}:{posts:[],errors:[failure]};
    });
    assert.equal(status,platform==='X'?'posts-access':'reels-access');
    assert.equal(seen.length,2);
  }
  let attempts=0;
  assert.equal(await checkAccountAccess({platform:'X',handle:'Example'},async ()=>{
    attempts++;return {posts:[],errors:['rate-limit']};
  }),'rate-limit');
  assert.equal(attempts,1);
});

test('TikTok reports public video access separately from a blocked signed-in timeline', async () => {
  const account={platform:'TikTok',handle:'example'};
  const blocked=async ()=>({posts:[],errors:['forbidden']});
  const videos=async ()=>({posts:[{}],errors:['photos-unverified']});
  assert.equal(await checkAccountAccess(account,blocked,videos),'videos-access');
  assert.equal(await checkAccountAccess(account,blocked,async()=>({posts:[],errors:['photos-unverified']})),'forbidden');
  assert.equal(await checkAccountAccess(account,async()=>({posts:[{}],errors:[]}),async()=>{
    assert.fail('fallback should not run when the primary list is readable');
  }),'connected');
});

test('login access distinguishes actual posts from access denial, timeout and empty results', () => {
  assert.equal(accessStatus({posts:[{}], errors:[]}), 'connected');
  assert.equal(accessStatus({posts:[{}], errors:['access']}), 'partial-access');
  assert.equal(accessStatus({posts:[], errors:['access']}), 'access');
  assert.equal(accessStatus({posts:[], errors:[]}), 'empty');
  assert.equal(accessStatus(null, Object.assign(new Error(), {killed:true})), 'timeout');
});

test('saved login is tried after a TikTok extractor failure, but not after rate limits', () => {
  assert.equal(shouldTrySavedLogin({posts:[],errors:['extractor']}),true);
  assert.equal(shouldTrySavedLogin({posts:[],errors:['rate-limit']}),false);
  assert.equal(shouldTrySavedLogin({posts:[{}],errors:[]}),false);
});

test('snapshot detects same-session cookie changes and excludes foreign cookies', () => {
  const base={domain:'.instagram.com',path:'/',secure:true,httpOnly:true};
  const marker={...base,name:'sessionid',value:'fixture-session'};
  const csrf={...base,name:'csrftoken',value:'first'};
  const foreign={...base,domain:'.example.com',name:'other',value:'fixture-foreign'};
  const before=loginSnapshot([marker,csrf,foreign],'IG');
  const after=loginSnapshot([marker,{...csrf,value:'second'}],'IG');
  assert.ok(before);
  assert.notEqual(before,after);
  assert.equal(before,loginSnapshot([csrf,marker],'IG'));
  assert.equal(before.includes('fixture-foreign'),false);
  assert.equal(loginSnapshot([csrf],'IG'),null);
  assert.equal(loginSnapshot([marker],'IG'),null);
});

test('imports X JSON with legacy domains, preserving expiration and dropping foreign cookies', () => {
  const make = (name, domain, value = 'synthetic') => ({name, domain, value, path:'/', expirationDate:200, secure:true, httpOnly:true});
  const results = importCookieSnapshot(JSON.stringify([
    make('auth_token','.twitter.com'), make('ct0','x.com'),
    make('tracking','x.com.example','foreign-value')
  ]),'X',100);
  assert.match(results, /#HttpOnly_\.x\.com\tTRUE\t\/\tTRUE\t200\tauth_token\tsynthetic/);
  assert.match(results, /ct0\tsynthetic/);
  assert.doesNotMatch(results, /foreign-value|twitter\.com/);
});

test('requires both active cookies on the downloader host and validates the import format', () => {
  const jar = (domain, expiry) => '# Netscape HTTP Cookie File\n' +
    '.instagram.com\tTRUE\t/\tTRUE\t0\tsessionid\tfixture\n' +
    domain + '\tFALSE\t/\tTRUE\t' + expiry + '\tcsrftoken\tfixture\n';
  assert.match(importCookieSnapshot(jar('www.instagram.com',200),'IG',100), /csrftoken/);
  for (const source of [jar('www.instagram.com',100), jar('i.instagram.com',200), jar('badinstagram.com',200)]) {
    assert.throws(() => importCookieSnapshot(source,'IG',100), {message:'missing-session'});
  }
  assert.throws(() => importCookieSnapshot('[]','IG'), {message:'invalid-cookie-file'});
  assert.throws(() => importCookieSnapshot(jar('www.instagram.com',200),'TikTok'), {message:'invalid-cookie-file'});
  assert.throws(() => importCookieSnapshot('x'.repeat(1048577),'X'), {message:'invalid-cookie-file'});
});
