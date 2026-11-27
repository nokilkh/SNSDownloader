// Synthetic IPC only: no live login or downloads.
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const output=fs.mkdtempSync(path.join(require('os').tmpdir(),'takaneko-guided-'));
app.setPath('userData',path.join(output,'userdata'));require('../src/main/main');
setTimeout(()=>{console.error('UI test timed out');app.exit(1);},30000);
app.whenReady().then(async()=>{try{
 const w=BrowserWindow.getAllWindows()[0];if(w.webContents.isLoading())await new Promise(r=>w.webContents.once('did-finish-load',r));
 const capture=async name=>{await new Promise(r=>setTimeout(r,150));fs.writeFileSync(path.join(output,name+'.png'),(await w.webContents.capturePage()).toPNG());};
 const js=s=>w.webContents.executeJavaScript(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
 const until=async s=>{for(let i=0;i<100;i++){if(await js(s))return;await wait(60);}throw Error('UI did not settle: '+s);};
 await until('document.getElementById("downloadRoot").textContent.length > 0');
 assert.equal(await js('document.getElementById("login").closest(".page").id'),'downloads');
 assert.equal(await js('document.getElementById("chooseDownload").closest(".page").id'),'downloads');
 assert.equal(await js('document.getElementById("start").disabled'),true);
 assert.match(await js('document.getElementById("startHelp").textContent'),/登入/);
 await until('document.getElementById("scopeSummary").textContent.includes("投稿")');await capture('logged-out');
 let loggedIn=false,starts=0,finish,release;
 for(const n of ['get-login-status','capture-token','start-download','save-v2-settings'])ipcMain.removeHandler(n);
 ipcMain.handle('get-login-status',()=>loggedIn);ipcMain.handle('capture-token',()=>{loggedIn=true;return {success:true};});
 ipcMain.handle('save-v2-settings',(_e,v)=>new Promise(r=>{release=()=>r(v);}));
 ipcMain.handle('start-download',()=>{starts++;return new Promise(r=>{finish=r;});});
 await js('document.getElementById("capture").click()');await until('!document.getElementById("start").disabled');
 await js('document.getElementById("start").click()');await wait(100);
 await js('document.getElementById("stop").click()');release();await wait(150);
 assert.equal(starts,0,'Stopping while settings save must not start a job');
 await until('!document.getElementById("start").disabled');
 for(const status of ['failed','cancelled','completed']){
  await js('document.getElementById("start").click();document.getElementById("start").click()');
  assert.equal(await js('document.getElementById("start").disabled'),true);await wait(100);release();await wait(100);
  assert.equal(await js('document.getElementById("chooseDownload").disabled'),true);
  if(status==='failed'){await capture('running');
   await js('document.getElementById("pause").click()');await until('document.getElementById("pause").textContent.includes("繼續")');
   await js('document.getElementById("pause").click()');await until('document.getElementById("pause").textContent.includes("暫停")');
  }
  if(status==='cancelled'){await js('document.getElementById("stop").click()');assert.equal(await js('document.getElementById("stop").disabled'),true);}
  finish({status,success:status==='completed'});await until('!document.getElementById("start").disabled');await capture(status);
  assert.match(await js('document.getElementById("jobStatus").textContent'),status==='failed'?/未完成/:status==='cancelled'?/停止/:/已完成/);
 }
 assert.equal(starts,3);
 await js('document.querySelector("[data-language=ja]").click()');assert.equal(await js('document.getElementById("start").textContent'),'ダウンロード開始');
 await js('document.querySelector("[data-language=zh-Hant]").click()');
 await js('scrollTo(0,0)');
 for(const width of [1240,600]){w.setSize(width,860);await wait(200);assert.equal(await js('document.documentElement.scrollWidth <= innerWidth'),true);fs.writeFileSync(path.join(output,'completed-'+width+'.png'),(await w.webContents.capturePage()).toPNG());}
 console.log('Guided UI passed; screenshots: '+output);app.exit(0);
}catch(e){console.error(e);app.exit(1);}});
