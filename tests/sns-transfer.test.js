const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { downloadMedia } = require('../src/main/sns/mediaDownload');

async function destination(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(),'sns-transfer-'));
  t.after(() => fs.rm(dir,{recursive:true,force:true}));
  return path.join(dir,'image.part');
}

const url = 'https://pbs.twimg.com/media/fixture?name=orig';
const signal = () => new AbortController().signal;

test('retries a truncated object and publishes only its verified length', async t => {
  const file = await destination(t);
  let attempts = 0;
  const request = async () => {
    attempts++;
    return new Response(attempts===1?'a':'abc',{headers:{'Content-Type':'image/jpeg','Content-Length':'3'}});
  };
  await downloadMedia(url,file,signal(),{request,wait:async()=>{}});
  assert.equal(attempts,2);
  assert.equal(await fs.readFile(file,'utf8'),'abc');
});

test('rejects HTML and does not retry access denial or rate limits', async t => {
  const file = await destination(t);
  for (const [response,code] of [
    [new Response('<html>sign in</html>',{headers:{'Content-Type':'text/html'}}),'invalid-media'],
    [new Response(null,{status:403}),'access'],
    [new Response(null,{status:429}),'rate-limit']
  ]) {
    let attempts=0;
    await assert.rejects(downloadMedia(url,file,signal(),{request:async()=>{attempts++;return response;}}),{code});
    assert.equal(attempts,1);
    await assert.rejects(fs.stat(file),{code:'ENOENT'});
  }
});
