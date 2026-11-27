const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pkg=require('../package.json'),lock=require('../package-lock.json');
assert.match(pkg.version,/^2\.\d+\.\d+$/);assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
assert.equal(pkg.name,'sns-downloader');
assert.equal(pkg.build.appId,'com.nokilkh.snsdownloader');assert.equal(pkg.productName,'SNS Downloader');
assert.equal(pkg.main,'src/main/sns/main.js');
assert.deepEqual(pkg.build.files,['src/main/sns/**/*','src/renderer/sns/**/*','package.json','README.md','LICENSE','!**/*.test.js']);
for(const entry of ['src/main/sns/preload.js','src/renderer/sns/index.html','src/renderer/sns/app.js','src/renderer/sns/styles.css'])assert.ok(fs.existsSync(entry),entry);
// Validate contents of every built ASAR, rather than relying on ignore patterns alone.
if(process.argv.includes('--packages')) {
  const asar=require('@electron/asar');let checked=0;
  const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.name==='app.asar'){
    const files=asar.listPackage(file).map(name=>name.replace(/\\/g,'/'));for(const name of files)assert.ok(!/\/(?:\.private-v2|deployment|exported|\.backup-state)\/|deployment-access|session\.json|admin-password/.test(name),name);
    for(const name of files)assert.ok(/^\/(?:src|node_modules)(?:\/|$)|^\/(?:package.json|README.md|LICENSE)$/.test(name),name);
    for(const name of files.filter(n=>n.startsWith('/src/')))assert.ok(/^\/src\/(?:main|renderer)(?:\/sns(?:\/|$)|$)/.test(name),name);
    for(const name of files.filter(n=>n.startsWith('/node_modules/')))assert.ok(!/^\/node_modules\/cheerio(?:\/|$)/.test(name),name);
    const packed=JSON.parse(asar.extractFile(file,'package.json'));assert.equal(packed.version,pkg.version);checked++;
    const tools=path.join(path.dirname(file),'tools/windows');
    if(fs.existsSync(tools))for(const name of ['yt-dlp.exe','gallery-dl.exe','ffmpeg.exe','ffprobe.exe','deno.exe','LICENSE-DENO.txt'])assert.ok(fs.existsSync(path.join(tools,name)),`Missing bundled tool: ${name}`);
  }}};
  walk('dist');assert.ok(checked>0,'No packaged app.asar found');
}
console.log('Release identity, version and package boundaries verified.');
