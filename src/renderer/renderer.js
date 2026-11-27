const $=id=>document.getElementById(id), api=window.takaneko.invoke, UI=window.TakanekoUI;
Object.assign(UI.translations,{
  '多媒體瀏覽':'メディア閲覧','資料夾設定':'フォルダー設定','下載位置':'保存先','選擇下載位置':'保存先を選択','瀏覽來源':'閲覧元','選擇瀏覽來源':'閲覧元を選択',
  '新下載存於此處；原有檔案不會搬移。另存檔案時可再選位置。':'新しいダウンロードの保存先です。既存ファイルは移動しません。別名保存時に保存先を変更できます。',
  '內容瀏覽、多媒體瀏覽及本地閱讀器共用此來源。選擇本機或已掛載 NAS 的 archive 資料夾。':'コンテンツ・メディア・ローカルリーダーで共通の閲覧元です。ローカルまたはマウント済み NAS の archive フォルダーを選択します。',
  '瀏覽設定中選定的本機或 NAS archive；可另存原檔。':'設定で選択したローカルまたは NAS の archive を閲覧し、元ファイルを別の場所に保存できます。',
  '另存整篇投稿':'投稿全体を別の場所に保存','開啟投稿資料夾':'投稿フォルダーを開く','下載原檔':'元ファイルを保存','開啟原檔資料夾':'元ファイルのフォルダーを開く',
  '請選擇來源資料夾以外的位置':'閲覧元フォルダーの外を選択してください','下載中，請完成或停止後更改位置':'ダウンロードの完了または停止後に保存先を変更してください',
  '未能讀取或保存檔案，請確認來源與目的地可用':'ファイルを読み取り・保存できません。閲覧元と保存先を確認してください','已另存':'保存しました','已開啟資料夾':'フォルダーを開きました'
});
Object.assign(UI.translations,{
  "尚未開始下載，今次操作已取消。":"ダウンロード開始前に操作をキャンセルしました。",
  "主要功能": "主な機能",
  "查看方式": "表示方法",
  "下載內容": "コンテンツをダウンロード",
  "查看已下載內容": "保存済みコンテンツを見る",
  "相片與影片": "写真・動画",
  "相片集": "ギャラリー",
  "將 Fanclub 內容存到電腦": "Fanclub のコンテンツをパソコンに保存",
  "跟住下面三步做，就可以開始下載。": "以下の3ステップでダウンロードできます。",
  "登入 Fanclub 帳戶": "Fanclub にログイン",
  "確認下載位置": "保存先を確認",
  "開始下載": "ダウンロード開始",
  "先開啟登入視窗。登入完成後，返嚟按「檢查登入狀態」。": "ログイン画面を開いてログインした後、ここに戻って「ログイン情報を確認」を押してください。",
  "開啟登入視窗": "ログイン画面を開く",
  "我已登入，檢查登入狀態": "ログイン済み・ログイン情報を確認",
  "下載內容會儲存到：": "コンテンツの保存先：",
  "更改位置": "保存先を変更",
  "更改下載範圍": "ダウンロード対象を変更",
  "下載範圍：": "ダウンロード対象：",
  "下載範圍": "ダウンロード対象",
  "暫停下載": "一時停止",
  "停止下載": "ダウンロードを停止",
  "繼續下載": "ダウンロードを再開",
  "開啟下載資料夾": "保存先フォルダーを開く",
  "完成登入後，就可以開始下載。": "ログイン情報を登録するとダウンロードできます。",
  "尚未開始下載": "ダウンロードは未開始です",
  "下載進度會顯示喺下面。": "ここにダウンロード状況が表示されます。",
  "查看詳細進度": "詳しい進捗を表示",
  "進階設定": "詳細設定",
  "同時下載數量": "同時ダウンロード数",
  "建議保留 5。影片同時最多下載 2 個。": "推奨値は5です。動画は同時に最大2件です。",
  "登入帳戶": "アカウントにログイン",
  "登入同下載位置已放喺下載頁面。": "ログインと保存先はダウンロード画面にあります。",
  "前往下載頁面": "ダウンロード画面へ",
  "查看已下載內容嘅位置": "保存済みコンテンツの参照先",
  "預設查看下載位置。亦可以選擇本機或已連接 NAS 嘅 archive 資料夾；原有檔案不會搬移。": "初期設定では保存先を参照します。パソコンまたは接続済み NAS の archive フォルダーも選べます。既存ファイルは移動しません。",
  "投稿會自動包括在內。其他內容可以自行選擇。": "投稿は常に対象です。他の種類は自由に選べます。",
  "呢度暫時冇內容。試下更改篩選條件，或者到設定選擇有下載內容嘅資料夾。": "表示するコンテンツがありません。絞り込み条件を変更するか、設定から保存済みフォルダーを選んでください。",
  "下載期間可以暫停，或者停止今次下載。": "ダウンロード中は一時停止または停止できます。",
  "已準備好。按「開始下載」即可。": "準備ができました。「ダウンロード開始」を押してください。",
  "已儲存登入資料": "ログイン情報を保存済み",
  "已有登入資料，可以嘗試下載。如果提示登入失效，請重新登入。": "ログイン情報は保存済みです。ダウンロードを試せます。ログイン切れの場合は再ログインしてください。",
  "登入完成後，返嚟按「檢查登入狀態」。": "ログイン後、ここに戻ってログイン情報を確認してください。",
  "未能開啟登入視窗，請再試一次。": "ログイン画面を開けませんでした。もう一度お試しください。",
  "正在檢查登入資料，請稍候。": "ログイン情報を確認しています。お待ちください。",
  "已儲存登入資料，可以開始下載。": "ログイン情報を保存しました。ダウンロードできます。",
  "未取得登入資料。請先開啟登入視窗並完成登入，再按檢查。": "ログイン情報を取得できませんでした。ログイン画面でログイン後、もう一度確認してください。",
  "未能取得登入資料。請重新開啟登入視窗，完成登入後再檢查。": "ログイン情報を取得できませんでした。ログイン画面を開き直し、ログイン後に再確認してください。",
  "設定未能儲存，請再試一次。": "設定を保存できませんでした。再度お試しください。",
  "正在準備下載": "ダウンロードの準備中",
  "正在儲存設定及取得內容清單，請稍候。": "設定を保存し、一覧を取得しています。お待ちください。",
  "下載已完成": "ダウンロードが完了しました",
  "可以開啟下載資料夾查看檔案。": "保存先フォルダーを開いてファイルを確認できます。",
  "下載已停止": "ダウンロードを停止しました",
  "今次下載已停止。可以查看已儲存嘅檔案，或者重新開始下載。": "ダウンロードを停止しました。保存済みファイルを確認するか、改めて開始できます。",
  "需要登入帳戶": "ログインが必要です",
  "請先開啟登入視窗，登入後再檢查登入狀態。": "ログイン画面でログイン後、ログイン情報を確認してください。",
  "下載未完成": "ダウンロードは完了していません",
  "請查看下面嘅失敗詳情。檢查網絡、登入資料或下載位置後，再開始下載。": "以下のエラー詳細を確認してください。通信、ログイン情報、保存先を確認してから改めて開始してください。",
  "未能啟動或確認下載結果。請檢查設定及下載資料夾，再決定下一步。": "開始または結果の確認ができませんでした。設定と保存先を確認してから次の操作を行ってください。",
  "未能讀取登入狀態，請重新開啟應用程式。": "ログイン状態を読み取れません。アプリを開き直してください。",
  "下載已暫停": "ダウンロードを一時停止しました",
  "正在下載": "ダウンロード中",
  "按「繼續下載」就可以接住下載。": "「ダウンロードを再開」を押すと続けられます。",
  "正在下載內容，請稍候。": "コンテンツをダウンロードしています。お待ちください。",
  "未能確認暫停狀態，請查看下載進度。": "一時停止の状態を確認できません。進捗を確認してください。",
  "正在停止下載": "ダウンロードを停止中",
  "請稍候，等目前工作結束。": "現在の処理が終わるまでお待ちください。",
  "未能確認停止狀態，請稍候並查看進度。": "停止状態を確認できません。しばらく待って進捗を確認してください。",
  "未能開啟資料夾，請確認下載位置仍然可用。": "フォルダーを開けません。保存先が利用可能か確認してください。",
  "正在處理內容，詳細進度會持續更新。": "処理中です。詳しい進捗は随時更新されます。",
  "未能載入設定，請重新開啟應用程式。": "設定を読み込めません。アプリを開き直してください。"
});
let view='downloads',offset=0,serial=0,paused=false,running=false,rows=[],mediaIndex=-1,lastProgress=null;
let indexing=0,detailMode='reader',detailKey='',actionRunning=false;
const collectionViews=['browse','media','reader'];
function indexingState(delta){indexing+=delta;const active=indexing>0;$('scanProgress').hidden=!active;$('collection').setAttribute('aria-busy',String(active));$('posts').setAttribute('aria-busy',String(active));$('refresh').disabled=$('choose').disabled=active;}
const readerMode=()=>'reader';
function notice(text){$('notice').hidden=!text;$('notice').textContent=text;}
let credentials=false,checkingLogin=false,stopping=false,jobStarted=false;
function syncDownloadControls(){
  $('start').disabled=running||checkingLogin||!credentials;
  $('startHelp').textContent=running?'下載期間可以暫停，或者停止今次下載。':credentials?'已準備好。按「開始下載」即可。':'完成登入後，就可以開始下載。';
  $('pause').disabled=!running||!jobStarted||stopping;
  $('stop').disabled=!running||stopping;
  for(const id of ['chooseDownload','login','blogs','gallery','movies','concurrency','editScope'])$(id).disabled=running;
  $('capture').disabled=running||checkingLogin;
  $('settingsForm').querySelector('button').disabled=running;
}
async function loginStatus(){
  credentials=await api('get-login-status');
  $('loginStatus').textContent=credentials?'已儲存登入資料':'尚未登入';
  $('loginHelp').textContent=credentials?'已有登入資料，可以嘗試下載。如果提示登入失效，請重新登入。':'先開啟登入視窗。登入完成後，返嚟按「檢查登入狀態」。';
  $('login').className=credentials?'secondary':'';
  syncDownloadControls();
}
function busy(active){running=active;syncDownloadControls();}
function jobMessage(title,help){$('jobStatus').textContent=title;$('jobHelp').textContent=help;}
function scopeSummary(){
  const labels=['投稿'];for(const [id,label] of [['blogs','經理人部落格'],['gallery','相片集'],['movies','影片']])if($(id).checked)labels.push(label);
  $('scopeSummary').textContent='下載範圍：'+labels.join('、');
}
async function save(){const value={concurrency:Number($('concurrency').value),blogs:$('blogs').checked,gallery:$('gallery').checked,movies:$('movies').checked};const saved=await api('save-v2-settings',value);$('concurrency').value=saved.concurrency;scopeSummary();}
async function load(scan=false){
  const request=++serial,mode=readerMode();indexingState(1);
  try {
  if(scan)await api('reader-scan',mode);
  const result=await api('reader-query',mode,{member:$('member').value,kind:$('kind').value,type:$('mode').value,multimedia:$('mode').value!=='posts',offset});
  if(request!==serial)return;
  rows=result.rows;$('root').textContent=result.root;$('scanStatus').textContent=result.offline?'離線：顯示先前索引':result.warnings?'部分內容無法讀取':result.source==='catalog'?'已載入共用索引':'';
  const selected=$('member').value;$('member').replaceChildren(new Option('全部成員',''),...result.members.map(m=>new Option(m,m)));$('member').value=selected;
  $('posts').replaceChildren();$('empty').hidden=rows.length>0;
  rows.forEach((row,index)=>{
    const card=document.createElement('button');card.className='post';card.setAttribute('data-content','');
    const url=row.cover || (row.mime?.startsWith('image/') && row.available?row.url:null);
    if(url){const img=document.createElement('img');img.src=url;img.loading='lazy';img.alt='';card.append(img);}else{const placeholder=document.createElement('div');placeholder.className='placeholder';placeholder.textContent=row.mime?.startsWith('video/')?'▶':'T';card.append(placeholder);}
    const info=document.createElement('div');info.className='post-info';const title=document.createElement('h3');title.textContent=row.title;const meta=document.createElement('small');meta.textContent=`${row.member} · ${UI.date(row.date)}`;info.append(title,meta);card.append(info);
    card.onclick=()=>row.mime?showMedia(index):showPost(row.key);$('posts').append(card);
  });
  $('previous').disabled=offset===0;$('next').disabled=!result.hasMore;$('count').textContent=`${rows.length?offset+1:0}–${offset+rows.length} / ${result.total}`;
  } catch(error){if(request===serial)$('scanStatus').textContent='無法讀取資料夾';throw error;} finally {indexingState(-1);}
}
function mediaElement(item){if(!item.available){const p=document.createElement('p');p.textContent='未能讀取';return p;}const element=document.createElement(item.mime.startsWith('video/')?'video':'img');element.src=item.url;element.onerror=()=>{const message=document.createElement('p');message.textContent=UI.t('未能讀取');element.onerror=null;if(element.tagName==='VIDEO')element.after(message);else element.replaceWith(message);};if(element.tagName==='VIDEO'){element.controls=true;element.preload='metadata';}else element.alt='';return element;}
function actionMessage(result){return result.error==='SOURCE_READ_ONLY'?'請選擇來源資料夾以外的位置':result.error==='LOCATION_BUSY'?'下載中，請完成或停止後更改位置':result.error?'未能讀取或保存檔案，請確認來源與目的地可用':result.saved?'已另存':result.opened?'已開啟資料夾':'';}
async function archiveAction(action,id,button){
  if(actionRunning)return;
  actionRunning=true;button.disabled=true;$('actionStatus').textContent=UI.t('處理中');
  try{const result=await api('archive-action',detailMode,action,id);$('actionStatus').textContent=UI.t(actionMessage(result));}
  catch{$('actionStatus').textContent=UI.t('未能讀取或保存檔案，請確認來源與目的地可用');}
  finally{actionRunning=false;button.disabled=false;}
}
function mediaCard(item){
  const figure=document.createElement('figure');figure.className='media-item';figure.append(mediaElement(item));
  const actions=document.createElement('div');actions.className='actions';
  for(const [action,label] of [['save-media','下載原檔'],['reveal-media','開啟原檔資料夾']]){
    const button=document.createElement('button');button.className='quiet';button.textContent=UI.t(label);button.disabled=!item.available;button.onclick=()=>archiveAction(action,item.id,button);actions.append(button);
  }
  figure.append(actions);return figure;
}
async function showPost(key){
  const mode=readerMode(),request=serial,post=await api('reader-detail',mode,key);if(!post || request!==serial)return;
  detailMode=mode;detailKey=key;$('actionStatus').textContent='';$('detailTitle').textContent=post.title;
  $('detailBody').textContent=post.bodyAvailable===false?UI.t('未能讀取'):post.body;
  $('detailMedia').replaceChildren(...post.media.map(mediaCard));
  for(const id of ['mediaPrevious','mediaNext','mediaPost'])$(id).hidden=true;
  if(!$('detail').open)$('detail').showModal();
}
function showMedia(index){
  mediaIndex=index;const item=rows[index];detailMode=readerMode();detailKey=item.key;
  $('actionStatus').textContent='';$('detailTitle').textContent=item.title;$('detailBody').textContent='';$('detailMedia').replaceChildren(mediaCard(item));
  for(const id of ['mediaPrevious','mediaNext','mediaPost'])$(id).hidden=false;
  $('mediaPrevious').disabled=index===0;$('mediaNext').disabled=index===rows.length-1;if(!$('detail').open)$('detail').showModal();
}
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=async()=>{
  view=button.dataset.view;offset=0;serial++;$('detail').close();notice('');
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===view || (b.closest('.page-nav') && b.dataset.view==='browse' && collectionViews.includes(view)))));
  $('downloads').hidden=view!=='downloads';$('settings').hidden=view!=='settings';$('collection').hidden=!collectionViews.includes(view);
  $('modeLabel').hidden=view==='browse';$('mode').options[0].hidden=view==='media';$('mode').value=view==='media'?'all':'posts';
  $('collectionHeading').textContent=view==='reader'?'本地閱讀器':view==='media'?'多媒體瀏覽':'內容瀏覽';
  if(collectionViews.includes(view))try{await load(true);}catch{notice('無法讀取資料夾');}
});
async function folderSettings(){const settings=await api('get-folder-settings');$('downloadRoot').textContent=settings.downloadRoot;$('readerRoot').textContent=settings.readerRoot;}
$('chooseDownload').onclick=async()=>{try{const result=await api('download-folder-select');await folderSettings();notice(result.error?actionMessage(result):result.cancelled?'':'設定已儲存');}catch{notice('無法讀取資料夾');}};
$('savePost').onclick=()=>archiveAction('save-post',detailKey,$('savePost'));
$('revealPost').onclick=()=>archiveAction('reveal-post',detailKey,$('revealPost'));
$('login').onclick=async()=>{try{await api('open-login');notice('登入完成後，返嚟按「檢查登入狀態」。');}catch{notice('未能開啟登入視窗，請再試一次。');}};
$('capture').onclick=async()=>{
  if(checkingLogin||running)return;checkingLogin=true;syncDownloadControls();notice('正在檢查登入資料，請稍候。');
  try{const result=await api('capture-token');notice(result.success?'已儲存登入資料，可以開始下載。':'未取得登入資料。請先開啟登入視窗並完成登入，再按檢查。');await loginStatus();}
  catch{notice('未能取得登入資料。請重新開啟登入視窗，完成登入後再檢查。');}
  finally{checkingLogin=false;syncDownloadControls();}
};
$('settingsForm').onsubmit=async event=>{event.preventDefault();if(running)return;try{await save();notice('設定已儲存');}catch{notice('設定未能儲存，請再試一次。');}};
$('editScope').onclick=()=>{document.querySelector('[data-view="settings"]').click();$('settingsForm').scrollIntoView({block:'center'});$('blogs').focus();};
$('backToDownload').onclick=()=>document.querySelector('[data-view="downloads"]').click();
$('start').onclick=async()=>{
  if(running||checkingLogin||!credentials)return;
  jobStarted=false;paused=false;stopping=false;busy(true);$('pause').textContent='暫停下載';notice('');
  jobMessage('正在準備下載','正在儲存設定及取得內容清單，請稍候。');
  $('progressDetails').open=true;$('downloadHeading').scrollIntoView({block:'start'});lastProgress=null;UI.progress($('stages'));UI.errors($('downloadErrors'),[]);
  try{
    await save();
    if(stopping){jobMessage('下載已停止','尚未開始下載，今次操作已取消。');return;}
    jobStarted=true;syncDownloadControls();const result=await api('start-download');
    if(result.status==='completed')jobMessage('下載已完成','可以開啟下載資料夾查看檔案。');
    else if(result.status==='cancelled')jobMessage('下載已停止','今次下載已停止。可以查看已儲存嘅檔案，或者重新開始下載。');
    else if(result.status==='loginRequired'){credentials=false;jobMessage('需要登入帳戶','請先開啟登入視窗，登入後再檢查登入狀態。');}
    else jobMessage('下載未完成','請查看下面嘅失敗詳情。檢查網絡、登入資料或下載位置後，再開始下載。');
  }catch{jobMessage('下載未完成','未能啟動或確認下載結果。請檢查設定及下載資料夾，再決定下一步。');}
  finally{jobStarted=false;stopping=false;busy(false);try{await loginStatus();}catch{credentials=false;syncDownloadControls();notice('未能讀取登入狀態，請重新開啟應用程式。');}}
};
$('pause').onclick=async()=>{
  if(!running||stopping)return;$('pause').disabled=true;
  try{await api(paused?'control-resume':'control-pause');paused=!paused;$('pause').textContent=paused?'繼續下載':'暫停下載';jobMessage(paused?'下載已暫停':'正在下載',paused?'按「繼續下載」就可以接住下載。':'正在下載內容，請稍候。');}
  catch{notice('未能確認暫停狀態，請查看下載進度。');}finally{syncDownloadControls();}
};
$('stop').onclick=async()=>{
  if(!running||stopping)return;stopping=true;syncDownloadControls();jobMessage('正在停止下載','請稍候，等目前工作結束。');
  if(!jobStarted)return;
  try{await api('control-cancel');}catch{stopping=false;syncDownloadControls();notice('未能確認停止狀態，請稍候並查看進度。');}
};
$('folder').onclick=async()=>{try{await api('open-exported-folder');}catch{notice('未能開啟資料夾，請確認下載位置仍然可用。');}};
$('choose').onclick=async()=>{indexingState(1);try{const result=await api('reader-select');if(result){offset=0;serial++;await folderSettings();notice('設定已儲存');}}catch{notice('無法讀取資料夾');}finally{indexingState(-1);}};$('refresh').onclick=()=>load(true).catch(()=>notice('無法讀取資料夾'));
for(const id of ['blogs','gallery','movies'])$(id).addEventListener('change',scopeSummary);
for(const id of ['member','kind','mode'])$(id).onchange=()=>{offset=0;load();};$('previous').onclick=()=>{offset=Math.max(0,offset-48);load();};$('next').onclick=()=>{offset+=48;load();};
$('close').onclick=()=>$('detail').close();$('detail').onclose=()=>$('detailMedia').replaceChildren();$('mediaPrevious').onclick=()=>showMedia(mediaIndex-1);$('mediaNext').onclick=()=>showMedia(mediaIndex+1);$('mediaPost').onclick=()=>showPost(rows[mediaIndex].key);
window.takaneko.onProgress(p=>{lastProgress=p;UI.progress($('stages'),p);UI.errors($('downloadErrors'),p.errors);if(running&&!paused&&!stopping){jobMessage('正在下載','正在處理內容，詳細進度會持續更新。');}});window.addEventListener('languagechange',()=>{UI.progress($('stages'),lastProgress);if(collectionViews.includes(view))load();});
setInterval(()=>{if(collectionViews.includes(view) && !indexing && !$('detail').open)load(true).catch(()=>notice('無法讀取資料夾'));},60000);
(async()=>{UI.init();UI.progress($('stages'));UI.errors($('downloadErrors'),await api('get-download-errors'));document.querySelector('[data-view="downloads"]').setAttribute('aria-selected','true');const info=await api('get-app-info');$('version').textContent=`${info.name} v${info.version}`;$('footerVersion').textContent=`v${info.version}`;const settings=await api('get-download-settings');$('concurrency').value=settings.concurrency;for(const key of ['blogs','gallery','movies']){const legacy=localStorage.getItem('backup'+key[0].toUpperCase()+key.slice(1));$(key).checked=settings.needsMigration && legacy!==null?legacy==='true':settings[key];}if(settings.needsMigration)await save();scopeSummary();await folderSettings();await loginStatus();})().catch(()=>{notice('未能載入設定，請重新開啟應用程式。');});

const youtubeSettings=mountYouTubeSettings($('settings'),value=>api('youtube-cookies',value),key=>api('open-youtube-help',key));
youtubeSettings.refresh();
