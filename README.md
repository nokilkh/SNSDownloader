# SNS Downloader

SNS Downloader 將 X、Instagram 與 TikTok 的可取得內容存入自選資料夾。備份由您手動開始，介面支援繁體中文、English 與日本語切換。已下載貼文以跨平台卡片時間線呈現，可按帳號、日期與內容篩選，並查看文字或 ALT 的舊版本。

## 本機啟動

在專案目錄執行：

```sh
npm ci
npm start
```

下載需要 `gallery-dl`、`yt-dlp`、`ffmpeg`、`ffprobe`。先用 `command -v gallery-dl yt-dlp ffmpeg ffprobe` 核對 macOS 工具是否可用。Windows 安裝需另備可從 PATH 執行的 gallery-dl。Windows 安裝包仍待驗證。

1. 在「備份帳戶」新增平台帳戶，選擇全部、指定日期之後或指定日期範圍，再確認儲存位置。日期以香港時間計算，開始與結束當日皆包含在內。備份範圍與已下載內容篩選均可使用日曆，或直接輸入 `DD/MM/YYYY`（例如 `26/11/2026`）。
   X 選擇「全部」時會先保存時間線，再用已儲存登入按日期向前搜尋。逐個香港曆月搜尋、保存，空月份繼續，密集月份拆細。取得開戶日期時查到開戶月份，否則查到平台歷史下限。
   指定起止日會直接由最後一個月份查起。搜尋限流會保留部分結果，等待 15 分鐘後自動重查同一段，可隨時按停止。已查範圍只涵蓋平台返回的結果。
2. 按「更新」或「更新全部帳戶」。現有完整媒體會跳過。
3. X 登入只需在「設定 → 貼上 X 登入資料」按指引貼上兩個 Value。在 Chrome 登入 x.com，開啟開發人員工具 → Application → Storage → Cookies → https://x.com。按 Name 尋找 auth_token 與 ct0，分別複製 Value，貼入 App 同名欄位，再按「儲存並測試讀取」。IG 與 TikTok 可使用 App 的獨立登入視窗。Instagram 另可在檔案選單匯入 Netscape TXT。
4. 在「已下載內容」直接瀏覽 X、Instagram 與 TikTok 的貼文卡片，預設最新到最舊。可切換排序，按平台、帳號、圖片／影片／純文字、日期、ALT 與關鍵字篩選，並即時查看符合條件的貼文總數。捲動到底部會自動顯示下一批，亦可按「顯示更多貼文」。點擊卡片可查看原文、媒體、ALT 與舊版本。每篇資料夾保留 `index.md`、`metadata.json` 與媒體檔案。
5. 在「備份帳戶」→「查看結果」可開啟或複製已識別的失敗與受限貼文連結。平台清單未提供的貼文會顯示未取得連結。
6. 如需補備單篇貼文，可在「貼上連結備份」貼上完整 X、Instagram 或 TikTok 原文連結，再按「備份此篇貼文」。亦可使用「檔案 → 備份已複製的貼文連結」。單篇使用同一儲存位置與去重規則。Instagram 公開嵌入頁沒有發佈日期時，會歸入無日期。平台尚未提供的相片會回報缺漏。
   macOS 單篇 TikTok 相冊路徑使用隨 App 提供的 [gallery-dl 1.32.21 Python wheel](https://pypi.org/project/gallery-dl/1.32.21/)，由現有 Python 版 gallery-dl 啟動。TikTok 更新優先讀取公開作者清單，按原始媒體欄位分辨影片與逐張相冊。指定單篇亦可按貼文 ID 核對。平台中斷分頁時會保留部分結果。

```text
備份位置/X/MomokoHashimoto/2024/08/2024-08-27_210800__1828419307900149793/
```

測試用 `npm test`、`npm run test:desktop`、`npm run check:release`。Desktop 測試使用臨時資料和模擬擷取。實站驗證及尚待確認項目見 [PROGRESS.md](PROGRESS.md)。

---

## 舊 Fanclub 版本參考

以下資料描述原有 Fanclub v2，供舊備份／server 查閱。SNS App 使用新入口及資料位置。


下載 Takaneko Fanclub 投稿、經理人部落格、Gallery 和 Movies，並在本地瀏覽。Local Reader 可讀取本機及已掛載 NAS 的 archive。

Takaneko Fanclub の投稿・マネージャーブログ・Gallery・Movies を保存し、ローカルで閲覧できます。Local Reader はローカルとマウント済み NAS のアーカイブに対応します。

**日本語は機械翻訳のため、不正確な表現が含まれる場合があります。**

僅供具有合法存取權限的使用者使用，請遵守網站條款與著作權。／正規のアクセス権を持つ方のみ利用し、サイト規約と著作権を守ってください。

## 安裝／インストール

在 [Releases](https://github.com/Senachi124/TakanekoFanClubDownloader/releases) 下載 v2.0.3，一般使用者不需 Node.js。／Releases から v2.0.3 を取得します。通常の利用では Node.js は不要です。

| 平台／OS | 檔案／ファイル |
|---|---|
| Windows x64 安裝版／インストーラー | `Takaneko-Fanclub-Downloader-2.0.3-Windows-x64-Setup.exe` |
| Windows x64 免安裝／ポータブル | `Takaneko-Fanclub-Downloader-2.0.3-Windows-x64-Portable.exe` |
| macOS Intel | `Takaneko-Fanclub-Downloader-2.0.3-macOS-x64.dmg` / `.zip` |
| macOS Apple Silicon | `Takaneko-Fanclub-Downloader-2.0.3-macOS-arm64.dmg` / `.zip` |

Windows 內附 yt-dlp、ffmpeg、ffprobe 及 Deno。macOS 影片下載需要在 PATH 提供最新版 yt-dlp、ffmpeg／ffprobe，及 Deno 2.3+ 或 Node.js 22+；圖片及 Reader 不需要。Release 附 SHA-256 校驗值；安裝包不含私人帳戶及 archive。

Windows は動画ツールを同梱します。macOS の動画取得には PATH 上の最新版 yt-dlp・ffmpeg・ffprobe と、Deno 2.3+ または Node.js 22+ が必要です。画像と Reader には不要です。Release に SHA-256 を掲載し、個人データは同梱しません。

v2 保留 1.2.1 以後的 app ID、名稱及使用者資料位置。1.2.0 以前使用舊名稱 `Takaneko Downloader`，請保留舊資料再自行遷移。

v2 は 1.2.1 以降のアプリ ID・名前・データ領域を維持します。1.2.0 以前の旧名アプリは、元データを保持して必要な移行を行ってください。

## 快速使用／使い方

1. 在設定 tab 開啟登入視窗，登入 Fanclub，再按「取得 Token」。／設定タブからログインし、「Token を取得」を押します。
2. 設定並發 1–100，預設 5；選擇 Blogs／Gallery／Movies。影片同時最多 2 個。／並列数は 1–100、既定値 5。対象を選択します。動画は同時に最大 2 件です。
3. 在下載 tab 開始；三條進度為清單、詳情檢查、媒體下載及保存。／ダウンロードタブから開始し、一覧・詳細確認・保存の進捗を確認します。
4. 可暫停、繼續或停止；已完成檔案保留，失敗可重試。／一時停止・再開・停止が可能です。完了分は保持し、失敗分を再試行できます。
5. 在「設定 → 瀏覽來源」選擇本機或已掛載 NAS 的 archive。「內容瀏覽」看投稿，「多媒體瀏覽」篩選圖片／影片，兩者與本地閱讀器共用來源。／「設定 → 閲覧元」でローカルまたはマウント済み NAS の archive を選択します。コンテンツ・メディア・ローカルリーダーは共通の閲覧元を使います。
6. 開啟投稿或媒體後，可「下載原檔」到其他位置、「另存整篇投稿」，或開啟原檔資料夾。另存是複製，來源不變；缺檔或 NAS 離線時會提示失敗。／元ファイルや投稿全体を別の場所に保存したり、元ファイルのフォルダーを開けます。コピーなので元データは変わりません。欠損・切断時は失敗を表示します。

「繁體中文／日本語」tabs 可切換並記住語言。時間顯示為香港 UTC+08:00、24 小時制；原始發布 metadata、檔名及存檔內容不變。

言語タブの選択を保存します。表示時刻は香港 UTC+08:00 の 24 時間表記です。元の公開日時 metadata・ファイル名・アーカイブは変更しません。

## Local Reader

v2.0.3 優先讀取伺服器在 NAS 校驗完成後發布的共用 `catalog.json`，不逐一遍歷投稿資料夾。內文和媒體在開啟時讀取，索引期間顯示動畫進度列。可選 `members/`、`media/`、`takaneko/` 或包含 `takaneko/` 的根目錄。請保留 `.catalog/`；NAS 更新結束後最遲於下次 60 秒檢查载入新清單。沒有 catalog 的舊 archive 仍使用掃描。

v2.0.3 は NAS 検証後の共通 `catalog.json` を優先し、投稿フォルダーの全走査を省きます。本文・メディアは開くときに読み込み、索引中は進捗バーを表示します。`members/`、`media/`、`takaneko/`、または `takaneko/` を含むルートを選択し、`.catalog/` を保持してください。更新は次の 60 秒確認で反映されます。catalog のない旧形式は従来どおり走査します。

選擇本機、外接磁碟或已掛載 NAS 根目錄。支援桌面 `index.md`＋`.post-id`、server `record.json` v1 和 NAS v2；提供成員／分類篩選、48 件分頁、圖片及影片。Reader 開啟時每 60 秒檢查更新，也可手動重新整理。

ローカル・外付けディスク・マウント済み NAS のルートを選択します。デスクトップ形式、server v1、NAS v2 に対応し、絞り込み・48 件分頁・画像・動画を提供します。表示中は 60 秒ごとに更新を確認します。

Reader 直接讀取選定資料夾，不登入伺服器、不同步遠端 archive、不修改來源。使用者可另存選定的投稿或媒體至來源以外的位置。索引存於 app 使用者資料目錄。離線時保留索引，缺失媒體顯示不可用。v1 相對連結必須位於所選根目錄內，建議選擇包含完整 `complete/` 的根目錄。

Reader は選択フォルダーを直接読み、遠隔ログイン・同期・元ファイルの変更を行いません。選択した投稿やメディアを閲覧元の外へコピーできます。索引はアプリのデータ領域に保存し、切断時も保持します。v1 の相対リンクを読む場合は `complete/` 全体を含むルートを選択してください。

## 資料與開發／データと開発

「設定 → 下載位置」可更改新下載的目的地，並作為另存檔案的預設位置；預設仍為 Electron `userData/exported`。更改設定不搬移既有檔案。可按「開啟資料夾」。token 及偏好同樣存於使用者資料目錄，不寫入 Git。原有內建登入及 Token Capture 保留，請勿分享登入資料。

「設定 → 保存先」で新しいダウンロードと別名保存の既定の場所を変更できます。初期値は Electron の `userData/exported` です。既存ファイルは移動しません。token と設定もユーザーデータ領域に保存し、Git に含めません。内蔵ログインと Token Capture を維持します。

```sh
npm ci
npm start
npm test
npm run check:release
npm run build:win
# macOS host / macOS 上で実行
npm run build:mac
```

桌面及共用功能在 `src/`；Reader adapter 在 `server/local-reader/` 並隨桌面包附上。伺服器、NAS、部署與自動化見 [server/README.md](server/README.md)，一般使用不需部署 server。

デスクトップと共通処理は `src/`、同梱 Reader は `server/local-reader/` にあります。サーバー運用は [server/README.md](server/README.md) を参照してください。通常の利用では server は不要です。

### YouTube 登入 / YouTube ログイン

設定頁提供 YouTube cookies 匯出教學，可貼上或選取 Netscape cookies.txt，並儲存或移除。只保留 youtube.com 的資料，存於本機 userData；不會寫入 archive 或套件。Fanclub 內建登入及 Token 擷取維持原樣。「已儲存」只表示格式有效，影片是否可存取仍須實際下載確認。

設定画面の手順に従い、YouTube の Netscape cookies.txt を貼り付けるか選択して保存・削除できます。youtube.com の情報のみローカル userData に保存し、archive や配布パッケージには含めません。Fanclub の内蔵ログインと Token 取得は従来どおりです。保存時は形式のみ確認し、動画へのアクセスはダウンロードで確認します。
