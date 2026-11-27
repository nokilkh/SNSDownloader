const $=id=>document.getElementById(id);
const call=(name,...args)=>window.sns.invoke(name,...args);
const translations={
  en:{
    '主選單':'Main navigation','備份帳戶':'Accounts','已下載內容':'Library','設定':'Settings','新增備份帳戶':'Add Account',
    '更新全部帳戶':'Update All','儲存位置':'Storage Location','更改位置':'Change Folder','暫停':'Pause','停止':'Stop',
    '全部':'All','重新掃描':'Rescan','選擇瀏覽來源':'Choose Folder','搜尋貼文文字或 ALT':'Search post text or ALT',
    '開啟日曆':'Open calendar','請以 DD/MM/YYYY 格式輸入有效日期。':'Enter a valid date in DD/MM/YYYY format.',
    '開始日期':'Start Date','結束日期':'End Date','圖片':'Images','影片':'Videos','只顯示有 ALT':'With ALT only',
    '全部平台':'All Platforms','全部帳號':'All Accounts','帳號':'Account','分類':'Type','純文字':'Text Only',
    '排序':'Sort','最新到最舊':'Newest first','最舊到最新':'Oldest first','香港時間 UTC+08:00':'Hong Kong Time UTC+08:00',
    '返回貼文列表':'Back to Posts','顯示更多貼文':'Show More Posts','無日期':'No date','無貼文文字':'No post text',
    '尚無已下載貼文。':'No downloaded posts yet.','找不到符合條件的貼文。請嘗試更改篩選條件。':'No posts match your filters. Try adjusting your criteria.',
    '清除篩選':'Clear Filters','平台登入身份':'Platform Logins','備份儲存位置':'Backup Storage Location',
    '平台':'Platform','帳號 ID 或個人頁連結':'Account handle or profile URL','備份範圍':'Backup Scope',
    '全部可取得內容':'All available content','指定日期之後':'From a specific date','儲存帳戶':'Save Account','取消':'Cancel',
    '指定日期範圍':'Specific date range','按香港時間計算，開始與結束日期皆包含當日。':'Based on Hong Kong Time; both start and end dates are inclusive.',
    '結束日期須等於或晚於開始日期。':'End date must be on or after the start date.',
    '移出備份清單？':'Remove from backup list?','移出清單，保留檔案':'Remove from list, keep files',
    '選擇一個帳戶更新，或手動更新全部；完整媒體會跳過。':'Choose an account to update, or update all manually; complete media will be skipped.',
    '預設先嘗試免登入。需要時可在網站視窗登入，每個平台可使用一個登入身份備份多個帳戶。':'Public access is tried first by default. Sign in via the site window when needed; one login per platform can back up multiple accounts.',
    '更換位置只影響新下載，舊檔案保留在原位。':'Changing the location only affects new downloads; existing files stay where they are.',
    '包含所選當日，香港時間 00:00 起。':'Includes the selected day starting at 00:00 Hong Kong Time.',
    '已下載內容、舊版本與登入資料將會保留。':'Downloaded content, previous versions, and login data will be kept.',
    '更新':'Update','範圍設定':'Scope Settings','查看結果':'View Results',
    '移出清單':'Remove','未開始':'Not Started','進行中':'In Progress','部分完成':'Partially Complete','本次完成':'Complete','未能備份':'Backup Failed','已停止':'Stopped',
    '最近嘗試':'Last attempt','最近成功':'Last success','新增貼文（篇）':'New posts','跳過媒體（檔）':'Skipped media',
    '文字／ALT 更新（篇）':'Text / ALT updated','畫質升級（檔）':'Quality upgraded','失敗項目（個）':'Failed','受限項目（個）':'Limited',
    '貼上連結備份':'Back Up by Link','X、Instagram 或 TikTok 原文連結':'X, Instagram, or TikTok post link',
    '備份此篇貼文':'Back Up Post','存入目前的備份位置，已保存的完整媒體會跳過。':'Saved to the current backup location; already saved complete media will be skipped.',
    '正在讀取貼文':'Reading post','請貼上有效的 X、Instagram 或 TikTok 貼文連結。':'Paste a valid X, Instagram, or TikTok post link.',
    '請等待目前的備份完成後，再試一次。':'Wait for the current backup to finish, then try again.',
    '失敗與受限的貼文':'Failed and limited posts','開啟原文':'Open Original','複製連結':'Copy Link',
    '已複製連結':'Link copied','未取得原文連結':'Original link unavailable',
    '未能讀取的清單項目，未取得原文連結。':'Items that could not be read from the listing do not have an original link.',
    '本次結果沒有原文連結記錄。':'No original links were recorded for this run.',
    '開啟登入視窗':'Open Sign-In Window','重新檢查':'Recheck','清除登入資料':'Clear Login','繼續更新':'Resume',
    '貼上 X 登入資料':'Paste X Login Data',
    '在 Chrome 登入 x.com，開啟開發人員工具 → Application → Storage → Cookies → https://x.com。按 Name 尋找 auth_token 與 ct0，分別複製 Value，貼入下方同名欄位，再按「儲存並測試讀取」。':'Sign in to x.com in Chrome, open DevTools → Application → Storage → Cookies → https://x.com. Find auth_token and ct0 by Name, copy each Value into the matching field below, then click "Save and Test".',
    '儲存並測試讀取':'Save and Test',
    '請分別貼上 auth_token 與 ct0 的完整 Value。':'Paste the complete Value for both auth_token and ct0.',
    '請等待目前的備份完成後，再儲存登入資料。':'Wait for the current backup to finish before saving login data.',
    '未能儲存登入資料。':'Could not save login data.',
    '最新版本':'Latest version','舊版本':'Previous version','貼文文字':'Post Text','原文連結':'Original Post','開啟資料夾':'Open Folder',
    '另存整篇':'Save Post','另存原檔':'Save Original File','複製 ALT':'Copy ALT',
    '尚未有備份帳戶。請按「新增備份帳戶」開始。':'No backup accounts yet. Click "Add Account" to get started.',
    '正在掃描備份資料夾…':'Scanning backup folder…','媒體缺失或未下載':'Media missing or not downloaded',
    '最高畫質未能確認':'Highest quality unverified',
    '正在停止':'Stopping','等待目前檔案完成':'Waiting for current file to finish','已暫停':'Paused','正在核對帳戶清單':'Checking account listing',
    '正在保存貼文與媒體':'Saving posts and media','正在檢查儲存位置':'Checking storage location',
    '查看舊版本':'View previous versions','按「更新」後才會開始備份。':'Backup will start once you click Update.',
    '未登入，可先嘗試公開內容':'Not signed in; public content can be tried first','等待您完成網站登入':'Waiting for you to finish signing in on the site',
    '登入資料已取得，待驗證':'Login data captured, pending verification','正在驗證下載存取':'Verifying download access',
    '下載存取已驗證':'Download access verified','登入存取未能驗證，請重新登入或檢查。':'Could not verify login access. Sign in again or recheck.',
    '系統加密暫時不可用':'System encryption is currently unavailable','已完成操作。':'Done.',
    '儲存位置不可用，請重新連接或更改位置。':'Storage location is unavailable. Reconnect it or choose another folder.',
    '請輸入有效的帳號或個人頁連結。':'Enter a valid account handle or profile URL.',
    '請選擇有效日期。':'Select a valid date.',
    '操作未能完成，請檢查設定後再試。':'The operation could not be completed. Check your settings and try again.'
  },
  ja:{
    '主選單':'メインメニュー','備份帳戶':'バックアップ対象','已下載內容':'ライブラリ','設定':'設定','新增備份帳戶':'アカウントを追加',
    '更新全部帳戶':'すべて更新','儲存位置':'保存先','更改位置':'保存先を変更','暫停':'一時停止','停止':'停止',
    '全部':'すべて','重新掃描':'再読み込み','選擇瀏覽來源':'フォルダーを選択','搜尋貼文文字或 ALT':'本文・ALT を検索',
    '開啟日曆':'カレンダーを開く','請以 DD/MM/YYYY 格式輸入有效日期。':'有効な日付を DD/MM/YYYY 形式で入力してください。',
    '開始日期':'開始日','結束日期':'終了日','圖片':'画像','影片':'動画','只顯示有 ALT':'ALT 付きのみ',
    '全部平台':'すべてのサービス','全部帳號':'すべてのアカウント','帳號':'アカウント','分類':'種類','純文字':'テキストのみ',
    '排序':'並び順','最新到最舊':'新しい順','最舊到最新':'古い順','香港時間 UTC+08:00':'香港時間 UTC+08:00',
    '返回貼文列表':'投稿一覧に戻る','顯示更多貼文':'さらに表示','無日期':'日付不明','無貼文文字':'本文なし',
    '尚無已下載貼文。':'保存済みの投稿はありません。','找不到符合條件的貼文。請嘗試更改篩選條件。':'一致する投稿がありません。絞り込み条件を変更してください。',
    '清除篩選':'絞り込みを解除','平台登入身份':'サービスのログイン','備份儲存位置':'バックアップの保存先',
    '平台':'サービス','帳號 ID 或個人頁連結':'アカウント名またはプロフィール URL','備份範圍':'取得範囲',
    '全部可取得內容':'取得可能な全件','指定日期之後':'指定日以降','儲存帳戶':'保存','取消':'キャンセル',
    '指定日期範圍':'期間を指定','按香港時間計算，開始與結束日期皆包含當日。':'香港時間で、開始日と終了日を含みます。',
    '結束日期須等於或晚於開始日期。':'終了日は開始日以降の日付を選んでください。',
    '移出備份清單？':'一覧から削除しますか？','移出清單，保留檔案':'ファイルを残して一覧から削除',
    '選擇一個帳戶更新，或手動更新全部；完整媒體會跳過。':'個別または一括で更新できます。保存済みのファイルはスキップします。',
    '預設先嘗試免登入。需要時可在網站視窗登入，每個平台可使用一個登入身份備份多個帳戶。':'まずログインせずに試します。必要な場合は専用のサイト画面でログインしてください。',
    '更換位置只影響新下載，舊檔案保留在原位。':'変更は新しいダウンロードに適用されます。既存のファイルは移動しません。',
    '包含所選當日，香港時間 00:00 起。':'指定日の午前0時（香港時間）から含みます。',
    '已下載內容、舊版本與登入資料將會保留。':'保存した内容、過去の版、ログイン情報は保持されます。',
    '更新':'更新','範圍設定':'範囲を設定','查看結果':'結果を表示',
    '移出清單':'一覧から外す','未開始':'未実行','進行中':'実行中','部分完成':'一部完了','本次完成':'今回の更新完了','未能備份':'バックアップ失敗','已停止':'停止済み',
    '最近嘗試':'最終実行','最近成功':'最終成功','新增貼文（篇）':'新規投稿','跳過媒體（檔）':'スキップしたファイル',
    '文字／ALT 更新（篇）':'本文・ALT の更新','畫質升級（檔）':'画質向上','失敗項目（個）':'失敗','受限項目（個）':'制限あり',
    '貼上連結備份':'投稿リンクからバックアップ','X、Instagram 或 TikTok 原文連結':'X、Instagram、TikTok の投稿リンク',
    '備份此篇貼文':'この投稿を保存','存入目前的備份位置，已保存的完整媒體會跳過。':'現在の保存先に保存します。保存済みの完全なファイルはスキップします。',
    '正在讀取貼文':'投稿を取得中','請貼上有效的 X、Instagram 或 TikTok 貼文連結。':'有効な X、Instagram、TikTok の投稿リンクを貼り付けてください。',
    '請等待目前的備份完成後，再試一次。':'処理中のバックアップが終わってからお試しください。',
    '失敗與受限的貼文':'失敗または制限のあった投稿','開啟原文':'元の投稿を開く','複製連結':'リンクをコピー',
    '已複製連結':'リンクをコピーしました','未取得原文連結':'投稿リンクを取得できませんでした',
    '未能讀取的清單項目，未取得原文連結。':'一覧から取得できなかった項目には、投稿リンクがありません。',
    '本次結果沒有原文連結記錄。':'この実行結果には投稿リンクの記録がありません。',
    '開啟登入視窗':'ログイン画面を開く','重新檢查':'再確認','清除登入資料':'ログイン情報を消去','繼續更新':'再開',
    '貼上 X 登入資料':'X のログイン情報を貼り付ける',
    '在 Chrome 登入 x.com，開啟開發人員工具 → Application → Storage → Cookies → https://x.com。按 Name 尋找 auth_token 與 ct0，分別複製 Value，貼入下方同名欄位，再按「儲存並測試讀取」。':'Chrome で x.com にログインし、開発者ツール → Application → Storage → Cookies → https://x.com を開きます。auth_token と ct0 の Value を同名の欄に貼り付けて保存してください。',
    '儲存並測試讀取':'保存してアクセスを確認',
    '請分別貼上 auth_token 與 ct0 的完整 Value。':'auth_token と ct0 の値をそれぞれ完全に貼り付けてください。',
    '請等待目前的備份完成後，再儲存登入資料。':'バックアップの終了後にログイン情報を保存してください。',
    '未能儲存登入資料。':'ログイン情報を保存できませんでした。',
    '最新版本':'最新版','舊版本':'過去の版','貼文文字':'本文','原文連結':'元の投稿','開啟資料夾':'フォルダーを開く',
    '另存整篇':'投稿を保存','另存原檔':'元のファイルを保存','複製 ALT':'ALT をコピー',
    '尚未有備份帳戶。請按「新增備份帳戶」開始。':'バックアップ対象がありません。アカウントを追加してください。',
    '正在掃描備份資料夾…':'バックアップを読み込み中…','媒體缺失或未下載':'ファイルが未保存または見つかりません',
    '最高畫質未能確認':'最高画質を確認できません',
    '正在停止':'停止中','等待目前檔案完成':'処理中のファイルを待機中','已暫停':'一時停止中','正在核對帳戶清單':'投稿一覧を確認中',
    '正在保存貼文與媒體':'投稿とメディアを保存中','正在檢查儲存位置':'保存先を確認中',
    '查看舊版本':'過去の版を表示','按「更新」後才會開始備份。':'更新ボタンを押すとバックアップが始まります。',
    '未登入，可先嘗試公開內容':'未ログイン。公開内容を取得できます','等待您完成網站登入':'サイトでログインしてください',
    '登入資料已取得，待驗證':'ログイン情報を取得しました。確認待ちです','正在驗證下載存取':'ダウンロードのアクセスを確認中',
    '下載存取已驗證':'アクセスを確認済み','登入存取未能驗證，請重新登入或檢查。':'アクセスを確認できません。再ログインまたは再確認してください。',
    '系統加密暫時不可用':'システム暗号化を利用できません','已完成操作。':'操作が完了しました。',
    '儲存位置不可用，請重新連接或更改位置。':'保存先を利用できません。接続または設定を確認してください。',
    '請輸入有效的帳號或個人頁連結。':'有効なアカウント名またはプロフィール URL を入力してください。',
    '請選擇有效日期。':'有効な日付を選んでください。',
    '操作未能完成，請檢查設定後再試。':'操作を完了できませんでした。設定を確認して再試行してください。'
  }
};
let state={accounts:[],lang:'zh-Hant'};
let tab='accounts',platformFilter='',reportKey=null,editing=null,formPlatform='X',removeKey=null;
let records=[],selected=null,version=-1,loadSequence=0,refreshTimer=null,libraryDirty=true;
let libraryStatus='idle',matchingPosts=[],visiblePosts=0,postTrigger=null;
const libraryTypes={image:'圖片',video:'影片',text:'純文字'};
const libraryBatchSize=60;
const libraryNumber=new Intl.NumberFormat('en-HK');
const videoPreviews=new IntersectionObserver(entries=>{
  for(const {target,isIntersecting} of entries){
    if(!isIntersecting)continue;
    target.src=target.dataset.preview;
    videoPreviews.unobserve(target);
  }
},{rootMargin:'160px'});
let stateSequence=0;
let submittingPost=false;
const tr=value=>translations[state.lang]?.[value]??value;
const pick=table=>table[state.lang]??table['zh-Hant'];
const labels={
  access:'部分內容需要登入才能讀取。',network:'無法連接平台，請檢查網絡後再試。','rate-limit':'平台暫時限制請求，請稍後再試。',
  storage:'儲存位置不可用，請重新連接或更改位置。',extractor:'未能取得內容。請稍後再試或檢查下載工具。',
  forbidden:'平台拒絕讀取（HTTP 403）。',
  'profile-unverified':'平台未能提供此帳戶的清單。請核對帳號及登入狀態。',
  'ig-web-unverified':'Instagram Web 未能提供可核對的貼文清單。',
  'ig-web-bootstrap':'Instagram 首頁缺少讀取清單所需的登入資料。',
  'ig-web-query':'Instagram 已回應，但貼文清單格式未能核對。',
  'ig-web-identity':'Instagram 貼文清單未能核對目標帳戶身份。',
  'replies-unverified':'已嘗試讀取公開貼文，回覆清單仍未能核對。',
  'photos-unverified':'未能核對完整相片清單。已成功備份的相片與影片將會保留。',
  'tiktok-empty-body':'TikTok 帳戶清單回應無內容，相片清單未能核對。',
  'missing-tool':'找不到下載工具。請安裝 gallery-dl、yt-dlp、ffmpeg 與 ffprobe。',
  identity:'來源帳戶身份有變更，請確認帳號。','unknown-date':'部分內容日期不明，未能套用日期範圍。',
  unavailable:'未能重新取得部分項目。',unverified:'平台返回的內容未能核對。',
  'unverified-empty':'清單未能確認。暫時未取得貼文。',
  'x-date-unverified':'X 未能核對所選日期的貼文清單。',
  'reels-unverified':'Reels 清單未能核對。一般貼文清單不受影響。',
  'stories-unverified':'本次未能核對 Stories。已過期且未加入精選的內容無法補回。',
  'highlights-unverified':'精選清單未能核對。一般貼文清單不受影響。',
  'ig-scopes-pending':'一般貼文清單已讀取完成。再次按「更新」才會以新方式讀取 Reels、Stories 與精選。'
};
const pageTitles={accounts:'備份帳戶',library:'已下載內容',settings:'設定'};
const phases={running:'進行中',partial:'部分完成',complete:'本次完成',failed:'未能備份',stopped:'已停止'};
const metrics=[
  ['added','新增貼文（篇）'],['skipped','跳過媒體（檔）'],['versions','文字／ALT 更新（篇）'],
  ['upgraded','畫質升級（檔）'],['failed','失敗項目（個）'],['limited','受限項目（個）']
];
const loginCopy={
  anonymous:'未登入，可先嘗試公開內容', waiting:'等待您完成網站登入',
  saved:'登入資料已取得，待驗證', checking:'正在驗證下載存取', connected:'下載存取已驗證',
  'no-encryption':'系統加密暫時不可用',
  'no-target':'登入資料已保存。請先新增此平台的備份帳戶，再按「重新檢查」。',
  'not-captured':'未取得登入資料。請確認已在網站完成登入。',
  'capture-failed':'未能讀取或保存登入資料。請開啟登入視窗再試。',
  'page-failed':'未能開啟網站登入頁。請檢查網絡，再開啟登入視窗。',
  access:'平台拒絕下載工具存取。請確認登入已完成，再按「重新檢查」。',
  'partial-access':'已讀取部分貼文，但驗證有缺漏。請按「重新檢查」。',
  'posts-access':'已讀取 X 貼文，但回覆清單仍未能核對。',
  'reels-access':'已讀取 IG Reels，但一般貼文清單仍未能核對。',
  'videos-access':'公開影片可以讀取。平台完整清單仍受限，相片未能核對。',
  'videos-empty-body':'公開影片可以讀取。TikTok 返回給 App 的帳戶清單回應無內容，相片清單未能核對。',
  'tiktok-empty-body':labels['tiktok-empty-body'],
  empty:'驗證時未讀取到貼文。請確認備份帳戶有可存取的貼文。',
  timeout:'下載工具檢查逾時。請稍後按「重新檢查」。',
  unverified:'下載工具未能核對貼文。請稍後按「重新檢查」。',
  network:labels.network,'rate-limit':labels['rate-limit'],'missing-tool':labels['missing-tool'],
  extractor:labels.extractor,forbidden:'已保留登入資料。平台拒絕下載工具讀取清單（HTTP 403）。',
  'profile-unverified':'已保留登入資料。下載工具仍無法讀取此帳戶的清單。',
  'ig-web-unverified':'已保留登入資料。Instagram Web 未能提供可核對的貼文清單。',
  'ig-web-bootstrap':labels['ig-web-bootstrap'],
  'ig-web-query':labels['ig-web-query'],
  'ig-web-identity':labels['ig-web-identity'],
  'reels-unverified':labels['reels-unverified'],
  'stories-unverified':labels['stories-unverified'],
  'highlights-unverified':labels['highlights-unverified']
};
Object.assign(translations.en,{
  [loginCopy['posts-access']]:'X posts were read, but the replies listing could not be verified.',
  [loginCopy['reels-access']]:'IG Reels were read, but the regular post listing could not be verified.',
  [loginCopy['videos-access']]:'Public videos can be read. The full listing is still restricted and photos could not be verified.',
  [loginCopy['videos-empty-body']]:'Public videos can be read. TikTok returned an empty account listing response to the app; photo posts could not be verified.',
  [labels['tiktok-empty-body']]:'TikTok returned an empty response for the account listing; photo posts could not be verified.',
  [loginCopy.forbidden]:'Login data kept. The platform denied the download tool from reading the listing (HTTP 403).',
  [loginCopy['profile-unverified']]:'Login data kept. The download tool still could not read this account\'s listing.',
  [loginCopy['ig-web-unverified']]:'Login data kept. Instagram Web could not provide a verifiable post listing.',
  [loginCopy['no-target']]:'Login data saved. Add a backup account for this platform first, then click "Recheck".',
  [loginCopy['not-captured']]:'No login data captured. Make sure you finished signing in on the site.',
  [loginCopy['capture-failed']]:'Could not read or save login data. Open the sign-in window and try again.',
  [loginCopy['page-failed']]:'Could not open the sign-in page. Check your network and try again.',
  [loginCopy.access]:'The platform denied download tool access. Confirm sign-in is complete and click "Recheck".',
  [loginCopy['partial-access']]:'Some posts were read, but verification is incomplete. Click "Recheck".',
  [loginCopy.empty]:'No posts were found during verification. Make sure the backup account has accessible posts.',
  [loginCopy.timeout]:'Download tool check timed out. Click "Recheck" later.',
  [loginCopy.unverified]:'Download tool could not verify posts. Click "Recheck" later.',
  [labels.access]:'Some content requires signing in to access.',
  [labels.network]:'Unable to connect to the platform. Check your network and try again.',
  [labels['rate-limit']]:'The platform temporarily limited requests. Try again later.',
  [labels['missing-tool']]:'Download tools not found. Please install gallery-dl, yt-dlp, ffmpeg, and ffprobe.',
  [labels.forbidden]:'The platform denied access (HTTP 403).',
  [labels['profile-unverified']]:'The platform could not provide the listing for this account. Check the handle and login status.',
  [labels['ig-web-unverified']]:'Instagram Web could not provide a verifiable post listing.',
  [labels['ig-web-bootstrap']]:'The Instagram home page is missing the login data required to read the listing.',
  [labels['ig-web-query']]:'Instagram responded, but the post listing format could not be verified.',
  [labels['ig-web-identity']]:'Could not verify the target account identity from the Instagram post listing.',
  [labels['replies-unverified']]:'Attempted to read public posts, but the replies listing could not be verified.',
  [labels['x-date-unverified']]:'X could not verify the post listing for the selected dates.',
  [labels['photos-unverified']]:'Could not verify the full photo listing. Already backed-up photos and videos will be kept.',
  [labels.extractor]:'Could not retrieve content. Try again later or check your download tools.',
  [labels.identity]:'The source account identity changed. Please verify the handle.',
  [labels['unknown-date']]:'Some items have an unknown date and could not be matched to the date range.',
  [labels.unavailable]:'Some items could not be retrieved again.',
  [labels.unverified]:'The content returned by the platform could not be verified.',
  [labels['unverified-empty']]:'Listing could not be verified. No posts retrieved yet.',
  [labels['reels-unverified']]:'Could not verify the Reels listing. Regular posts are unaffected.',
  [labels['stories-unverified']]:'Could not verify Stories this time. Expired stories not saved to Highlights cannot be recovered.',
  [labels['highlights-unverified']]:'Could not verify the Highlights listing. Regular posts are unaffected.',
  [labels['ig-scopes-pending']]:'Regular posts have finished loading. Click "Update" again to fetch Reels, Stories, and Highlights with the updated method.'
});
Object.assign(translations.ja,{
  [loginCopy['posts-access']]:'X の投稿は取得できました。返信一覧は未確認です。',
  [loginCopy['reels-access']]:'Instagram のリールは取得できました。通常の投稿は未確認です。',
  [loginCopy['videos-access']]:'公開動画は取得できました。全投稿一覧は制限されており、画像投稿は未確認です。',
  [loginCopy['videos-empty-body']]:'公開動画は取得できました。TikTok の投稿一覧の応答が空で、画像投稿は未確認です。',
  [labels['tiktok-empty-body']]:'TikTok の投稿一覧の応答が空で、画像投稿は未確認です。',
  [loginCopy.forbidden]:'ログイン情報は保持されています。投稿一覧の取得が拒否されました（HTTP 403）。',
  [loginCopy['profile-unverified']]:'ログイン情報は保持されています。対象の投稿一覧を取得できませんでした。',
  [loginCopy['ig-web-unverified']]:'ログイン情報は保持されています。Instagram Web の投稿一覧を確認できませんでした。',
  [loginCopy['no-target']]:'ログイン情報を保存しました。対象アカウントを追加してから再確認してください。',
  [loginCopy['not-captured']]:'ログイン情報を取得できませんでした。サイトでログインを完了してください。',
  [loginCopy['capture-failed']]:'ログイン情報を読み込めないか保存できません。ログイン画面を開き直してください。',
  [loginCopy['page-failed']]:'ログインページを開けません。接続を確認してから再試行してください。',
  [loginCopy.access]:'ダウンロードツールのアクセスが拒否されました。ログインを確認してから再試行してください。',
  [loginCopy['partial-access']]:'一部の投稿のみ確認できました。再確認してください。',
  [loginCopy.empty]:'投稿を確認できませんでした。対象に閲覧可能な投稿があるかご確認ください。',
  [loginCopy.timeout]:'確認がタイムアウトしました。時間をおいて再確認してください。',
  [loginCopy.unverified]:'ダウンロードツールで投稿を確認できませんでした。時間をおいて再確認してください。',
  [labels.access]:'一部の内容を取得するにはログインが必要です。',
  [labels.network]:'サービスに接続できません。ネットワークを確認してください。',
  [labels['rate-limit']]:'サービスが一時的にリクエストを制限しています。時間をおいて再試行してください。',
  [labels['missing-tool']]:'gallery-dl、yt-dlp、ffmpeg、ffprobe をインストールしてください。',
  [labels.forbidden]:'サービスからアクセスを拒否されました（HTTP 403）。',
  [labels['profile-unverified']]:'投稿一覧を取得できません。アカウント名とログイン状態をご確認ください。',
  [labels['ig-web-unverified']]:'Instagram Web の投稿一覧を確認できませんでした。',
  [labels['ig-web-bootstrap']]:'Instagram のホームで投稿一覧に必要なログイン情報を確認できませんでした。',
  [labels['ig-web-query']]:'Instagram の応答はありましたが、投稿一覧の形式を確認できませんでした。',
  [labels['ig-web-identity']]:'Instagram の投稿一覧で対象アカウントを確認できませんでした。',
  [labels['replies-unverified']]:'公開投稿の取得を試みました。返信一覧は確認できませんでした。',
  [labels['x-date-unverified']]:'指定期間の X の投稿一覧を確認できませんでした。',
  [labels['photos-unverified']]:'画像投稿の全件は未確認です。保存した画像と動画は保持されます。',
  [labels.extractor]:'取得できませんでした。時間をおくか、ダウンロードツールを確認してください。',
  [labels.identity]:'対象アカウントの識別情報が変更されました。アカウント名をご確認ください。',
  [labels['unknown-date']]:'一部の項目は日付が不明なため、期間指定を適用できませんでした。',
  [labels.unavailable]:'一部の項目を再取得できませんでした。',
  [labels.unverified]:'サービスから返された内容を確認できませんでした。',
  [labels['unverified-empty']]:'投稿一覧を確認できませんでした。投稿は取得されていません。',
  [labels['reels-unverified']]:'リール一覧は確認できませんでした。通常の投稿一覧には影響しません。',
  [labels['stories-unverified']]:'ストーリーズは確認できませんでした。期限が切れてハイライトにない内容は取得できません。',
  [labels['highlights-unverified']]:'ハイライト一覧は確認できませんでした。通常の投稿一覧には影響しません。',
  [labels['ig-scopes-pending']]:'通常の投稿一覧は最後まで読めました。「更新」でリール、ストーリーズ、ハイライトを読み直します。'
});
const loginPending=new Set(['anonymous','waiting','checking','connected','saved','no-target']);
const original=new Map([...document.querySelectorAll('[data-t]')].map(e=>[e,e.textContent]));

function visibleReasons(report) {
  const reasons=report?.reasons||[];
  const postsReady=report?.igScan?.stop==='end' && report.igScan.posts>0;
  if(!postsReady)return reasons;
  const stale=reasons.some(reason=>['profile-unverified','extractor','unverified'].includes(reason));
  const rest=reasons.filter(reason=>!['profile-unverified','extractor','unverified'].includes(reason));
  return stale?[...rest,'ig-scopes-pending']:rest;
}
function element(tag,text,cls) {
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=String(text);
  if(cls)node.className=cls;
  return node;
}
const btn=(label,callback,{className='',disabled=false}={})=>{
  const node=element('button',tr(label),className);
  node.type='button';node.disabled=disabled;node.addEventListener('click',callback);
  return node;
};
function date(value,full=false){
  const timestamp=Date.parse(value);
  const locale=pick({'zh-Hant':'zh-HK',en:'en-GB',ja:'ja-JP'});
  return Number.isFinite(timestamp) ? new Intl.DateTimeFormat(locale,{
    timeZone:'Asia/Hong_Kong',year:full?'numeric':undefined,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).format(timestamp):'—';
}
const invalidDateText='請以 DD/MM/YYYY 格式輸入有效日期。';
function displayDate(iso){
  return iso?iso.split('-').reverse().join('/'):'';
}
function readDate(input){
  const text=input.value;
  if(!text)return '';
  const match=/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/.exec(text);
  if(!match||match[3]==='0000')return null;
  const iso=match.slice(1).reverse().join('-');
  const timestamp=Date.parse(iso);
  return Number.isFinite(timestamp)&&new Date(timestamp).toISOString().slice(0,10)===iso?iso:null;
}
function day(timestamp){
  return Number.isFinite(timestamp) ? new Date(timestamp+8*3600000).toISOString().slice(0,10) : '';
}
function notice(value,warning=false){
  $('notice').hidden=!value;
  $('notice').className=warning?'warning':'';
  $('notice').textContent=tr(value||'');
}
async function action(name,...args){
  try{await call(name,...args);await refresh();}
  catch(error){
    const detail=error.message;
    const message=detail.includes('invalid-account')?'請輸入有效的帳號或個人頁連結。':'操作未能完成，請檢查設定後再試。';
    notice(message,true);
  }
}
const loginLabel=platform=>platform==='X'?'貼上 X 登入資料':'開啟登入視窗';
function show(next){
  if(!Object.hasOwn(pageTitles,next))return;
  tab=next;
  for(const key of Object.keys(pageTitles))$(key).hidden=key!==tab;
  for(const button of document.querySelectorAll('[data-tab]'))button.setAttribute('aria-pressed',String(button.dataset.tab===tab));
  if(tab==='library'&&libraryDirty)loadLibrary();
}
function renderStatic(){
  document.documentElement.lang=state.lang;
  $('language').value=state.lang;
  for(const [e,text] of original)e.textContent=tr(text);
  document.querySelector('nav')?.setAttribute('aria-label',tr('主選單'));
  $('platform-filter')?.setAttribute('aria-label',tr('平台'));
  for(const field of document.querySelectorAll('.date-field')){
    field.querySelector('button').setAttribute('aria-label',
      field.querySelector('label').textContent+' · '+tr('開啟日曆'));
  }
}
function renderBackupForm(){
  $('backup-post-submit').disabled=Boolean(state.job)||submittingPost||!$('post-link').value.trim();
  $('post-link').readOnly=submittingPost;
}
function renderPostIssues(result){
  if(!result.postIssues?.length)return null;
  const list=element('section',undefined,'report-issues');
  list.append(element('h3',tr('失敗與受限的貼文')));
  for(const {url,failed,limited} of result.postIssues){
    const row=element('div',undefined,'report-issue');
    const info=element('div',undefined,'grow');
    const counts=[
      failed && pick({'zh-Hant':failed+' 個項目失敗',en:failed+' failed',ja:failed+' 件失敗'}),
      limited && pick({'zh-Hant':limited+' 個項目受限',en:limited+' limited',ja:limited+' 件に制限'})
    ].filter(Boolean).join(' · ');
    info.append(element('div',url||tr('未取得原文連結'),'source-url'),element('div',counts,'warning hint'));
    row.append(info);
    if(url){
      const ops=element('div',undefined,'actions');
      const status=element('span',undefined,'hint');
      status.setAttribute('role','status');
      const showError=()=>{status.textContent=tr('操作未能完成，請檢查設定後再試。');};
      ops.append(btn('開啟原文',()=>call('source',url).catch(showError)),
        btn('複製連結',()=>call('copy-text',url).then(()=>{status.textContent=tr('已複製連結');}).catch(showError)));
      row.append(ops,status);
    }
    list.append(row);
  }
  return list;
}
function renderAccountReport(account){
  const report=account.result;
  const panel=element('div',undefined,'account-report');
  panel.id='report';
  panel.tabIndex=-1;
  const m=element('div',undefined,'metrics');
  for(const [id,label] of metrics){
    const block=element('div',tr(label),'hint');
    block.append(element('strong',report.counts?.[id]||0));m.append(block);
  }
  const reasons=visibleReasons(report);
  panel.replaceChildren(element('h3',tr('查看結果')),m,
    ...reasons.map(reason=>element('p',tr(labels[reason]||reason),'warning')));
  if(report.xHistory){
    const {state:phase,from,through}=report.xHistory;
    const messages=pick({
      'zh-Hant':{cooldown:'X 暫時限流，15 分鐘後自動再試',searched:'已查完日期範圍',
        searching:'搜尋中',pending:'未查完，下次更新將會繼續',login:'未執行歷史搜尋，請先登入 X'},
      en:{cooldown:'Rate limited; resuming in 15 minutes',searched:'Finished searching date range',
        searching:'Searching',pending:'Incomplete; will resume on the next update',login:'Not searched; sign in to X first'},
      ja:{cooldown:'リクエスト制限。15分後に再開します',searched:'対象期間の検索が終了しました',
        searching:'検索中',pending:'未完了。次回の更新で再開します',login:'ログインが必要なため未検索です'}
    });
    const span=from && through?' ('+from+' – '+through+' HKT)':'';
    const prefix=pick({'zh-Hant':'X 歷史搜尋 · ',en:'X History Search · ',ja:'X 履歴検索 · '});
    panel.append(element('p',prefix+messages[phase]+span,'hint'));
  }
  if(report.igScan){
    const {pages,posts,stop}=report.igScan;
    const stops=pick({
      'zh-Hant':{end:'已到末頁','no-progress':'清單無新貼文','invalid-cursor':'下一頁游標無效或重複',stopped:'已停止'},
      en:{end:'Reached end','no-progress':'No new posts','invalid-cursor':'Next page cursor invalid or repeated',stopped:'Stopped'},
      ja:{end:'最終ページ','no-progress':'新しい投稿がない','invalid-cursor':'次のページを特定できません',stopped:'停止しました'}
    });
    const detail=stops[stop] || tr(labels[stop]||stop);
    panel.append(element('p',pick({
      'zh-Hant':`IG 貼文清單 · 已讀 ${pages} 頁 · ${posts} 篇獨立貼文 · ${detail}`,
      en:`IG Post Listing · ${pages} ${pages===1?'page':'pages'} · ${posts} unique ${posts===1?'post':'posts'} · ${detail}`,
      ja:`IG 投稿一覧 · ${pages} ページ · 重複を除く ${posts} 件 · ${detail}`
    }),'hint'));
  }
  if(report.igScopes){
    const names={
      reels:{'zh-Hant':'Reels',en:'Reels',ja:'リール'},
      story:{'zh-Hant':'Stories',en:'Stories',ja:'ストーリーズ'},
      highlight:{'zh-Hant':'精選',en:'Highlights',ja:'ハイライト'}
    };
    const stops=pick({
      'zh-Hant':{end:'已讀取','no-progress':'清單無新項目','invalid-cursor':'下一頁游標無效或重複',stopped:'已停止',probe:'僅核對一頁'},
      en:{end:'Fetched','no-progress':'No new items','invalid-cursor':'Next page cursor invalid or repeated',stopped:'Stopped',probe:'Checked first page only'},
      ja:{end:'取得済み','no-progress':'新しい項目がない','invalid-cursor':'次のページを特定できません',stopped:'停止しました',probe:'確認のみ'}
    });
    const parts=Object.entries(report.igScopes).map(([scope,scan])=>{
      const label=names[scope]?pick(names[scope]):scope;
      const count=scan.posts||0;
      const detail=stops[scan.stop]||tr(labels[scan.stop]||scan.stop);
      return pick({
        'zh-Hant':`${label} ${count} 項 · ${detail}`,
        en:`${label} ${count} ${count===1?'item':'items'} · ${detail}`,
        ja:`${label} ${count}件 · ${detail}`
      });
    });
    if(parts.length)panel.append(element('p',parts.join(' · '),'hint'));
  }
  const postsReady=(report.igScan?.posts||0)>0;
  const scopeOnly=['identity','unknown-date','unavailable','storage','reels-unverified','stories-unverified','highlights-unverified','ig-scopes-pending'];
  if(!postsReady && reasons.some(reason=>!scopeOnly.includes(reason))){
    panel.append(element('p',tr('未能讀取的清單項目，未取得原文連結。'),'hint'));
  }else if(!postsReady && !report.postIssues && (report.counts?.failed||report.counts?.limited)){
    panel.append(element('p',tr('本次結果沒有原文連結記錄。'),'hint'));
  }
  const list=renderPostIssues(report);
  if(list)panel.append(list);
  return panel;
}
function renderTargets(){
  const hasJob=Boolean(state.job);
  renderBackupForm();
  $('root').textContent=state.root||'';
  $('settings-root').textContent=state.root||'';
  for(const name of ['add','change-root','settings-folder','choose-library'])$(name).disabled=hasJob;
  $('update-all').disabled=hasJob||!state.accounts.length;
  for(const b of document.querySelectorAll('[data-platform]'))b.setAttribute('aria-pressed',String(b.dataset.platform===platformFilter));
  $('job').hidden=!hasJob;
  if(hasJob){
    const j=state.job;
    $('job-status').textContent=tr(j.stopping?'正在停止':j.phase==='paused'?'已暫停':j.paused?'等待目前檔案完成':
      ({reading:j.single?'正在讀取貼文':'正在核對帳戶清單',saving:'正在保存貼文與媒體'}[j.phase]||'正在檢查儲存位置'));
    $('job-account').textContent=state.accounts.find(a=>a.key===j.active)?.handle||'';
    $('pause').textContent=tr(j.paused?'繼續更新':'暫停');
    $('pause').disabled=j.stopping;
    $('stop').disabled=j.stopping;
  }
  const list=state.accounts.filter(a=>!platformFilter||platformFilter===a.platform);
  const rows=list.map((a,index)=>{
    const r=a.result;
    const isExpanded=a.key===reportKey&&Boolean(r);
    const row=element('div',undefined,'panel account-row'+(isExpanded?' is-selected':''));
    const name=element('div');
    const title=element('strong');
    title.append(element('span',a.platform,'badge'),document.createTextNode('@'+a.handle));
    const viewButton=btn('查看結果',()=>{
      const opening=reportKey!==a.key;
      reportKey=opening?a.key:null;
      renderTargets();
      if(opening)$('report')?.focus();
      else $('targets').children[index]?.querySelector('[aria-expanded]')?.focus();
    },{className:'quiet',disabled:!r});
    viewButton.setAttribute('aria-expanded',String(isExpanded));
    const links=element('div',undefined,'actions');
    links.append(btn('範圍設定',()=>edit(a),{className:'quiet',disabled:hasJob}),
      viewButton,
      btn('移出清單',()=>remove(a),{className:'quiet',disabled:hasJob}));
    const startDate=displayDate(a.since);
    const range=a.until ? startDate+' – '+displayDate(a.until)
      : startDate ? pick({'zh-Hant':startDate+' 起',en:'From '+startDate,ja:startDate+' 以降'})
      : tr('全部可取得內容');
    name.append(title,element('div',range,'hint'),links);
    const times=element('div');
    times.append(element('div',tr('最近嘗試')+' '+date(r?.attempt),'hint'),element('div',tr('最近成功')+' '+date(r?.success),'hint'));
    const result=element('div');
    result.append(element('strong',tr(phases[r?.phase]||'未開始'),['partial','failed'].includes(r?.phase)?'warning':r?.phase==='complete'?'success':''));
    for(const issue of visibleReasons(r).slice(0,2))result.append(element('div',tr(labels[issue]||issue),'hint'));
    if(r?.reasons?.includes('access'))result.append(btn(loginLabel(a.platform),()=>a.platform==='X'?$('x-paste-dialog').showModal():action('login',a.platform),{className:'quiet'}));
    const ops=element('div',undefined,'actions');
    ops.append(btn('更新',()=>action('start',a.key,false),{disabled:hasJob}));
    row.append(name,times,result,ops);
    if(isExpanded)row.append(renderAccountReport(a));
    return row;
  });
  $('targets').replaceChildren(...(rows.length?rows:[element('p',tr('尚未有備份帳戶。請按「新增備份帳戶」開始。'),'panel')]));
}
function renderSettings(){
  const rows=Object.entries(state.login||{}).map(([platform,status])=>{
    const section=element('section');
    const ops=element('div',undefined,'actions');
    if(platform==='X'){
      ops.append(btn('貼上 X 登入資料',()=>$('x-paste-dialog').showModal(),{disabled:Boolean(state.job)||status==='checking'}));
    }else{
      ops.append(btn(loginLabel(platform),()=>action('login',platform),{disabled:status==='waiting'||status==='checking'}));
    }
    ops.append(btn('重新檢查',()=>action('check-login',platform),{disabled:['anonymous','waiting','checking'].includes(status)}),
      btn('清除登入資料',()=>action('clear-login',platform),{disabled:Boolean(state.job)||status==='anonymous'}));
    section.append(element('h3',platform),element('p',tr(loginCopy[status]),status==='connected'?'success':loginPending.has(status)?'':'warning'));
    section.append(ops);
    return section;
  });
  $('logins').replaceChildren(...rows);
}
async function refresh(){
  const seq=++stateSequence;
  const next=await call('state');
  if(seq!==stateSequence)return;
  const before=state;
  state=next;
  const previousRoot=before.library;
  if(previousRoot!==state.library||Boolean(before.job)&&!state.job)libraryDirty=true;
  renderTargets();
  renderSettings();
  if(state.lang!==before.lang)renderStatic();
  if(tab==='library'&&libraryDirty)loadLibrary();
}
function renderForm(){
  for(const button of document.querySelectorAll('#form-platform button')){
    button.setAttribute('aria-pressed',String(button.dataset.value===formPlatform));
    button.disabled=Boolean(editing);
  }
  const range=$('account-form').elements.range.value;
  const hasStart=range!=='all',hasEnd=range==='between';
  $('backup-dates').hidden=!hasStart;
  $('since-field').hidden=!hasStart;$('until-field').hidden=!hasEnd;
  for(const [id,enabled] of [['since',hasStart],['until',hasEnd]]){
    $(id).disabled=!enabled;
    $(id).required=enabled;
    $(id+'-field').querySelector('button').disabled=!enabled;
  }
  $('since-hint').hidden=range!=='since';$('between-hint').hidden=!hasEnd;
  const scope=pick({
    'zh-Hant':{
      X:'備份本人發出的貼文、回覆、圖片、影片與 ALT。',
      IG:'備份可取得的貼文、Reels、Stories 與精選。',
      TikTok:'備份影片與相片貼文。'
    },
    en:{
      X:'Backs up posts, replies, images, videos, and ALT text published by this account.',
      IG:'Backs up available posts, Reels, Stories, and Highlights.',
      TikTok:'Backs up video and photo posts.'
    },
    ja:{
      X:'対象本人の投稿と返信、画像、動画、ALT を保存します。',
      IG:'投稿、リール、ストーリーズ、ハイライトを取得します。',
      TikTok:'投稿された動画と画像を取得します。'
    }
  });
  $('scope').textContent=scope[formPlatform];
}
function edit(a){
  editing=a||null;formPlatform=a?.platform||'X';
  $('form-title').textContent=tr(a?'範圍設定':'新增備份帳戶');
  $('handle').value=a?.handle||'';$('handle').readOnly=Boolean(a);
  $('account-form').elements.range.value=a?.until?'between':a?.since?'since':'all';
  $('since').value=displayDate(a?.since);$('until').value=displayDate(a?.until);
  $('since').removeAttribute('aria-invalid');$('until').removeAttribute('aria-invalid');
  $('form-error').hidden=true;
  renderForm();$('account-dialog').showModal();
}
function remove(a){
  removeKey=a.key;$('remove-name').textContent=a.platform+' · @'+a.handle;
  $('remove-dialog').showModal();
}
const accountKey=post=>JSON.stringify([post.platform,post.accountId||post.account.toLowerCase()]);
const searchText=value=>value.normalize('NFKC').toLowerCase();
const hasAlt=post=>post.media.some(media=>media.altState==='present');
const isTextPost=post=>!post.media.length&&!post.contentMissing&&!post.missing&&Boolean(post.text?.trim());

function renderLibraryAccounts(){
  const platform=$('library-platform').value;
  const control=$('library-account');
  const previous=control.value;
  const accounts=new Map();
  for(const post of records){
    if(platform&&post.platform!==platform)continue;
    const key=accountKey(post);
    if(!accounts.has(key))accounts.set(key,post);
  }
  const entries=[...accounts].map(([key,post])=>({
    key,post,label:(platform?'':post.platform+' · ')+'@'+post.account
  })).sort((a,b)=>a.label.localeCompare(b.label)||a.key.localeCompare(b.key));
  const duplicates=new Set(entries.filter((entry,index)=>entry.label===entries[index-1]?.label).map(entry=>entry.label));
  const options=entries.map(({key,post,label})=>new Option(
    duplicates.has(label)?label+' ('+post.accountId+')':label,key
  ));
  control.replaceChildren(new Option(tr('全部帳號'),''),...options);
  control.value=accounts.has(previous)?previous:'';
}

function libraryCard(post){
  const card=element('button',undefined,'post-card');
  card.type='button';
  card.onclick=()=>{
    selected=post;
    version=-1;
    postTrigger=card;
    renderPost();
    const dialog=$('post-dialog');
    dialog.showModal();
    $('post').scrollTop=0;
  };

  const types=[...new Set(post.media.map(item=>item.type).filter(type=>Object.hasOwn(libraryTypes,type)))];
  const preview=post.media.find(item=>item.available&&types.includes(item.type));
  const missing=post.missing||post.contentMissing||post.media.some(item=>!item.available||item.error);
  const badges=element('span',undefined,'post-card-badges');
  for(const type of types)badges.append(element('span',tr(libraryTypes[type]),'post-card-badge'));
  if(hasAlt(post))badges.append(element('span','ALT','post-card-badge post-card-alt'));
  if(missing)badges.append(element('span',tr('媒體缺失或未下載'),'post-card-badge post-card-warning'));

  if(types.length){
    const cover=element('span',undefined,'post-card-cover');
    const placeholder=element('span',undefined,'post-card-placeholder');
    placeholder.setAttribute('aria-hidden','true');
    cover.append(placeholder);
    if(preview){
      const media=element(preview.type==='video'?'video':'img');
      media.setAttribute('aria-hidden','true');
      media.onerror=()=>media.remove();
      if(preview.type==='video'){
        media.preload='metadata';
        media.muted=true;
        media.dataset.preview=preview.href;
        videoPreviews.observe(media);
      }else{
        media.loading='lazy';
        media.decoding='async';
        media.alt='';
        media.src=preview.href;
      }
      cover.append(media);
    }
    if((preview?.type||types[0])==='video'){
      const play=element('span','▶','post-card-play');
      play.setAttribute('aria-hidden','true');
      cover.append(play);
    }
    cover.append(badges);
    card.append(cover);
  }else{
    card.classList.add('post-card-text');
    if(isTextPost(post))badges.prepend(element('span',tr('純文字'),'post-card-type'));
    card.append(badges);
  }
  const text=element('span',post.text?.trim()||tr('無貼文文字'),'post-card-summary');
  const meta=element('span',undefined,'post-card-meta');
  const account=element('span',post.platform+' · @'+post.account);
  const published=element('time',post.archiveDay?date(post.date,true):tr('無日期'));
  if(post.archiveDay)published.dateTime=new Date(post.timestamp).toISOString();
  meta.append(account,published);
  card.append(text,meta);
  return card;
}

function appendLibraryCards(){
  const next=matchingPosts.slice(visiblePosts,visiblePosts+libraryBatchSize);
  $('library-grid').append(...next.map(libraryCard));
  visiblePosts+=next.length;
  $('library-more').hidden=visiblePosts>=matchingPosts.length;
}

function renderLibrary(){
  videoPreviews.disconnect();
  $('library-grid').replaceChildren();
  $('library-more').hidden=true;
  $('library-empty').hidden=true;
  if(libraryStatus!=='ready'){
    const message=libraryStatus==='error'?'儲存位置不可用，請重新連接或更改位置。':'正在掃描備份資料夾…';
    $('library-result').textContent=tr(message);
    return;
  }

  const platform=$('library-platform').value,account=$('library-account').value;
  const from=readDate($('from')),to=readDate($('to'));
  const query=searchText($('search').value.trim());
  const alt=$('has-alt').checked;
  const types=Object.keys(libraryTypes).filter(type=>$('library-'+type).checked);
  const oldest=$('library-sort').value==='oldest';
  const invalidOrder=Boolean(from&&to&&from>to);
  const invalidDate=from===null||to===null;
  $('from').setAttribute('aria-invalid',String(from===null));
  $('to').setAttribute('aria-invalid',String(to===null||invalidOrder));

  matchingPosts=invalidDate||invalidOrder?[]:records.filter(post=>{
    if(platform&&post.platform!==platform||account&&accountKey(post)!==account)return false;
    if((from||to)&&(!post.archiveDay||from&&post.archiveDay<from||to&&post.archiveDay>to))return false;
    if(alt&&!hasAlt(post))return false;
    if(types.length!==3&&!types.some(type=>type==='text'
      ? isTextPost(post)
      : post.media.some(item=>item.type===type)))return false;
    return !query||[post.text,...post.media.map(item=>item.alt)].some(value=>typeof value==='string'&&searchText(value).includes(query));
  }).sort((a,b)=>{
    const aDated=Boolean(a.archiveDay),bDated=Boolean(b.archiveDay);
    if(aDated!==bDated)return aDated?-1:1;
    if(aDated&&a.timestamp!==b.timestamp)return oldest?a.timestamp-b.timestamp:b.timestamp-a.timestamp;
    return a.folder.localeCompare(b.folder);
  });
  const total=libraryNumber.format(matchingPosts.length);
  $('library-result').textContent=pick({
    'zh-Hant':'共 '+total+' 篇貼文',
    en:total+(matchingPosts.length===1?' post':' posts'),
    ja:'全 '+total+' 件'
  });
  if(!matchingPosts.length){
    const message=invalidDate?invalidDateText:invalidOrder?'結束日期須等於或晚於開始日期。':
      records.length?'找不到符合條件的貼文。請嘗試更改篩選條件。':'尚無已下載貼文。';
    $('library-empty').textContent=tr(message);
    $('library-empty').hidden=false;
  }
  visiblePosts=0;
  appendLibraryCards();
}

function renderPost(){
  const view=$('post');
  if(!selected)return;
  const post=selected,content=post.versions[version]||post;
  const heading=element('div',undefined,'heading');
  const info=element('div');
  const title=element('h2','@'+post.account+' · '+date(post.date,true));
  title.id='post-title';
  info.append(element('div',[post.platform,post.account,post.archiveDay].filter(Boolean).join(' / '),'hint'),title);
  heading.append(info);
  if(post.versions.length){
    const select=element('select');select.setAttribute('aria-label',tr('查看舊版本'));
    for(const [i,v] of [post,...post.versions].entries())select.append(new Option(tr(i?'舊版本':'最新版本')+' '+date(v.observed,true),String(i-1)));
    select.value=String(version);
    select.onchange=()=>{
      version=Number(select.value);
      renderPost();
      view.querySelector('select')?.focus({preventScroll:true});
    };
    heading.append(select);
  }
  const ops=element('div',undefined,'actions');
  if(post.url)ops.append(btn('原文連結',()=>action('source',post.url),{className:'quiet'}));
  ops.append(btn('開啟資料夾',()=>action('reveal',post.folder),{className:'quiet'}));
  if(post.exportId)ops.append(btn('另存整篇',()=>action('copy',post.exportId,true),{className:'quiet'}));
  view.replaceChildren(heading,ops,element('h3',tr('貼文文字')),element('div',content.text||'','post-body'));
  if(version===-1&&(post.missing||post.contentMissing||content.media.some(m=>!m.available||m.error))){
    const issue=element('p',tr('媒體缺失或未下載'),'warning');view.append(issue);
    const account=state.accounts.find(a=>a.platform===post.platform&&(a.accountId
      ? a.accountId===post.accountId
      : a.handle.toLowerCase()===post.account.toLowerCase()));
    if(account)view.append(btn('更新',()=>action('start',account.key,false),{disabled:Boolean(state.job)}));
  }
  for(const item of content.media){
    const figure=element('figure');
    if(item.available){
      const media=element(item.type==='video'?'video':'img');
      media.src=item.href;
      if(item.type==='video'){media.controls=true;media.preload='metadata';}
      else {media.loading='lazy';media.alt=item.alt||'';}
      media.onerror=()=>media.replaceWith(element('p',tr('媒體缺失或未下載'),'warning'));
      figure.append(media);
    }else figure.append(element('p',tr('媒體缺失或未下載'),'warning'));
    const caption=element('figcaption');
    if(item.width&&item.height)caption.append(element('div',item.width+' × '+item.height,'hint'));
    if(item.file&&item.quality!=='best')caption.append(element('p',tr('最高畫質未能確認'),'warning'));
    if(item.altState==='present')caption.append(element('strong','ALT'),element('div',item.alt,'alt'),
      btn('複製 ALT',()=>call('copy-text',item.alt).then(()=>notice('已完成操作。')).catch(()=>notice('操作未能完成，請檢查設定後再試。',true)),{className:'quiet'}));
    if(item.available)caption.append(btn('另存原檔',()=>action('copy',new URL(item.href).pathname.slice(1),false),{className:'quiet'}));
    figure.append(caption);view.append(figure);
  }
}
async function loadLibrary(){
  const seq=++loadSequence;
  libraryDirty=false;
  libraryStatus='loading';
  renderLibrary();
  try {
    const data=await call('library');
    if(seq!==loadSequence)return;
    $('library-path').textContent=data.root;
    records=data.records.map(post=>{
      const timestamp=Date.parse(post.date);
      return {...post,timestamp,archiveDay:day(timestamp)};
    });
    libraryStatus=data.unavailable?'error':'ready';
  }catch{
    if(seq!==loadSequence)return;
    records=[];
    libraryStatus='error';
  }
  if(selected&&$('post-dialog').open){
    const updated=records.find(post=>post.folder===selected.folder);
    if(updated){
      const observed=selected.versions[version]?.observed;
      version=observed?updated.versions.findIndex(item=>item.observed===observed):-1;
      selected=updated;
      renderPost();
    }else $('post-dialog').close();
  }
  renderLibraryAccounts();
  renderLibrary();
}

for(const control of document.querySelectorAll('.date-control')){
  const input=control.querySelector('input');
  const template=document.importNode($('date-picker-template').content,true);
  const button=template.querySelector('button');
  const picker=template.querySelector('input');
  picker.id=input.id+'-picker';
  button.onclick=()=>{
    picker.value=readDate(input)||'';
    picker.showPicker();
  };
  picker.oninput=event=>{
    event.stopPropagation();
    input.value=displayDate(picker.value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  };
  control.append(template);
}
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>show(button.dataset.tab);
for(const button of document.querySelectorAll('[data-platform]'))button.onclick=()=>{platformFilter=button.dataset.platform;renderTargets();};
for(const button of document.querySelectorAll('#form-platform button'))button.onclick=()=>{formPlatform=button.dataset.value;renderForm();};
$('account-form').addEventListener('input',event=>{
  if(event.target.matches('.date-control input[type=text]')){
    event.target.removeAttribute('aria-invalid');
    $('form-error').hidden=true;
  }
});
$('account-form').addEventListener('change',()=>{
  $('form-error').hidden=true;
  renderForm();
});
$('account-form').onsubmit=async event=>{
  event.preventDefault();
  const since=$('since').disabled?'':readDate($('since'));
  const until=$('until').disabled?'':readDate($('until'));
  if(since===null||until===null){
    $('form-error').textContent=tr(invalidDateText);
    $('form-error').hidden=false;
    const input=$(since===null?'since':'until');
    input.setAttribute('aria-invalid','true');
    input.focus();
    return;
  }
  try{
    await call('save-account',formPlatform,$('handle').value,since||null,editing?.key,until||null);
    $('account-dialog').close();
    notice('按「更新」後才會開始備份。');
    await refresh();
  }catch(error){
    $('form-error').hidden=false;
    $('form-error').textContent=tr(error.message.includes('invalid-date-order')?'結束日期須等於或晚於開始日期。':
      error.message.includes('invalid-date')?'請選擇有效日期。':'請輸入有效的帳號或個人頁連結。');
  }
};
$('cancel-form').onclick=()=>$('account-dialog').close();
$('x-paste-cancel').onclick=()=>$('x-paste-dialog').close();
$('x-paste-dialog').addEventListener('close',()=>{
  $('x-paste-form').reset();
  $('x-paste-error').hidden=true;
});
$('x-paste-dialog').addEventListener('cancel',event=>{
  if($('x-paste-submit').disabled)event.preventDefault();
});
$('x-paste-form').onsubmit=async event=>{
  event.preventDefault();
  const submit=$('x-paste-submit');
  if(submit.disabled)return;
  const authToken=$('x-auth-token').value;
  const csrfToken=$('x-csrf-token').value;
  const errorNotice=$('x-paste-error');
  errorNotice.hidden=true;
  $('x-paste-form').reset();
  submit.disabled=true;
  $('x-paste-cancel').disabled=true;
  try{
    if(authToken.length>4096 || csrfToken.length>4096)throw new Error('invalid-x-values');
    await call('paste-x-login',authToken,csrfToken);
    $('x-paste-dialog').close();
  }catch(error){
    const detail=error.message;
    errorNotice.textContent=tr(detail.includes('invalid-x-values')?'請分別貼上 auth_token 與 ct0 的完整 Value。':
      detail.includes('no-encryption')?'系統加密暫時不可用':
      detail.includes('busy')?'請等待目前的備份完成後，再儲存登入資料。':'未能儲存登入資料。');
    errorNotice.hidden=false;
    $('x-auth-token').focus();
  }finally{
    submit.disabled=false;
    $('x-paste-cancel').disabled=false;
  }
};
$('add').onclick=()=>edit();
$('post-link').oninput=()=>{
  $('backup-post-error').hidden=true;
  $('post-link').removeAttribute('aria-invalid');
  renderBackupForm();
};
$('backup-post-form').onsubmit=async event=>{
  event.preventDefault();
  if($('backup-post-submit').disabled)return;
  const input=$('post-link');
  const errorNotice=$('backup-post-error');
  errorNotice.hidden=true;
  submittingPost=true;
  renderBackupForm();
  try{
    await call('backup-post',input.value);
    await refresh();
  }catch(error){
    const invalid=error.message.includes('invalid-post-link');
    errorNotice.textContent=tr(invalid?'請貼上有效的 X、Instagram 或 TikTok 貼文連結。':
      error.message.includes('busy')?'請等待目前的備份完成後，再試一次。':'操作未能完成，請檢查設定後再試。');
    errorNotice.hidden=false;
    if(invalid){input.setAttribute('aria-invalid','true');input.focus();}
  }finally{
    submittingPost=false;
    renderBackupForm();
  }
};
$('update-all').onclick=()=>action('start',null,false);
$('change-root').onclick=$('settings-folder').onclick=()=>action('folder','root');
$('choose-library').onclick=()=>action('folder','library');
$('reload-library').onclick=loadLibrary;
$('pause').onclick=()=>action('control',state.job?.paused?'resume':'pause');
$('stop').onclick=()=>action('control','stop');
$('remove-cancel').onclick=()=>$('remove-dialog').close();
$('remove-confirm').onclick=()=>{$('remove-dialog').close();action('remove-account',removeKey);};
const libraryFilters=$('library-filters');
libraryFilters.oninput=event=>{
  if(event.target.id==='library-platform')renderLibraryAccounts();
  renderLibrary();
};
libraryFilters.onsubmit=event=>event.preventDefault();
libraryFilters.onreset=event=>{
  event.preventDefault();
  $('library-platform').value='';
  $('library-account').value='';
  $('library-sort').value='newest';
  for(const id of ['search','from','to'])$(id).value='';
  for(const type of Object.keys(libraryTypes))$('library-'+type).checked=true;
  $('has-alt').checked=false;
  renderLibraryAccounts();
  renderLibrary();
};
$('library-more').onclick=()=>{
  const firstNewCard=visiblePosts;
  appendLibraryCards();
  $('library-grid').children[firstNewCard]?.focus();
};
let lastScrollTop=0;
window.addEventListener('scroll',()=>{
  const {scrollTop,scrollHeight,clientHeight}=document.scrollingElement;
  const scrolledDown=scrollTop>lastScrollTop;
  lastScrollTop=scrollTop;
  if(tab==='library'&&scrolledDown&&!$('library-more').hidden&&!$('post-dialog').open
      &&scrollHeight-clientHeight-scrollTop<=1){
    appendLibraryCards();
  }
},{passive:true});
$('close-post').onclick=()=>$('post-dialog').close();
$('post-dialog').onclose=()=>{
  if($('post-dialog').open)return;
  selected=null;
  version=-1;
  $('post').replaceChildren();
  (postTrigger?.isConnected?postTrigger:$('search')).focus({preventScroll:true});
  postTrigger=null;
};
$('language').onchange=async event=>{
  await action('language',event.target.value);
  renderLibraryAccounts();
  if(tab==='library')renderLibrary();
};
window.sns.onChange(()=>{
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>refresh().catch(()=>notice('操作未能完成，請檢查設定後再試。',true)),100);
});
refresh().then(renderStatic).catch(()=>notice('操作未能完成，請檢查設定後再試。',true));
