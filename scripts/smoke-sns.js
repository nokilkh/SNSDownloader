const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {app,BrowserWindow,Menu,dialog,safeStorage,clipboard,shell}=require('electron');

const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'sns-desktop-'));
app.setPath('userData',fixture);
app.setPath('downloads',fixture);
const bin=path.join(fixture,'bin');
fs.mkdirSync(bin);
const sample=path.join(fixture,'sample.json');
const row=text=>JSON.stringify([[2,{tweet_id:'1828419307900149793',author:{name:'Boss',id:'99'},
  user:{name:'Boss',id:'99'},content:text,date:'2024-08-27 13:08:00'}]]);
fs.writeFileSync(sample,row('初次備份'));
fs.writeFileSync(path.join(bin,'gallery-dl'),`#!/bin/sh
for url do :; done
case "$url" in
  *'/search?'*)
    case " $* " in *' --cookies '*) ;; *) exit 4 ;; esac
    printf '%s' "$*" > "$SNS_SMOKE_FIXTURE.search-args"
    printf '%s' "$url" > "$SNS_SMOKE_FIXTURE.search-url"
    if [ -f "$SNS_SMOKE_FIXTURE.auto-old" ]; then
      from=\${url##*since%3A}
      from=\${from%%\\&*}
      from=\${from%%%20*}
      until=\${url##*until%3A}
      until=\${until%%\\&*}
      if [ "$from" '<' '2018-10-01' ] && [ "$until" '>' '2018-09-30' ]; then
        cat "$SNS_SMOKE_FIXTURE.auto-old"
      else echo '[]'; fi
      exit 0
    fi
    if [ -f "$SNS_SMOKE_FIXTURE.search" ]; then cat "$SNS_SMOKE_FIXTURE.search"; else echo '[]'; fi
    exit 0 ;;
  */with_replies)
    if [ -f "$SNS_SMOKE_FIXTURE.timeline-limited" ]; then
      touch "$SNS_SMOKE_FIXTURE.timeline-called"
      printf '%s' '[[-1,{"error":"AbortExtraction","message":"Rate limit exceeded"}]]'
      exit 0
    fi ;;
esac
if [ -f "$SNS_SMOKE_FIXTURE.blocked" ]; then
  case "$url" in
    */with_replies) printf '%s' '[[-1,{"error":"AuthRequired","message":"authenticated cookies needed"}]]'; exit 0 ;;
    */tweets) [ "$(cat "$SNS_SMOKE_FIXTURE.blocked")" = "all" ] && { printf '%s' '[[-1,{"error":"HttpError","message":"403 Forbidden"}]]'; exit 0; } ;;
  esac
fi
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--cookies" ]; then
    mode=$(stat -c '%a' "$2" 2>/dev/null || stat -f '%Lp' "$2")
    [ "$mode" = "600" ] || exit 3
    grep -q 'auth_token' "$2" && grep -q 'ct0' "$2" || exit 4
    printf '%s' "$2" > "$SNS_SMOKE_FIXTURE.probe"
    break
  fi
  shift
done
cat "$SNS_SMOKE_FIXTURE"
`,{mode:0o755});
process.env.SNS_SMOKE_FIXTURE=sample;
process.env.PATH=bin+path.delimiter+process.env.PATH;
const timeout=setTimeout(()=>{console.error('SNS smoke timed out');app.exit(1);},25000);
require('../'+require('../package.json').main);

app.whenReady().then(async()=>{
  const win=BrowserWindow.getAllWindows()[0];
  async function until(script) {
    for(let i=0;i<115;i++){
      try{if(await win.webContents.executeJavaScript(script))return;}catch{}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw new Error('Timed out waiting for '+script);
  }
  const exec=script=>win.webContents.executeJavaScript(script);
  try{
    await until('!!window.sns && document.getElementById("root")?.textContent.includes("SNSDownloader")');
    assert.equal(await exec('typeof require'),'undefined');
    const titlebar=await exec(`(() => {
      const header=document.querySelector('header');
      const spacer=document.createElement('div');
      spacer.style.height='200vh';
      document.querySelector('main').append(spacer);
      try {
        window.scrollTo(0,400);
        const tab=document.querySelector('nav button');
        const rect=tab.getBoundingClientRect();
        return {
          scroll:window.scrollY,
          top:header.getBoundingClientRect().top,
          drag:getComputedStyle(header).getPropertyValue('-webkit-app-region'),
          tabRegion:getComputedStyle(tab.closest('nav')).getPropertyValue('-webkit-app-region'),
          languageRegion:getComputedStyle(document.querySelector('#language')).getPropertyValue('-webkit-app-region'),
          tabVisible:document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)===tab
        };
      } finally {
        spacer.remove();
        window.scrollTo(0,0);
      }
    })()`);
    assert.equal(titlebar.scroll,400);
    assert.equal(titlebar.top,0,'The draggable titlebar must remain at the top when content scrolls');
    assert.equal(titlebar.drag,'drag');
    assert.equal(titlebar.tabRegion,'no-drag');
    assert.equal(titlebar.languageRegion,'no-drag');
    assert.equal(titlebar.tabVisible,true);
    await exec(`document.querySelector('#add').click();
      document.querySelector('#handle').value='Boss';
      document.querySelector('#account-form').elements.range.value='since';
      document.querySelector('#account-form').dispatchEvent(new Event('change'));
      document.querySelector('#since').value='27/08/2024';
      document.querySelector('#account-form').requestSubmit();`);
    await until('document.querySelector("#targets").textContent.includes("@Boss")');
    assert.equal((await exec("sns.invoke('state')")).accounts[0].result,undefined);
    const cookieFile=path.join(fixture,'fake-cookies.txt');
    safeStorage.isEncryptionAvailable=()=>true;
    safeStorage.getSelectedStorageBackend=()=>undefined;
    const stateFile=path.join(fixture,'sns-settings.json');
    dialog.showOpenDialog=async()=>({canceled:false,filePaths:[cookieFile]});
    await exec('document.querySelector("[data-tab=settings]").click()');
    await until('document.querySelector("#logins section button")?.textContent==="貼上 X 登入資料"');
    assert.ok(!(await exec('document.querySelector("#logins section").textContent')).includes('匯入 X Cookie'));
    const showPaste='[...document.querySelectorAll("#logins section:first-child button")].find(b=>b.textContent==="貼上 X 登入資料").click()';
    await exec(showPaste);
    assert.equal(await exec('document.querySelectorAll("#x-paste-dialog input[type=password]").length'),2);
    await exec('document.querySelector("#x-auth-token").value="fixture-cancel";document.querySelector("#x-paste-cancel").click();');
    await until('!document.querySelector("#x-auth-token").value');
    await exec(showPaste);
    const submitPaste=(auth,csrf)=>exec(
      'document.querySelector("#x-auth-token").value='+JSON.stringify(auth)+';'+
      'document.querySelector("#x-csrf-token").value='+JSON.stringify(csrf)+';document.querySelector("#x-paste-form").requestSubmit();'
    );
    await submitPaste('bad value','fixture-csrf');
    await until('!document.querySelector("#x-paste-error").hidden');
    assert.equal(JSON.parse(fs.readFileSync(stateFile)).credentials?.X,undefined);
    const pasteBlob=Buffer.from('opaque-paste-fixture');
    safeStorage.encryptString=jar=>{
      assert.match(jar,/auth_token\tfixture-paste/);
      assert.match(jar,/ct0\tfixture-csrf/);
      return pasteBlob;
    };
    await submitPaste('fixture-paste','fixture-csrf');
    await until('!document.querySelector("#x-paste-dialog").open && !document.querySelector("#x-auth-token").value');
    await until('sns.invoke("state").then(s=>s.login.X==="connected" && !s.accounts[0]?.result)');
    const settings=fs.readFileSync(stateFile,'utf8');
    assert.equal(JSON.parse(settings).credentials.X,pasteBlob.toString('base64'));
    assert.doesNotMatch(settings,/fixture-paste|fixture-csrf/);
    await exec('document.querySelector("[data-tab=accounts]").click()');
    await exec('document.querySelector("#update-all").click()');
    await until('sns.invoke("state").then(s=>!s.job && s.accounts[0]?.result?.phase==="complete")');
    const archiveFile=path.join(fixture,'SNSDownloader','X','Boss','2024','08','2024-08-27_210800__1828419307900149793','index.md');
    assert.match(fs.readFileSync(archiveFile,'utf8'),/初次備份/);
    await until('!document.querySelector("#update-all").disabled');
    fs.writeFileSync(sample,row('修訂後嘅文字'));
    await exec('document.querySelector("#update-all").click()');
    await until('sns.invoke("state").then(s=>!s.job && s.accounts[0]?.result?.counts.versions===1)');
    const {archive}=require('../src/main/sns/archive');
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jpZkAAAAASUVORK5CYII=','base64');
    await archive({platform:'X',account:'Boss',accountId:'99',id:'123',date:'2024-08-26T00:00:00Z',text:'圖片樣本\n'+'長貼文內容\n'.repeat(120),kind:'post',
      media:[{id:'a',type:'image',order:1,alt:'原始圖片 ALT',altState:'present'},
        {id:'b',type:'image',order:2,altState:'unknown'}]},{
      root:path.join(fixture,'SNSDownloader'),signal:new AbortController().signal,
      transfer:async (_media,file)=>{
        fs.writeFileSync(file,png);
        return {ext:'png',quality:'best',width:1,height:1};
      }
    });
    for(const post of [
      {platform:'IG',account:'Boss',id:'124',date:'2024-08-27T16:00:00Z',text:'跨午夜混合媒體',media:[
        {id:'a',type:'image',order:1,alt:'IG 圖片描述',altState:'present'},{id:'b',type:'video',order:2}
      ]},
      {platform:'TikTok',account:'ArchiveOnly',id:'125',date:'2024-08-27T15:59:59Z',text:'最後一秒影片',media:[
        {id:'a',type:'video',order:1}
      ]},
      {platform:'IG',account:'NoDate',id:'126',date:null,text:'無日期純文字',media:[]},
      {platform:'X',account:'Incomplete',id:'127',date:null,text:'媒體資料未取得',expected:1,media:[]}
    ]){
      await archive({...post,accountId:post.id,kind:'post'},{
        root:path.join(fixture,'SNSDownloader'),signal:new AbortController().signal,
        transfer:async (media,file)=>{
          if(media.type==='video')throw new Error('fixture video unavailable');
          fs.writeFileSync(file,png);
          return {ext:'png',quality:'best',width:1,height:1};
        }
      });
    }
    const cards=()=>exec('[...document.querySelectorAll("#library-grid .post-card")].map(card=>card.textContent)');
    const order=async (...texts)=>{
      const shown=await cards();
      assert.equal(shown.length,texts.length);
      shown.forEach((card,index)=>assert.ok(card.includes(texts[index]),card));
    };
    const filter=(id,value)=>exec(`(() => {
      const input=document.getElementById(${JSON.stringify(id)});
      if(input.type==='checkbox')input.checked=${JSON.stringify(value)};
      else input.value=${JSON.stringify(value)};
      input.dispatchEvent(new Event('input',{bubbles:true}));
    })()`);
    const count=async n=>assert.match(await exec('document.querySelector("#library-result").textContent'),new RegExp('共 '+n+' 篇貼文'));
    const openCard=()=>exec('document.querySelector("#library-grid .post-card").click()');
    const closeCard=()=>exec('document.querySelector("#close-post").click()');

    await exec('document.querySelector("[data-tab=library]").click()');
    await until('document.querySelector("#library-result").textContent.includes("6 篇貼文")');
    assert.deepEqual(await exec(`['from','to','since','until'].map(id=>document.getElementById(id).placeholder)`),
      Array(4).fill('DD/MM/YYYY'));
    await order('跨午夜混合媒體','最後一秒影片','修訂後嘅文字','圖片樣本','無日期純文字','媒體資料未取得');
    await until('Array.from(document.querySelectorAll("#library-grid img")).some(img=>img.naturalWidth===1)');
    await filter('library-sort','oldest');
    await order('圖片樣本','修訂後嘅文字','最後一秒影片','跨午夜混合媒體','無日期純文字','媒體資料未取得');

    await filter('library-platform','IG');
    const accounts=await exec('[...document.querySelector("#library-account").options].map(({value,text})=>({value,text}))');
    assert.deepEqual(accounts.map(option=>option.text),['全部帳號','@Boss','@NoDate']);
    await filter('library-account',accounts[1].value);
    await order('跨午夜混合媒體');
    await filter('library-platform','X');
    assert.equal(await exec('document.querySelector("#library-account").value'),'');
    await order('圖片樣本','修訂後嘅文字','媒體資料未取得');
    await filter('library-image',false);
    await filter('library-video',false);
    await order('修訂後嘅文字');

    await exec('document.querySelector("#reset-filters").click()');
    await filter('from','31/02/2024');
    await count(0);
    assert.match(await exec('document.querySelector("#library-empty").textContent'),/DD\/MM\/YYYY/);
    await filter('from','27/08/2024');
    await filter('to','27/08/2024');
    await order('最後一秒影片','修訂後嘅文字');
    assert.equal(await exec(`(() => {
      const picker=document.querySelector('#to-picker');
      let selected;
      picker.showPicker=()=>{ selected=picker.value; };
      try{
        picker.previousElementSibling.click();
        return selected;
      }finally{ delete picker.showPicker; }
    })()`),'2024-08-27');
    await filter('to-picker','2024-08-28');
    assert.equal(await exec('document.querySelector("#to").value'),'28/08/2024');
    await order('跨午夜混合媒體','最後一秒影片','修訂後嘅文字');
    await filter('library-text',false);
    await order('跨午夜混合媒體','最後一秒影片');
    await filter('has-alt',true);
    await order('跨午夜混合媒體');
    await count(1);
    await filter('library-image',false);
    await filter('has-alt',false);
    await order('跨午夜混合媒體','最後一秒影片');
    await filter('library-video',false);
    await count(0);
    await exec('document.querySelector("#reset-filters").click()');
    await count(6);
    await filter('search','修訂後嘅文字');
    await count(1);
    await openCard();
    await until('document.querySelector("#post-dialog").open && document.querySelector("#post").textContent.includes("修訂後嘅文字")');
    await exec(`const v=document.querySelector('#post select');v.focus();v.value='0';v.dispatchEvent(new Event('change'))`);
    await until('document.querySelector("#post").textContent.includes("初次備份")');
    assert.equal(await exec('document.activeElement===document.querySelector("#post select")'),true);
    await closeCard();
    await until('!document.querySelector("#post-dialog").open && document.activeElement.classList.contains("post-card")');
    await filter('search','原始圖片 ALT');
    await order('圖片樣本');
    await openCard();
    await until('document.querySelector("#post img")?.naturalWidth===1 && document.querySelector("#post .alt")?.textContent==="原始圖片 ALT"');
    assert.equal(await exec('document.querySelectorAll("#post img").length'),2);
    assert.doesNotMatch(await exec('document.querySelector("#post").textContent'),/ALT 未能確認/);
    const bottomButton=await exec(`(() => {
      const dialog=document.querySelector('#post-dialog');
      const post=document.querySelector('#post');
      const button=document.querySelector('#close-post');
      const scroller=post.scrollHeight>post.clientHeight?post:dialog;
      const start=button.getBoundingClientRect().top;
      const distance=scroller.scrollHeight-scroller.clientHeight;
      return [0.5,1].map(fraction=>{
        scroller.scrollTop=Math.floor(distance*fraction);
        const rect=button.getBoundingClientRect();
        return {
          scroll:scroller.scrollTop,
          shift:rect.top-start,
          clickable:document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)===button
        };
      });
    })()`);
    for(const position of bottomButton){
      assert.ok(position.scroll>400,'The post must scroll before checking the return button');
      assert.equal(position.shift,0,'The return button must stay in the same position while scrolling');
      assert.equal(position.clickable,true,'The return button must be clickable while scrolling');
    }
    await closeCard();
    await until('!document.querySelector("#post-dialog").open && document.activeElement.classList.contains("post-card")');
    assert.equal(await exec('document.querySelector("#search").value'),'原始圖片 ALT');
    await order('圖片樣本');
    await filter('search','查無此字');
    await count(0);
    assert.match(await exec('document.querySelector("#library-empty").textContent'),/找不到/);
    await exec('document.querySelector("#reset-filters").click()');
    console.log('SNS library: mixed archives, filters, counts, sort, previews and details passed.');

    for(let index=0;index<125;index++){
      await archive({
        platform:'X',account:'Pagination',accountId:'200',id:String(2000+index),kind:'post',
        date:new Date(Date.UTC(2024,9,1,0,index)).toISOString(),
        text:'捲動測試 '+String(index).padStart(3,'0'),media:[]
      },{root:path.join(fixture,'SNSDownloader'),signal:new AbortController().signal});
    }
    await filter('search','捲動測試');
    await exec('document.querySelector("#reload-library").click()');
    await until('document.querySelector("#library-result").textContent.includes("125 篇貼文")');
    assert.equal((await cards()).length,60);
    await exec('window.scrollTo(0, document.documentElement.scrollHeight / 2)');
    await exec('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))');
    assert.equal((await cards()).length,60,'Scrolling partway must keep the first batch');

    const scrollToBottom=()=>exec('window.scrollTo(0, document.documentElement.scrollHeight)');
    await exec('document.querySelector("#library-grid .post-card").focus({preventScroll:true})');
    await scrollToBottom();
    await until('document.querySelector("#library-grid").children.length===120');
    assert.equal(await exec('document.activeElement===document.querySelector("#library-grid .post-card")'),true);
    await scrollToBottom();
    await until('document.querySelector("#library-grid").children.length===125');
    const shown=await cards();
    assert.deepEqual(shown.map(card=>card.match(/捲動測試 (\d{3})/)[1]),
      Array.from({length:125},(_,index)=>String(124-index).padStart(3,'0')));
    assert.equal(await exec('document.querySelector("#library-more").hidden'),true);
    await scrollToBottom();
    assert.deepEqual(await cards(),shown);
    await exec('window.scrollTo(0, 0)');
    await filter('library-sort','oldest');
    assert.equal((await cards()).length,60);
    await exec('document.querySelector("#library-more").click()');
    assert.equal((await cards()).length,120);
    assert.match(await exec('document.activeElement.textContent'),/捲動測試 060/);
    console.log('SNS library: scroll pagination, end of results and manual continuation passed.');

    await exec(`document.querySelector('[data-tab=accounts]').click()`);
    await until('!document.querySelector("#update-all").disabled');
    fs.writeFileSync(sample+'.blocked','replies');
    fs.writeFileSync(sample,row('公開清單備份'));
    await exec('document.querySelector("#update-all").click()');
    await until('sns.invoke("state").then(s=>!s.job && s.accounts[0]?.result?.phase==="partial" && s.accounts[0]?.result?.reasons.includes("replies-unverified"))');
    assert.match(fs.readFileSync(archiveFile,'utf8'),/公開清單備份/);
    fs.writeFileSync(sample,JSON.stringify([[2,{tweet_id:'1828419307900149793',author:{name:'Boss',id:'99'},
      content:'相片未能擷取',count:1,date:'2024-08-27 13:08:00'}],
    [3,'',{tweet_id:'1828419307900149794',author:{name:'Boss',id:'99'},
      content:'相片下載失敗',description:'相片 ALT',extension:'jpg',date:'2024-08-27 13:09:00'}]]));
    await until('!document.querySelector("#update-all").disabled');
    await exec('document.querySelector("#update-all").click()');
    await until('sns.invoke("state").then(s=>!s.job && s.accounts[0]?.result?.phase==="partial")');
    assert.deepEqual(JSON.parse(fs.readFileSync(stateFile,'utf8')).accounts[0].result.postIssues,[
      {url:'https://x.com/Boss/status/1828419307900149793',failed:0,limited:1},
      {url:'https://x.com/Boss/status/1828419307900149794',failed:1,limited:0}
    ]);
    assert.equal(await exec("Array.from(document.querySelectorAll('#targets button')).some(button=>button.textContent==='只補缺漏')"),false);
    await exec("Array.from(document.querySelectorAll('#targets button')).find(button=>button.textContent==='查看結果').click()");
    const firstLink='https://x.com/Boss/status/1828419307900149793';
    await until('document.querySelector("#report")?.textContent.includes('+JSON.stringify(firstLink)+')');
    assert.equal(await exec('document.querySelector("#targets .account-row").contains(document.querySelector("#report"))'),true);
    const openExternal=shell.openExternal, copyText=clipboard.writeText;
    let opened,copied;
    shell.openExternal=async value=>{opened=value;};
    clipboard.writeText=value=>{copied=value;};
    try{
      await exec("Array.from(document.querySelectorAll('#report button')).find(button=>button.textContent==='開啟原文').click()");
      await exec("Array.from(document.querySelectorAll('#report button')).find(button=>button.textContent==='複製連結').click()");
      await until('document.querySelector("#report").textContent.includes("已複製連結")');
      assert.equal(opened,firstLink);
      assert.equal(copied,firstLink);
    }finally{
      shell.openExternal=openExternal;
      clipboard.writeText=copyText;
    }
    fs.writeFileSync(sample,row('公開清單備份'));
    await until('!document.querySelector("#update-all").disabled');
    fs.writeFileSync(sample+'.blocked','all');
    await exec('document.querySelector("#update-all").click()');
    await until('!document.querySelector("#update-all").disabled && document.querySelector("#targets").textContent.includes("未能備份")');
    assert.deepEqual(JSON.parse(fs.readFileSync(stateFile,'utf8')).accounts[0].result.postIssues,[]);
    assert.match(await exec('document.querySelector("#report").textContent'),/未取得原文連結/);
    await exec("Array.from(document.querySelectorAll('#targets button')).find(button=>button.textContent==='查看結果').click()");
    assert.equal(await exec('document.querySelector("#report")'),null);
    assert.match(fs.readFileSync(archiveFile,'utf8'),/相片未能擷取/);
    fs.writeFileSync(sample,row('直接備份貼文'));
    clipboard.readText=()=>'https://x.com/Boss/status/1828419307900149793';
    const linkResult=await new Promise(resolve=>{
      dialog.showMessageBox=async (_parent,options)=>{resolve(options);};
      Menu.getApplicationMenu().items.find(item=>item.label==='檔案').submenu.items[1].click();
    });
    assert.equal(linkResult.type,'info');
    assert.match(fs.readFileSync(archiveFile,'utf8'),/直接備份貼文/);
    await assert.rejects(exec("sns.invoke('backup-post','https://example.com/post/1')"),/invalid-post-link/);
    fs.writeFileSync(sample,JSON.stringify([[3,'https://pbs.twimg.com/media/snsfixture.png',{
      tweet_id:'1828419307900149793',author:{name:'Boss',id:'99'},content:'貼上連結備份',
      description:'相片 ALT',extension:'png',width:1,height:1,date:'2024-08-27 13:08:00'
    }]]));
    const fixtureFetch=global.fetch;
    let transfers=0;
    global.fetch=async url=>{
      assert.equal(String(url),'https://pbs.twimg.com/media/snsfixture.png?name=orig');
      transfers++;
      const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jpZkAAAAASUVORK5CYII=','base64');
      return new Response(png,{headers:{'content-type':'image/png','content-length':String(png.length)}});
    };
    try {
      const submit=async value=>exec(`(() => {
        const input=document.querySelector('#post-link');
        input.value=${JSON.stringify(value)};
        input.dispatchEvent(new Event('input'));
        document.querySelector('#backup-post-submit').click();
      })()`);
      await submit('https://example.com/post/1');
      await until('document.querySelector("#backup-post-error").textContent.includes("請貼上")');
      for(let attempt=0;attempt<2;attempt++){
        await submit(' https://x.com/Boss/status/1828419307900149793?s=20 ');
        await until('!document.querySelector("#backup-post-submit").disabled && sns.invoke("state").then(s=>!s.job)');
      }
      assert.equal(transfers,1,'The second manual backup must skip the saved image');
    }finally{global.fetch=fixtureFetch;}
    assert.match(fs.readFileSync(archiveFile,'utf8'),/貼上連結備份/);
    const linkedRecord=JSON.parse(fs.readFileSync(path.join(path.dirname(archiveFile),'metadata.json'),'utf8'));
    assert.ok(await require('../src/main/sns/archive').verified(path.dirname(archiveFile),linkedRecord.media[0]));
    assert.deepEqual(
      await exec(`[...document.querySelector('#language').options].map(o=>[o.value,o.textContent])`),
      [['zh-Hant','繁體中文'],['en','English'],['ja','日本語']]
    );
    await exec(`(() => { const lang=document.querySelector('#language'); lang.value='en'; lang.dispatchEvent(new Event('change')); })()`);
    await until('document.documentElement.lang==="en"');
    assert.equal(await exec('document.querySelector("[data-tab=accounts]").textContent'),'Accounts');
    assert.equal(await exec('document.querySelector("#add").textContent'),'Add Account');
    assert.equal(await exec('document.querySelector("#backup-post-submit").textContent'),'Back Up Post');
    assert.ok(Menu.getApplicationMenu().items.some(item=>item.label==='File'));
    assert.deepEqual(await exec(`['from','to','since','until'].map(id=>document.getElementById(id).placeholder)`),
      Array(4).fill('DD/MM/YYYY'));
    await exec(`(() => { const lang=document.querySelector('#language'); lang.value='ja'; lang.dispatchEvent(new Event('change')); })()`);
    await until('document.documentElement.lang==="ja"');
    assert.deepEqual(await exec(`['from','to','since','until'].map(id=>document.getElementById(id).placeholder)`),
      Array(4).fill('DD/MM/YYYY'));
    await exec(`document.querySelector('[data-tab=accounts]').click();
      [...document.querySelectorAll('#targets button')].find(b=>b.textContent==='一覧から外す').click();
      document.querySelector('#remove-confirm').click();`);
    await until('sns.invoke("state").then(s=>!s.accounts.length)');
    assert.ok(fs.existsSync(archiveFile));
    const igJar='# Netscape HTTP Cookie File\n'+
      '.instagram.com\tTRUE\t/\tTRUE\t0\tsessionid\tfixture-session\n'+
      '.instagram.com\tTRUE\t/\tTRUE\t0\tcsrftoken\tfixture-csrf\n';
    fs.writeFileSync(cookieFile,igJar);
    const igBlob=Buffer.from('opaque-ig-fixture');
    safeStorage.encryptString=()=>igBlob;
    safeStorage.decryptString=()=>igJar;
    const liveFetch=global.fetch;
    let igScans=0;
    global.fetch=async (url,options)=>{
      const address=String(url);
      if(address==='https://www.instagram.com/'){
        return new Response('["DTSGInitialData",[],{"token":"fixture-page"}] ["LSD",[],{"token":"fixture-lsd"}] {"IG_USER_EIMU":"123"}');
      }
      if(address==='https://www.instagram.com/api/graphql'){
        igScans++;
        assert.match(options.headers.cookie,/sessionid=fixture-session/);
        const variables=JSON.parse(options.body.get('variables'));
        if(variables.data?.target_user_id){
          return Response.json({data:{fetch__XDTUserDict:{clips_connection:{edges:[],page_info:{has_next_page:false}}}}});
        }
        if(variables.user_id){
          return Response.json({data:{highlights:{edges:[],page_info:{has_next_page:false}}}});
        }
        if(Array.isArray(variables.reel_ids)){
          return Response.json({data:{xdt_api__v1__feed__reels_media__connection:{edges:[],page_info:{has_next_page:false}}}});
        }
        return Response.json({data:{xdt_api__v1__feed__user_timeline_graphql_connection:{
          edges:[{node:{pk:'1234567890123456789',code:'Fixture',user:{pk:'123',username:'example'},taken_at:1795000000,
            caption:{text:'IG web fixture'},media_type:1,image_versions2:{candidates:[
              {width:1,height:1,url:'https://scontent.cdninstagram.com/igfixture.png'}
            ]}
          }}],page_info:{has_next_page:false}
        }}});
      }
      if(address==='https://scontent.cdninstagram.com/igfixture.png'){
        const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jpZkAAAAASUVORK5CYII=','base64');
        return new Response(png,{headers:{'content-type':'image/png','content-length':String(png.length)}});
      }
      return liveFetch(url,options);
    };
    await exec('sns.invoke("save-account","IG","example")');
    Menu.getApplicationMenu().items.find(item=>item.label==='ファイル').submenu.items[0].submenu.items[0].click();
    await until('sns.invoke("state").then(s=>s.login.IG==="connected")');
    await exec('sns.invoke("start","IG:example",false)');
    await until('sns.invoke("state").then(s=>!s.job && s.accounts[0]?.result?.counts?.added===1)');
    const igResult=await exec('sns.invoke("state")');
    assert.deepEqual(igResult.accounts[0].result.reasons,[]);
    assert.equal(igResult.accounts[0].result.igScopes.reels.stop,'end');
    assert.equal(igResult.accounts[0].result.igScopes.story.posts,0);
    assert.equal(igResult.accounts[0].result.igScopes.highlight.posts,0);
    const {scan}=require('../src/main/sns/archive');
    const ig=(await scan(path.join(fixture,'SNSDownloader'))).find(post=>post.platform==='IG');
    assert.equal(ig.text,'IG web fixture');
    assert.ok(ig.media[0].file);
    assert.ok(igScans>=2);
    await assert.rejects(exec("sns.invoke('save-account','X','range_example','2026-11-23',null,'2026-11-22')"),/invalid-date/);
    await assert.rejects(exec("sns.invoke('save-account','X','range_example','2026-11-01',null,'2026-11-31')"),/invalid-date/);
    await assert.rejects(exec("sns.invoke('save-account','X','range_example',null,null,'2026-11-22')"),/invalid-date/);
    await exec(`document.querySelector('[data-tab=accounts]').click();
      document.querySelector('#add').click();
      document.querySelector('#handle').value='range_example';
      const rangeForm=document.querySelector('#account-form');
      rangeForm.elements.range.value='between';
      rangeForm.dispatchEvent(new Event('change'));
      document.querySelector('#since').value='22/11/2026';
      document.querySelector('#until').value='31/11/2026';
      rangeForm.requestSubmit();`);
    assert.match(await exec('document.querySelector("#form-error").textContent'),/DD\/MM\/YYYY/);
    await exec(`document.querySelector('#until').value='22/11/2026';
      rangeForm.requestSubmit();`);
    await until('document.querySelector("#targets").textContent.includes("22/11/2026 – 22/11/2026")');
    const rangeAccount=JSON.parse(fs.readFileSync(stateFile,'utf8')).accounts.find(account=>account.handle==='range_example');
    assert.deepEqual([rangeAccount.since,rangeAccount.until],['2026-11-22','2026-11-22']);
    await exec(`[...document.querySelectorAll('#targets .account-row')].find(row=>row.textContent.includes('@range_example'))
      .querySelector('.actions button').click();`);
    assert.deepEqual(await exec(`[rangeForm.elements.range.value,document.querySelector('#since').value,document.querySelector('#until').value]`),
      ['between','22/11/2026','22/11/2026']);
    await exec('document.querySelector("#cancel-form").click()');
    fs.rmSync(sample+'.blocked',{force:true});
    fs.writeFileSync(sample,JSON.stringify(['2026-11-22 16:00:00','2026-11-21 15:59:59','2026-11-21 16:00:00','2026-11-22 15:59:59']
      .map((date,index)=>[2,{tweet_id:String(701+index),author:{name:'range_example',id:'77'},content:'Range fixture '+index,date}])));
    fs.copyFileSync(sample,sample+'.search');
    await exec('sns.invoke("start","X:range_example",false)');
    await until('sns.invoke("state").then(s=>!s.job && s.accounts.find(a=>a.key==="X:range_example")?.result?.phase==="complete")');
    const rangedPosts=(await scan(path.join(fixture,'SNSDownloader'))).filter(post=>post.account==='range_example');
    assert.deepEqual(rangedPosts.map(post=>post.id).sort(),['703','704']);
    assert.equal((await exec('sns.invoke("state")')).accounts.find(a=>a.key==='X:range_example').result.counts.added,2);
    await archive({platform:'X',account:'range_example',accountId:'77',id:'701',kind:'post',
      date:'2026-11-22T16:00:00Z',text:'Previously archived outside the date range',expected:1,media:[]},
      {root:path.join(fixture,'SNSDownloader'),signal:new AbortController().signal});
    await exec('sns.invoke("start","X:range_example",true)');
    await until('sns.invoke("state").then(s=>!s.job)');
    const afterRetry=(await exec('sns.invoke("state")')).accounts.find(a=>a.key==='X:range_example');
    assert.equal(afterRetry.result.counts.limited,0,'Retry must not count gaps outside the selected dates');
    assert.equal((await scan(path.join(fixture,'SNSDownloader'))).find(post=>post.account==='range_example' && post.id==='701').missing,1);
    await exec("sns.invoke('save-account','X','range_example','2018-09-01','X:range_example','2018-09-30')");
    fs.rmSync(sample+'.search-url',{force:true});
    fs.writeFileSync(sample+'.timeline-limited','');
    fs.writeFileSync(sample+'.search',JSON.stringify(['2018-08-31 15:59:59','2018-09-30 00:49:56','2018-09-30 16:00:00']
      .map((date,index)=>[2,{tweet_id:String(801+index),author:{name:'range_example',id:'77'},content:'Historical fixture '+index,date}])));
    await exec('sns.invoke("start","X:range_example",false)');
    await until('sns.invoke("state").then(s=>!s.job)');
    assert.equal(fs.existsSync(sample+'.timeline-called'),false,'Signed date search must not start at the profile timeline');
    const searchUrl=new URL(fs.readFileSync(sample+'.search-url','utf8'));
    assert.equal(searchUrl.searchParams.get('q'),'from:range_example since:2018-08-31 until:2018-10-01');
    assert.match(fs.readFileSync(sample+'.search-args','utf8'),/extractor\.twitter\.ratelimit=abort/);
    const historical=(await scan(path.join(fixture,'SNSDownloader'))).filter(post=>post.date?.startsWith('2018'));
    assert.deepEqual(historical.map(post=>post.id),['802']);
    const historicalState=(await exec('sns.invoke("state")')).accounts.find(a=>a.key==='X:range_example');
    assert.equal(historicalState.result.counts.added,1);
    fs.writeFileSync(sample+'.search','[]');
    await exec('sns.invoke("start","X:range_example",false)');
    await until('sns.invoke("state").then(s=>!s.job)');
    const empty=(await exec('sns.invoke("state")')).accounts.find(a=>a.key==='X:range_example').result;
    assert.equal(empty.phase,'failed');
    assert.ok(empty.reasons.includes('x-date-unverified'));
    assert.equal(empty.success,historicalState.result.success);
    fs.writeFileSync(sample+'.search',JSON.stringify([
      [2,{tweet_id:'804',author:{name:'range_example',id:'77'},content:'Before 429',date:'2018-09-28 00:00:00'}],
      [-1,{error:'AbortExtraction',message:'Rate limit exceeded'}]
    ]));
    await exec('sns.invoke("start","X:range_example",false)');
    const stopDuringCooldown=async()=>{
      await until('sns.invoke("state").then(s=>s.accounts.find(a=>a.key==="X:range_example").result.xHistory?.state==="cooldown")');
      await exec('sns.invoke("control","stop")');
      await until('sns.invoke("state").then(s=>!s.job)');
    };
    await stopDuringCooldown();
    assert.ok((await scan(path.join(fixture,'SNSDownloader'))).some(post=>post.id==='804'));
    assert.equal(fs.existsSync(sample+'.timeline-called'),false,'Rate-limited search must stop discovery');
    // The archive already contains 2018 records. Automatic history must still search newer gaps.
    fs.rmSync(sample+'.timeline-limited');
    await exec("sns.invoke('save-account','X','range_example',null,'X:range_example',null)");
    const date=new Date(Date.now()-5*86400000).toISOString();
    const oldRow=[2,{tweet_id:'805',author:{name:'range_example',id:'77'},content:'Search-only fixture',date}];
    fs.writeFileSync(sample+'.search',JSON.stringify([oldRow,[-1,{message:'Rate limit exceeded'}]]));
    await exec('sns.invoke("start","X:range_example",false)');
    await stopDuringCooldown();
    const stateAfter=async()=>(await exec('sns.invoke("state")')).accounts.find(a=>a.key==='X:range_example').result;
    const paused=await stateAfter();
    assert.equal(paused.phase,'stopped');
    assert.equal(paused.xHistory.state,'pending');
    assert.ok((await scan(path.join(fixture,'SNSDownloader'))).some(p=>p.id==='805'));
    const pendingQuery=fs.readFileSync(sample+'.search-url','utf8');
    await exec('sns.invoke("start","X:range_example",false)');
    await stopDuringCooldown();
    assert.equal(fs.readFileSync(sample+'.search-url','utf8'),pendingQuery);
    assert.equal((await stateAfter()).counts.added,0);
    fs.writeFileSync(sample+'.auto-old',JSON.stringify([[2,{tweet_id:'806',author:{name:'range_example',id:'77'},
      content:'Historical search-only post',date:'2018-09-30 11:00:00'}]]));
    await exec('sns.invoke("start","X:range_example",false)');
    await until('sns.invoke("state").then(s=>!s.job)');
    assert.equal((await stateAfter()).xHistory.state,'searched');
    assert.ok((await scan(path.join(fixture,'SNSDownloader'))).some(p=>p.id==='806'));
    // Verify since-only X accounts backfill older posts back to the since floor instead of stopping at the timeline cap.
    const recentSince=new Date(Date.now()-35*86400000).toISOString().slice(0,10);
    const oldSinceDate=new Date(Date.now()-20*86400000).toISOString();
    await exec(`sns.invoke('save-account','X','since_only',${JSON.stringify(recentSince)},null,null)`);
    fs.rmSync(sample+'.auto-old',{force:true});
    fs.writeFileSync(sample,JSON.stringify([[2,{tweet_id:'901',author:{name:'since_only',id:'88'},
      content:'Timeline post',date:new Date(Date.now()-86400000).toISOString().slice(0,19).replace('T',' ')}]]));
    fs.writeFileSync(sample+'.search',JSON.stringify([[2,{tweet_id:'902',author:{name:'since_only',id:'88'},
      content:'Backfilled since-only post',date:oldSinceDate.slice(0,19).replace('T',' ')}]]));
    await exec('sns.invoke("start","X:since_only",false)');
    await until('sns.invoke("state").then(s=>!s.job)');
    const sinceOnlyState=(await exec('sns.invoke("state")')).accounts.find(a=>a.key==='X:since_only').result;
    assert.equal(sinceOnlyState.phase,'complete');
    assert.equal(sinceOnlyState.xHistory.state,'searched');
    assert.ok((await scan(path.join(fixture,'SNSDownloader'))).some(p=>p.id==='902'));
    console.log('SNS desktop: all-range and since-only X search found older posts and resumed interrupted history.');
    console.log('SNS desktop: prior flows, signed-in Instagram Web, and X historical date search passed.');
  } catch(error){console.error(error);process.exitCode=1;}
  finally{
    clearTimeout(timeout);
    app.exit(process.exitCode||0);
    fs.rmSync(fixture,{recursive:true,force:true,maxRetries:3,retryDelay:50});
  }
});
