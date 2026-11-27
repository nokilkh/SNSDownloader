# SNS Downloader progress

需求由 REQUIREMENTS.md 管理；本文件記錄本次工作狀態，不代表歷史功能已重新驗證。

## 2026-11-27 TikTok「公開影片可以讀取。平台完整清單仍受限，相片未能核對。」修復

單一 phase 完成。針對設定頁 TikTok 檢查跌落 `videos-access` 做系統化除錯，發現四個成因並修正：
1. `resources/tiktok-plugins/sns/yt_dlp_plugins/extractor/sns_tiktok.py`：`_parse_aweme_video_web` 喺 `_extract_sec_uid_from_embed` 遇到頁面重導（如 `/hk/about`）令 `aweme` 為 `None` 時直接呼叫 `aweme.get('author')` 報 `AttributeError`，導致 `creatorPosts` 崩潰而後備 `publicFallback`（原生 `TikTokUserIE`）繼續試下一條片成功，觸發 `videos-access`。已改為先檢查 `isinstance(aweme, dict)`。
2. `src/main/sns/tiktokWeb.js`：`creatorPosts` 原本設 `--extractor-retries 0`、`--socket-timeout 10` 同 25 秒逾時，封鎖咗 `TikTokUserIE` 遇 bad `device_id` 時 `RetryManager` 重試機制。已改為 `--extractor-retries` 3（probe）／5（完整）、`--socket-timeout 12` 及 45 秒 probe 逾時。
3. `src/main/sns/sources.js`：`mediaURL()` 原本只硬編碼 `v16-webapp-prime.tiktok.com`，實站會回傳 `v19-webapp-prime.tiktok.com` 被拒。已放寬匹配 `^v\d+[a-z]*-webapp-prime\.tiktok\.com$`，同時繼續拒絕 `www.tiktok.com` 網頁連結。
4. `sns_tiktok.py`、`tiktokWeb.js`、`main.js`：核對作者身份後保存帳戶 `secUid`，之後 `creatorPosts` 經 `--extractor-args snsaccount:sec_uid=...`（`casesense=True`）直查 `/api/creator/item_list/`，略過網頁與 embed 抓取；若快取失效則自動退回 `@handle` 重查。`openLogin` 驗證到 `creator-access` 後亦自動關閉登入視窗。

- `tests/tiktok-web.test.js` 先以 TDD 紅燈重現 `NoneType` 崩潰、`v19-webapp-prime.tiktok.com` 被拒及重試／`secUid` 缺失，修正後全套 `npm test` 退出碼 0、`npm run test:desktop` 喺沙盒外通過。
- 實站對 `@momoko_hashimoto` 唯讀驗證 `creatorPosts(probe:true)`：首次 1,869 ms 取 3 篇、0 錯誤並取得 `secUid`；第二次用快取 `secUid` 1,214 ms 直讀 3 篇、0 錯誤，每篇接受 8 條 CDN URL（含 `v16` 及 `v19`）。
- 打包 macOS arm64（`dist/tiktok-creator-fix/mac-arm64/SNS Downloader.app`），`npm run check:release -- --packages` 通過。已確認舊 App 未執行並按 R035 原子置換根目錄 `SNS Downloader.app`，遞迴核對 534 個項目與 symlink 全部一致，ASAR SHA-256 為 `7e49c090c64656610321408fe19ef227caa71865679131deb53087d77839c765`（舊版保留於 `/private/tmp/sns-tiktok-fix-delivery-4kp9rK/SNS Downloader.app`）。未讀取或修改使用者登入憑證及現有備份檔案。

## 2026-11-26 R045 時間線觸底接續

單一 phase 完成。已下載內容向下捲到底會呼叫現有分批函式，每次最多加 60 篇，保留既有卡片同焦點。手動按鈕仍可使用。改動在 `src/renderer/sns/app.js`、`scripts/smoke-sns.js` 同 README.md。專案冇 Git metadata。

- 用 Superpowers TDD 同現有 Electron smoke，確認舊程式觸底停喺 60 篇，新程式用隔離存檔驗證中途維持 60 篇、兩次觸底依次顯示 120、125 篇、排序及去重、焦點、停止條件同手動接續。完整 `npm run test:desktop` 喺 macOS 沙盒外通過。`npm test` 退出碼 0，TAP 53 項通過。
- 使用現有 Electron 依賴打包 macOS arm64，`npm run check:release -- --packages` 通過。依 R035 更換已關閉嘅根目錄 App，整個 bundle 與 build 嘅檔案及 symlink 核對一致。已交付 ASAR SHA-256 為 `1238d40706f698515c2850e1cbf59b0347384c0723f72cd476d4eae2906ff82f`，舊版保留喺 `/private/tmp/sns-r045-delivery-3aev4we5/SNS Downloader.app`。
- 隔離 Electron profile 載入已交付 ASAR，確認捲到底由 60 篇接續至 61 篇，末批後隱藏按鈕。驗證限 macOS arm64 同臨時本機備份，未驗證 Windows 或真實帳戶下載。

## 2026-11-26 R044 日期格格式

單一 phase 完成。SNS 四個日期格已固定顯示及接受 `DD/MM/YYYY`，日曆會將選中日期填回文字格，帳戶範圍摘要使用相同格式。採用文字格配 Electron 原生日曆，沿用現有版面、ISO 日期儲存及香港日界。改動在 `src/renderer/sns/{index.html,styles.css,app.js}`、`scripts/smoke-sns.js` 同 `README.md`。目錄無 Git metadata。

- 用 Superpowers TDD 先確認 Electron 測試因原有四格缺少格式提示而失敗，再驗證繁中／日文提示、手打、日曆值往返、無效日期、ISO 儲存及重開、跨香港午夜嘅篩選。完成後 `npm run test:desktop` 通過，`npm test` 退出碼 0，TAP 共 53 項通過。
- 用現有 Electron 依賴打包 macOS arm64，`npm run check:release -- --packages` 通過。當 App 已關閉，按 R035 交換根目錄 bundle；已安裝 ASAR SHA-256 為 `3c2d073e40828b106b633cbbac736405563ca3d6376bb661417d28252290123d`。舊版暫存於 `/private/tmp/sns-r044-delivery.Gn9O5q/SNS Downloader.app`。隔離 Electron 測試載入已交付 ASAR，驗證日曆掣可見，且原生 `showPicker()` 成功以已輸入日子開啟。
- 今次 bundle 由現有原始碼一併打包，包含先前未交付嘅 R043 程式改動。R043 真實登入備份仍待驗證。今輪只驗證本機 macOS arm64；未驗證 Windows 或用真實帳戶下載。

## 2026-11-27 R043 IG Reels、Stories 同精選修復及交付

已完成除錯、實站唯讀驗證同本機 App 置換。原因有兩層：一係根目錄 `SNS Downloader.app` 仍停留喺 2026-11-24 打包版，令 Reels／Stories／精選繼續行 `gallery-dl` 而報 `profile-unverified` 及 `extractor`；二係未驗證過嘅 R043 實作對實站 IG 有三個介面問題——Reels 網格 GraphQL（`fetch__XDTUserDict.clips_connection`）唔返 `user.username`、`taken_at` 同 `video_versions`，Stories 舊 REST `/api/v1/feed/reels_media/` 返 HTML，精選舊 REST `/api/v1/highlights/.../highlights_tray/` 返 HTTP 404。

已更新 `src/main/sns/instagramWeb.js`、`src/main/sns/main.js`、`tests/sns-instagram-web.test.js` 及 `scripts/smoke-sns.js`：
- Reels 重用同一次備份已讀取嘅一般貼文資料（`knownPosts`），對只放喺 Reels 頁嘅貼文改用 `/api/v1/media/{pk}/info/` 補齊完整日期、文字、作者及最高畫質影片連結，並安全跳過非目標作者嘅 collab Reels。
- Stories 同精選改用 Instagram Web GraphQL（`PolarisProfileStoryHighlightsTrayContentQuery`、`PolarisStoriesV3ReelPageGalleryQuery`），並自動從首頁／個人頁載入嘅 `rsrc.php` JS bundle 解析最新 `doc_id` 同 `relayprovider` 參數（保留預設 fallback），影片亦改標 `directBest` 直接下載。
- 驗證：`node scripts/test.js` 全部通過、`scripts/smoke-sns.js`（Electron 桌面測試）通過；以隔離 `userData` 同 App 已保存嘅 IG 登入唯讀試讀 `@momoko__3628`，四個範圍（posts、reels 補全／重用、story、highlight）全部返回 `errors: []`（未寫入使用者備份）。
- 已打包 `dist/ig-scopes-web/mac-arm64/SNS Downloader.app`，`node scripts/check-release.js --packages` 通過，並按 R035 原子置換根目錄 `SNS Downloader.app`（遞迴核對 533 項一致，ASAR SHA-256：`c9eb33c4b2bbeb1435f98a299fcb1a61df092aac348d2cc9384293452d5dd23a`）。

## 2026-11-25 R043 IG Reels、Stories 同精選

程式已改，本機 App 未置換。已登入時 Reels、Stories、精選走 `instagramWeb.js` 嘅同一個 Web session，空清單算成功，失敗只留該範圍原因。一般貼文已到末頁時，舊結果嘅 `profile-unverified`／`extractor` 改顯示為要再按「更新」。`npm test` 通過。`npm run test:desktop` 未能啟動：Electron 報 Mach port permission denied。未打包，根目錄 App 未按 R035 置換，亦未用真實登入重跑備份。

## 2026-11-25 IG @momoko__3628 結果畫面

診斷完成，未改程式、未重跑備份。帳戶範圍由 2026-11-01 起。結果係 `partial`：新增 0、跳過媒體 64、失敗 0、受限 2；原因只有 `profile-unverified` 同 `extractor`。`igScan` 為 109 頁、1303 篇、`stop: end`，`postIssues` 為 0。存檔有 1303 篇一般貼文，媒體缺檔 0、媒體錯誤 0；2026-11-01 起以 UTC 時間字串計至少 15 篇，最新一篇係 2026-11-23 11:06:34 UTC（香港時間 19:06）。

`instagramWebPosts` 成功時只會交回 Web 錯誤碼，並且取代該範圍先前嘅 gallery-dl 錯誤。`profile-unverified` 同 `extractor` 來自其後的 Reels、Stories 或精選；gallery-dl 1.32.12 仍負責呢三個範圍。`counts.limited` 會加上原因數量，所以成個帳戶變成部分完成。結果畫面見到帳戶級原因，就顯示「未能讀到嘅清單項目，未取得原文連結」，即使今次冇缺連結嘅貼文。

## 2026-11-24 TikTok 單篇備份診斷（R031／R037）

使用者回報公開連結 `https://www.tiktok.com/@momoko_hashimoto/video/7710980391611518226` 單篇備份失敗，截圖顯示「公開頁面未能提供呢篇貼文嘅資料」。以系統化除錯核對 `postLink.js`、`main.js` 及本機匿名請求。指定貼文、官方播放器、oEmbed 及同帳戶對照貼文 `7709867182896844050` 均導向 `https://www.tiktok.com/hk/about`，最終回 HTTP 200，頁面缺少指定貼文資料。gallery-dl 1.32.12 和隨附 1.32.21 都無擷取結果。yt-dlp 2026.08.19 回報網頁回應不符預期。截圖文案屬通用擷取失敗提示。

診斷已重現。單篇備份仍待可正常播放原文的網絡出口驗證。未使用登入資料，未變更 VPN、程式碼、App 或備份。

### 同日瀏覽器 HAR／HTML 核對（R015／R021／R031）

設定頁的「公開影片可以讀取」來自主要帳戶查詢未建立存取、yt-dlp 公開清單後備查詢有結果。以唯讀方式離線核對使用者提供的 HAR／HTML。HAR 兩個 `/api/post/item_list/` 回應合共列出目標帳戶 32 條影片，第二頁請求承接第一頁游標，第二頁仍有 `hasMore: true`。HTML 有 72 條該帳戶的影片連結，無相片連結。唯一有相冊結構的回應來自轉發清單，該相冊由另一帳戶發佈。

指定單篇在首頁清單找到。HAR 保存的 894,092 bytes MP4 與該貼文影片變體的路徑吻合，經 ffprobe 核對為 1080 × 1920、7.83 秒、有 AAC 音軌，ffmpeg 完整解碼成功。帳戶相片覆蓋、清單最後一頁及 App 能否穩定取得相同回應仍未驗證。未重播請求、匯入登入資料、改 App 或寫入備份。

## 卡片時間線（R038，2026-11-22 香港時間）

| Phase | 狀態 | 範圍及驗收 |
|---|---|---|
| 1 SVG 設計 | 完成 | 已核對 SNS renderer、archive 掃描／媒體路徑及既有詳情。已用 brainstorming 與 frontend-design 完成卡片、篩選及零結果 SVG；XML、核心色碼及 Chrome 靜態渲染已核對。使用者已確認設計（R003）。 |
| 2 卡片時間線及測試 | 完成 | 依賴 Phase 1。先在 `scripts/smoke-sns.js` 加混合平台、日期邊界、媒體篩選、計數及詳情點擊測試。再改 `src/renderer/sns/{index.html,styles.css,app.js}`，沿用 archive IPC、本機媒體路徑及詳情 renderer。以 Node 和 Electron 臨時 archive 核對 R038。 |
| 3 本機 App 交付 | 完成 | 以既有 Electron Builder 打包 macOS arm64，通過 ASAR、臨時 profile 啟動及媒體預覽驗收。已依 R035 更新根目錄 App。 |

本輪沿用 Superpowers writing-plans、TDD 同 verification；現成 Node／Electron 依賴可用，Electron 如受沙盒限制則用本機執行。R038 不依賴實站或真正登入。驗收重點包括跨香港午夜、混合媒體只計一次、同名帳號隔離、找不到結果，以及返回時間線後篩選保留。

目前 archive IPC 單次讀取整個已選根目錄，舊介面逐個貼文開啟屬 renderer 樹狀瀏覽。目錄冇 Git metadata，無法以 Git 核對工作樹。已改 `src/renderer/sns/{index.html,styles.css,app.js}`、`scripts/smoke-sns.js` 同 README.md。媒體資料未取得嘅貼文仍可喺總覽辨認，唔會誤入純文字；同名帳號用平台與已知 ID 區分。卡片先載入 60 篇，按「顯示更多貼文」分批接續。詳情關閉後返回卡片焦點；切換版本保留選單焦點。

- `npm test` 及 `npm run test:desktop` 通過。新增 Electron fixture 驗證三平台混合、兩種排序、同名帳號、香港午夜、缺媒體、類型／ALT／關鍵字／日期篩選、計數、鍵盤焦點及版本查看。
- `npm run check:release -- --packages` 通過。以隔離 profile 啟動打包版，用 68 篇臨時貼文核對分批顯示、PNG、MP4、詳情及 820px 版面。未用真實備份或登入，未驗證 Windows 或其他 macOS 硬件。
- 已將 `dist/library-timeline/mac-arm64/SNS Downloader.app` 交付到專案根目錄。核對 534 個檔案、目錄和 symlink 全部與打包版相符。ASAR SHA-256 為 `f115ec35f70203f7f1032ebbfaa2784f2788ac9f08ad90ca9b7a6020e08ad93e`。

## 當前狀態（2026-11-22，香港時間）

依 R035，專案根目錄嘅 `SNS Downloader.app` 已包含指定起止日備份及 X 歷史範圍搜尋修正。無 ALT 提示及相應受限計數已移除。延續 R036／R037。IG 一般貼文的 Web GraphQL 已加入請求期間的同域 Cookie 更新及分階段錯誤，真實登入後存取仍待驗證。TikTok 已知五篇相冊在使用者備份中的 18 張相片雜湊全部吻合，完整相片清單仍未核對。此目錄沒有 Git metadata。

R038 更新已交付，詳見上方。同批更新前嘅舊 ASAR 與 `dist/x-history-rate-limit/mac-arm64/SNS Downloader.app` 一致。

| Phase | 狀態 | 已完成及仍待驗收 |
|---|---|---|
| 1 設計 | 完成 | 六張 SVG 已確認，R001–R028 按既定設計執行 |
| 2 擷取與登入驗證 | 進行中 | Shell 使用 gallery-dl 1.32.12、yt-dlp 2026.08.19、ffprobe 實測指定公開媒體。已知匿名覆蓋限制列於下表。未用真實憑證 |
| 3 桌面及備份 | 進行中 | Node fixtures、Electron smoke、打包檢查通過。未完成三平台實站完整性、登入與 Windows 驗收 |
| 4 整體驗收 | 未完成 | 依賴真實登入與各平台可取得內容。打包已核對 macOS arm64，未驗證 macOS x64／Windows |

實作計劃見 docs/superpowers/plans/2026-11-21-sns-desktop.md。工作在現有目錄直接執行，無 branch、commit 或 worktree 可記錄。此前 planning 記錄保留於下方，描述當時狀態。

## 實作與驗證（2026-11-21）

- src/main/sns/ 提供獨立桌面入口、隔離平台 session、平台擷取與命令交接、持久帳戶清單、手動逐帳戶更新、進度、缺漏重試、受控的本機媒體存取及匯出。舊 Fanclub/server 路徑保留在原有程式。新 Library 掃描 SNS metadata，舊 Fanclub 備份繼續用舊 Reader。
- src/renderer/sns/ 實作備份帳戶、日期範圍、月份／日期分類、搜尋、媒體／ALT 篩選及版本查看。保留指定色碼，提供繁中／日文主要畫面。舊版本放在該篇 metadata.json 的 versions 陣列，媒體由相對路徑引用。
- package.json 改用 SNS 入口及獨立識別，Electron 由 28 升至 45.4.1。依 https://releases.electronjs.org/release/v45.4.1 選擇仍受支援版本，因 app 會載入第三方登入頁。Windows gallery-dl 需另備可從 PATH 執行的安裝。產品沒有部署。
- npm test 通過，包括四項 SNS fixtures：大整數／作者／ALT、跨香港月份與補缺／修訂歷史、TikTok 多圖次序、IG Story／精選共用媒體 ID。npm run test:desktop 以 Electron 45.4.1 通過臨時帳戶、日期、手動跑兩次、從本機實際顯示圖片與 ALT、搜尋、閱讀版本、語言切換及移出清單後保留檔案。沙盒會使 Electron 本身 SIGABRT，經允許的正常本機執行成功。
- electron-builder 產出未簽署 arm64 .app。npm run check:release -- --packages 通過，臨時 profile 啟動打包 app 時載入 SNS 主視窗。這是本機 build，未驗證 Gatekeeper／簽名／公證、安裝包或雙平台發佈。
- 五項仍待驗收：內建視窗與真實 cookies 交接、平台整個帳戶／歷史覆蓋、IG Stories／精選實站、TikTok 相片和影片實站、Windows 原生。相片／影片最高畫質未能驗證平台會標成未確認或部分完成。來源缺 ALT 無法分辨時記為 unknown，保留已取得 ALT。大型帳戶的 CLI 輸出與時間限制尚未壓測。

| 最新樣本（免登入，正常網絡） | 實測證據 |
|---|---|
| [X 相片](https://x.com/MomokoHashimoto/status/1828419307900149793) | 兩張原圖 1538 × 2048，第一張 ALT 有值，第二張未能確認。重跑跳過兩個完整媒體檔 |
| [X 影片](https://x.com/MomokoHashimoto/status/2123402064961425677) | yt-dlp 列出 320 × 568、480 × 852、720 × 1280，實際存檔 720 × 1280 有聲。重跑跳過影片 |
| [X 設定帳戶的回覆清單](https://x.com/MomokoHashimoto/with_replies) | 有限 metadata 探測返回 access，0 篇，需登入再驗證 |
| [IG 相片](https://www.instagram.com/p/Df1-qHsmG5H/) | 更正連結後 gallery-dl 仍返回 HTTP 401，yt-dlp 無可存檔格式 |
| [IG Reel](https://www.instagram.com/reel/DfwuSMVvum9/) | gallery-dl HTTP 401。以直接 Reel URL 呼叫影片引擎及存檔核心，可取 1080 × 1920、有聲，為列出的最高解像度。是單篇影片路徑，不能用作匿名帳戶備份驗收 |
| [TikTok 相片](https://www.tiktok.com/@niinahapkwc/photo/7631562466413186324) | gallery-dl 無媒體，yt-dlp 無格式。多圖處理只經 fixture 驗證 |
| [TikTok 影片](https://www.tiktok.com/@momoko_hashimoto/video/7709867182896844050) | gallery-dl 無媒體，yt-dlp 無格式。未確認成因，不能記為沒有內容 |

實站樣本媒體只存入臨時驗收資料夾，量度後清理。沒有讀取瀏覽器 cookies、輸入密碼或保存登入資料。HTTP 狀態只描述這次工具回應。

## 驗證邊界

- 設計文件：docs/superpowers/specs/2026-11-17-sns-downloader-design.md；下載主畫面：docs/design/sns-downloader.svg；最新直向閱讀稿：docs/design/post-detail.svg。
- 獨立 builder review 已完成並納入：穩定帳戶 ID、ALT repair 不被去重攔截、reply 枚舉入口、cookies 格式及共享 server 依賴。不是實作 code review。
- 本機可執行 gallery-dl 1.32.12、yt-dlp 2026.08.19，ffmpeg 在 PATH；不代表 Finder 啟動或打包後可用。
- SVG XML 解析通過；主畫面曾在 Chrome 渲染並目視檢查。Quick Look/sips 無法在當前環境轉圖；Chrome 截圖可查看，但寫入 repo 路徑被該工具的 workspace 設定拒絕，未因此更改權限。
- post-detail.svg 已在 Chrome 渲染並目視確認文字 → 圖片 → ALT → 下一張圖的直向順序；主畫面摘要亦已同步改為直向。圖片佔位及說明文字不是完整來源備份。
- 本輪核對 exportPosts.js 的 index.md 格式（標題、Sender、Date、內文及媒體）與 renderer.js 詳情顯示；新設計保留 Markdown 產物，但須調整目前媒體／文字分開顯示的順序。目錄例子均為設計示意，不是已下載結果。
- library-layout.svg 的 XML 解析通過，已在 Chrome 渲染並目視檢查平台／帳號／日期分類與整篇閱讀區；未執行產品測試（本輪僅更改設計及需求文件）。
- 分類變更的 follow-up builder review 無 blocker；已補入日期補正不重複建檔、handle 重用／索引重建、Markdown 與 metadata 共源，以及共享媒體單篇匯出不斷圖的設計合約。
- 使用者提供的 X 貼文 1828419307900149793 已透過 Chrome 唯讀打開首圖 ALT 對話框，確認有多段日文及活動注意事項；尚未核對第二張圖 ALT。並看到該帳戶的文字回覆，可作 authored reply 樣本。未下載媒體或保存完整 ALT 原文。

- 除上述樣本瀏覽器唯讀檢查外，本次僅做靜態閱讀及下載工具官方支援清單查證，未修改產品程式。
- 2026-11-17 核對 gallery-dl 上游 twitter.py：圖片 ext_alt_text 會映射到 description，可作 ALT 備份的實作基礎；僅為上游程式證據，不代表本專案已實作或實站取得成功。來源：https://github.com/mikf/gallery-dl/blob/master/gallery_dl/extractor/twitter.py
- ALT 已加入 R006；設計需處理逐圖關聯、缺漏狀態及只補 metadata 而不重下完整圖片。
- 未測試 X／Instagram／TikTok 實站下載，未取得或驗證其登入憑證。
- 本輪靜態核對本機 gallery-dl 1.32.12 的 TwitterExtractor：圖片預設 orig，失敗依序 fallback 到 4096x4096／large／medium／small；影片選最高 bitrate，不足以單獨保證最高解像度。亦核對上游 twitter.py 及 yt-dlp 官方文件。未下載樣本，未驗證任何實際圖片寬高或影片畫質。

- 2026-11-17：依使用者最新指示，在帳號下加 YYYY/MM 分類；需求及設計同步更新，library-layout.svg 加年份／月份展開節點。維持只做 planning，不改產品 code、不搬移舊 archive。
- 年／月版 library-layout.svg 已通過 XML 解析並在 Chrome 截圖目視確認：平台 → 帳號 → 年 → 月 → 日 → 貼文；未執行產品測試。

- 2026-11-17：歷史需求更新加入 R013–R020：帳戶清單、全部／指定日期、版本保留、自訂路徑、搜尋篩選、針對缺漏重試、手動更新全部。仍只做 planning。
- 登入方向變更：使用者預期三平台免登入。已取代原設計強制登入前置條件；匿名完整可用尚未驗證，可選登入仍待使用者決定。不能靜默降級既定 X replies／IG Stories 範圍。
- 本輪核對本機與上游三平台 extractor 原始碼：X timeline、IG reels_media、TikTok 某些存取結果均有要求登入的分支。來源為 gallery-dl 上游 gallery_dl/extractor/{twitter,instagram,tiktok}.py；這不是實站匿名成功／失敗測試。
- 歷史狀態（本輪已取代）：當時帳戶清單／日期／版本／搜尋 SVG 未製作；現已由六張新版 SVG 補齊，舊登入強制前置文案已移除。
- 2026-11-17：新增 R021 登入體驗可行性方向：app 開獨立登入視窗，手動登入後自動讀該 session cookies，再由下載工具唯讀驗證。官方 Electron Cookies API 支援此機制；現有 main.js 有 Fanclub 登入視窗，但其 Authorization token 擷取不可直接當作 SNS cookies 實作。下一步的可行性計劃須逐平台驗證登入、cookie 交接與失效處理；目前未開啟任何 SNS 登入測試或取得憑證，仍只改設計／MD。

- 2026-11-17 本輪：使用者接受六項建議預設，新增 R022–R028，明確先完成 SVG、不寫產品 code。六張 SVG 初稿已產出；目前正做逐張瀏覽器視覺核對與獨立需求 review，尚未標記視覺確認或開始實作。
- 本輪設計稿交付完成：更新 sns-downloader.svg、account-settings.svg、library-layout.svg、post-detail.svg、login-settings.svg、interaction-states.svg，另新增設計稿索引 README.md，全部位於 docs/design/。上行「正在核對」狀態由此結果取代。
- 獨立 reviewer 提出每帳戶結果未完整呈現、進度單位混淆、暫停與停止未分開三點；已修正。每帳戶可查看六類數字；停止畫面只提供返回帳戶清單，不保留繼續按鈕。已完成無缺漏帳戶的只補缺漏按鈕停用。
- 靜態驗證：六張 SVG 全部 XML 解析成功，含指定三個核心色碼，無 scripts／外部圖片依賴；Chrome 逐張截圖檢視完成。最後幾何檢查六張共 310 個文字元素，畫布外文字 0、超過 3px 文字交疊 0。主要粉紅按鈕深色字對比約 4.96:1，前景文字對背景約 11.34:1。
- 本輪僅修改 REQUIREMENTS.md、PROGRESS.md、設計規格與 docs/design/ 文件／SVG；沒有產品 code、憑證擷取、實站下載或打包測試。未將使用者接受預設當成 SVG 已批准；下一步等待設計回饋，繼續保持 planning。

### 2026-11-21 登入驗證診斷

使用者截圖顯示 IG／TikTok 均未能驗證。小型 phase：以 shell、現有 Node fixtures 和 Electron 測試核對登入視窗、cookie 變更和唯讀探測邊界。已找到三個可重現的程式問題：不同探測結果摺成同一提示、登入 marker 值不變時忽略其他 cookies 更新、匿名回傳擷取錯誤時可能完全跳過已保存的登入。真實登入原因仍需新版在使用者 session 中回報。驗收不讀取現有登入資料。

- 同一輪使用者另提供 X 登入頁的暫時限制截圖。限制發生於網站登入階段，截圖不足以判定是登入次數或其他原因。參考 X Help Center（https://help.x.com/en/managing-your-account/locked-out-after-too-many-login-attempts）。沒有自動重試網站登入或存取真實憑證。
- IG／TikTok 修正已接到 src/main/sns/login.js、main.js、sources.js 及 renderer/sns/app.js：同一 session 更新 cookie 時再檢查，重新檢查結果按未 capture、拒絕、空清單、網絡、工具及逾時等狀態回報。probe 用三篇貼文範圍，不取媒體。匿名無結果且沒有明確網絡／限流／缺工具時，更新可嘗試已保存 session。Node 全套測試通過，三個登入 regression fixtures 涵蓋錯誤分類、cookie 更新、匿名失敗 fallback。平台登入後的實際存取尚未驗證。
- 本輪 Electron fixture、macOS arm64 打包和 ASAR 驗證通過。新版 dist/login-fix/mac-arm64/SNS Downloader.app 單獨保存，內含最新驗證程式和提示。下一步可在新版本按 IG／TikTok「重新檢查」，利用分類提示確認真實登入卡在哪一層。X 先按網站提示等限制解除。

### 2026-11-21 免登入單篇下載重驗

使用者最新指示原文「試下唔登入都下載相片影片先」。今輪先驗證六條指定公開貼文的直連，全部使用 ignore-config、沒有 cookie 參數。gallery-dl 1.32.12、yt-dlp 2026.08.19。成功檔案寫入臨時目錄並用 ffprobe 核對，完成後清理。

| 樣本 | 本輪結果 |
|---|---|
| X 相片 1828419307900149793 | 兩張 1538 × 2048，第一張取得 ALT；第二張 ALT 未能確認。重跑跳過兩張圖 |
| X 影片 2123402064961425677 | 720 × 1280，有聲；重跑跳過影片 |
| IG 相片 Df1-qHsmG5H | gallery-dl HTTP 401，yt-dlp 零可用格式 |
| IG Reel DfwuSMVvum9 | 1080 × 1920，有聲，透過 yt-dlp 直連 |
| TikTok 相片 7631562466413186324 | gallery-dl HTTP 403；yt-dlp 不支援該相片 URL |
| TikTok 影片 7709867182896844050 | gallery-dl HTTP 403，但本輪 yt-dlp 直連成功，實際檔案 2766734 bytes、1080 × 1920、有聲。此結果更新上一輪無格式紀錄 |

四條單篇成功。截圖的 App 更新動作仍先列出帳戶貼文，並未直接使用上述貼文連結。沒有修改產品 code。檢查本機設定只輸出加密 session 記錄是否存在：IG／TikTok 有，X 沒有。未解密、驗證或使用真實 session。免登入帳戶批量更新、IG／TikTok 相片與登入後存取仍待驗收。

### 2026-11-21 SocialArchiveCore 參考調查

唯讀檢視 /Users/nokilkh/Downloads/SocialArchiveCore-main 的 X／IG packages；此目錄沒有 Git metadata，未執行該專案、未登入、未移植產品程式。

- X 的 capture.py 用暫存檔、內容長度、SHA-256 收據處理媒體，archive.py 以整篇 .building 目錄驗證後改名發佈，再以 PostgreSQL 記錄。X 版本按正規化內容與媒體計算，布局為 complete/users/<owner>/{posts,references}/<post-id>/<version>，含 record.json 與 manifest.json。檔案修復保留受損原檔。IG 依 library/instagram/<target>/<subcategory> 存檔，media.sqlite3 以穩定 media ID、相對路徑、大小及 SHA-256 核對，另記錄貼文的預期子媒體和帳戶關聯。
- 現有 SNS Downloader 已逐媒體驗證大小與 SHA-256、暫存後改名；metadata.json 及 index.md 分別原子寫入。參考價值最高是整篇完成狀態與一致性（中斷後可恢復兩份 metadata）、明確的原始預期媒體清單，以及可由 archive 重建的索引。保留 R010–R011 目錄／Markdown、R028 文字與 ALT 版本規則，以及手動作業。IG 命中已知貼文後停止的策略會漏掉更舊缺檔或 ALT 變更，不能直接套用到完整更新。
- 該專案沒有 TikTok package。X README 要求操作員提供已登入 session；IG 的 core.py build_config 即使有 anonymous 分支，當前路徑仍要求存在 cookie file，不能當成免登入解法。可將 session 必要欄位檢查作後續研究，沒有讀取或使用真實 cookies。

- 2026-11-21：使用者確認 ALT 備份只限 X 圖片，已同步 R006 和設計。靜態核對 sources.js：只有 X 圖片會產生 present 或 unknown，其餘媒體為 na。archive.js 的 ALT 缺漏判定只計 unknown。今輪只更新文件。

### 2026-11-21 參考 SocialArchiveCore 下載實作

進行中。現有 Electron 跨平台存檔入口接收兩種媒體路徑：CDN 檔案及 yt-dlp 下載影片。以參考的 capture.py 流式傳輸、拒絕 HTML、核對 Content-Length 及有上限的重試為基礎，接入現有 archive 驗證。測試包含截斷、HTML 偽成功、重試、限流停止與公開樣本。依寫計劃及 TDD 指引，先驗證本機 fixture，再重驗授權的公開貼文。參考的 twscrape、IG Web GraphQL 分別需要已登入 session，後者另釘選 gallery-dl 1.32.17；現有為 1.32.12。此階段移植傳輸邏輯，沿用現有探索入口及 TikTok 行為。

- 傳輸 phase 已完成，改動 src/main/sns/mediaDownload.js、archive.js、sources.js。CDN 回應必須為完整 200 媒體，拒絕網頁與非媒體回應，有有效 Content-Length 時核對串流長度，暫時性錯誤最多三次，權限拒絕與限流不在單一檔案重試。原有 ffprobe、SHA-256、相對路徑及存檔規則繼續使用。
- npm test 通過，涵蓋截斷後重試、HTML 偽成功、403／429 不重試。使用現有驗收連結，X 兩張原圖 1538 × 2048、X 影片 720 × 1280 有聲及 IG Reel 1080 × 1920 有聲均確實保存到臨時目錄；X 重跑跳過完整媒體。會話、公開帳戶清單及 IG／TikTok 相片未在本次重新驗證。
- 新未簽署 macOS arm64 build 位於 dist/verified-download/mac-arm64/SNS Downloader.app，package 邊界檢查通過。本機查到 instaloader、twscrape、psycopg 未裝，Linux findmnt 及 psql 不在 PATH；沒有啟動參考專案的帳戶擷取器或引用使用者登入資料。IG 的本輪影片證據是既有 yt-dlp 路徑的回歸結果。

### 2026-11-21 參考 SocialArchiveCore 登入資料匯入

本機實作及驗收完成，實站存取待驗證。參考專案的 X／IG 由操作員提供登入後匯出的檔案，並檢查必要 cookie 欄位。以寫計劃、系統化除錯和 TDD 指引核對現有流程，分兩步驗收。

1. Node fixture 驗證平台、必要欄位、有效期及檔案格式，沿用獨立登入視窗的加密儲存與平台設定。
2. 以 Electron 原生選單及檔案選擇器接入，驗證有效和無效匯入對應的狀態，以及匯入只試讀、不觸發備份。以 Node、Electron fixture 和本機 macOS 打包核對。實站存取依賴有效使用者 session。

- 已完成兩步的本機驗收。src/main/sns/login.js 正規化有效平台 cookies，src/main/sns/main.js 提供「檔案 → 匯入登入資料」、重用加密儲存及驗證，src/main/sns/sources.js 禁止試讀工具重寫暫存 jar。X 支援帶網域 JSON 及 Netscape，IG 支援 Netscape。沒有採用參考 X 的無網域 Cookie header 貼入。
- `npm test` 全套通過。安裝的 gallery-dl 離線接受轉換後的 X session jar。Electron smoke 使用臨時設定、合成 cookie、模擬檔案選擇與加密，驗證成功試讀、暫存 jar 0600 和清理、無效檔案保留原登入、沒有自動備份。Electron 在 macOS 沙箱內因 SIGABRT 無法起動，在沙箱外通過。
- macOS arm64 未簽署打包及 ASAR 邊界檢查通過。實際網站登入、真實帳戶試讀和 Windows 驗收仍待測，未讀取現有 Cookie 或帳戶資料。

### 2026-11-21 帳戶更新除錯

1. 重現完成。使用者回報「全部都係download唔到」。以系統化除錯、gallery-dl 及 yt-dlp 比較指定帳戶／單篇。X 回覆清單 AuthRequired，公開 /tweets 成功。IG 1.32.12 KeyError，臨時 1.32.20 回報未找到帳戶，相片直連仍 401。TikTok 1.32.12 帳戶清單 403，臨時 1.32.20 出現限流／逾時，未更動全機 CLI 版本。
2. 本機實作完成。src/main/sns/sources.js 及 main.js 在原本路徑受阻時，使用 X 公開 /tweets 或 TikTok yt-dlp 公開影片清單，保留回覆／相片未核對狀態。archive.js 核對實際影片尺寸是否符合來源或 yt-dlp 所選尺寸，已驗證檔案重跑跳過。renderer/sns/app.js 區分零內容失敗與部分完成，顯示結構化錯誤原因。
3. 已完成限定樣本驗證。npm test、Electron smoke（X 回覆拒絕後備份公開貼文、兩條路徑失敗時顯示未能備份）與 macOS arm64 打包及 ASAR 驗證通過。

- X 公開清單本輪讀到 12 篇，12 篇早於截圖的 2026-11-01 下限。以較早一篇驗證確實存檔兩張 1536 × 2048 原圖，重跑跳過兩張。
- TikTok 後備清單讀到指定帳戶三條符合截圖範圍的影片。其一存檔 720 × 1280、有聲，重跑確認跳過，傳輸呼叫只一次。相片批量覆蓋仍未驗證。
- 指定 IG Reel 直連重驗 1080 × 1920、有聲。IG 帳戶清單未能核對，Reel 直連不等於帳戶更新可用。
- 實站檔案只放臨時資料夾，驗收完已清理。沒有使用真實登入資料，亦沒有更改使用者的日期範圍或備份。X／IG 登入後完整範圍、TikTok 相片及 Windows 仍待驗收。

### 2026-11-21 頂欄捲動修正

本機驗收完成。CSS 的 header 跟文件捲動，而視窗可拖曳區域也設於其上。用系統化除錯及 TDD 擴充 Electron smoke，修正前捲動 400px 時頂欄位於 -400px，修正後留在 0px。測試核對 Electron 拖曳與非拖曳區域、頁籤命中測試和正常頁籤操作。沿用已確認的 SVG 頂欄及視窗控制掣空間。測試沒有模擬 macOS 實體滑鼠拖動整個視窗。

### 2026-11-21 按連結補下載相片

X／IG 指定相片直連本機驗收完成，TikTok 相片與批量覆蓋仍受阻。

- 用戶先複製一條官方貼文網址，再按「檔案 → 備份已複製嘅貼文連結」。postLink.js 核對平台、貼文 ID、來源身份與媒體網址。X／TikTok 使用 gallery-dl；IG 讀取公開 embed 的相冊資料並選最大可見圖片，沿用 archive 的存檔、重跑驗證與去重。此入口只處理指定貼文，不受帳戶日期範圍限制。
- 免登入實測：X 樣本兩張 1538 × 2048，重跑跳過兩張，第一張有 ALT，第二張 ALT 未能核對。IG 樣本三張 3024 × 4032、2541 × 3388、2846 × 3790，重跑跳過三張。IG embed 沒有發佈日期，存入未知日期。臨時驗收檔已清理。
- IG 一般相片入口 401，公開帳戶頁有帳戶 ID 但無可用清單。以暫存新版 gallery-dl 直接用數字 ID 試讀，貼文逾時且相片入口仍失敗。TikTok 相冊連結使用 1.32.12 及 1.32.20 都未返回可用相片，公開照片頁與播放器也沒有相冊欄位。無法核對 TikTok 照片內容或 IG 批量。
- npm test、Electron smoke（以模擬剪貼簿及公開貼文回應核對選單到實際 archive 更新），以及 macOS arm64 未簽署打包／ASAR 邊界檢查全部通過。
- 2026-11-21 X Chrome 登入（本機驗收完成）。macOS 交由 Launch Services 用日常 Google Chrome 開 X 固定官方 URL，其他桌面平台使用系統瀏覽器。沿用 R029 的檔案匯入及唯讀檢查。在 Electron smoke 模擬啟動，確認 X 按鈕交接到 Chrome 且沒有新增 Electron 登入窗；Node 套件測試及 macOS arm64 打包檢查通過。實際 Chrome profile 登入及 X 存取仍待使用者驗證。
- 2026-11-21 X 登入交接提示（本機驗收完成）。系統化除錯核對外部開頁只返回啟動結果。main.js 在沒有 X 登入資料時切換「等待匯入」，renderer 設定頁呼叫既有原生檔案選擇器。Electron smoke 先重現缺失狀態，再用合成檔通過 Chrome 交接、設定頁匯入、唯讀試讀及保留原憑證測試。Node 全套、macOS arm64 打包與套件邊界檢查通過。未使用使用者 Chrome 憑證或確認實站下載。
- 2026-11-21 X Chrome 一鍵登入及試讀（本機驗收完成）。src/chrome-x-session 配套擴充套件等候該 Chrome profile 的兩個 X Cookie，使用一次性加密 loopback 交畀 src/main/sns/chromeHandoff.js，同一按鈕開官方登入頁。首次須在正確 profile 載入擴充套件。Playwright／Chrome for Testing 用臨時 profile 驗證先等候、後收到兩個合成 Cookie、其他 Cookie 不交接、拒絕外部來源及未認證資料、成功後關閉接收器。Electron smoke 用合成封包驗證保存及試讀。npm test、macOS arm64 打包及擴充套件和 ASAR 核對通過。
- X 回覆清單受限時可試貼文清單，IG 一般貼文受限可試 Reels；備用途徑成功只回報相關範圍。IG 清單錯誤與平台 HTTP 403 保留已存登入。沒有測試日常 Chrome profile、真實 X／IG 登入或回覆／帳戶範圍完整率。
- 2026-11-21 X 貼上登入資料（本機驗收完成）。以 docs/design/x-login-paste.svg 沿用現有設定對話框樣式。src/renderer/sns 遮蔽及清空兩欄；main.js 用 X 限域 cookie jar、既有安全儲存及唯讀試讀。Node fixture 核對必填、超長及內嵌換行。Electron smoke 用合成資料驗證取消清空、格式無效保留舊值、有效資料儲存時不留下明文、試讀及沒有開始備份。SVG XML、macOS arm64 打包及套件檢查通過。未用真實登入資料。

### 2026-11-21 TikTok 指定相片下載診斷

- 已完成指定樣本的唯讀診斷。用現有直連入口、gallery-dl 1.32.12、yt-dlp 2026.08.19、curl、Python HTMLParser 及 macOS sips 核對貼文探索和本機相片資料。匿名 gallery-dl 報 HTTP 403 且輸出空媒體清單。yt-dlp 回報 Unsupported URL。App 在沒有相片清單時便停止，未進入相片 CDN 傳輸或存檔。
- 公開貼文 URL 有無 `image_index=2` 均回 HTTP 200，頁面初始 JSON 缺 `webapp.video-detail`，亦沒有相冊清單。App 正規化兩個 URL 為相同貼文連結。該參數只影響開啟位置，兩份相冊快照分別停在第一、第二張。
- 兩份 SingleFile HTML 的相冊區均含同樣兩張內嵌 JPEG，按輪播索引及 SHA-256 去重，兩張均以 sips 核對為 2160 × 2880。重複節點是輪播副本。試驗的臨時 JPEG 已清理。
- 本次只更新診斷記錄，未改產品。登入後是否能由現有工具讀取、瀏覽器實時相片擷取及最高畫質仍待核對。未讀取或使用使用者的登入資料。
- 2026-11-21 IG／TikTok 重新檢查（限定範圍驗收完成）。TikTok 主清單受限時，重新檢查試讀同一條 yt-dlp 公開影片路徑，有結果則顯示影片可讀及相片清單未核對。以模擬主清單 403 配合實站後備清單核對，yt-dlp 讀到三條影片；Node suite 與 Electron smoke 通過。
- TikTok 指定單篇在本機 gallery-dl 1.32.12 回 403，1.32.21 成功。macOS 包裝隨附官方 wheel（SHA-256 f3f3e62bf3863cae6e1635045748c50fc51d52c111ca64b068d618e9334e8811，內含上游許可），只喺 TikTok 單篇相冊用本機 Python 版 gallery-dl 載入。已核對打包資源實際下載兩張 2160 × 2880 相並重跑跳過。
- IG 公開帳戶試讀以臨時 gallery-dl 1.32.21 重試，貼文清單回 401，Reels 返回解析錯誤。既有單篇入口重新下載三張相（3024 × 4032、2541 × 3388、2846 × 3790），重跑跳過。臨時下載已清理；未使用真實登入資料或更改全機工具，IG／TikTok 批量相片清單仍待驗證。
- 2026-11-21 IG／TikTok 參考及失敗檔案。由該帳戶 metadata 取五個公開貼文 ID。yt-dlp flat playlist 以影片 URL 和正時長傳回全部五篇，但 gallery-dl 1.32.21 核對均為相冊。GitHub tt-dlp 的 client.py（105b4b7）按 imagePost／imagePostInfo 等結構辨識相冊，可參考其類型選擇；未移植第三方程式。
- TikTok 本機及限定實站驗收完成。sources.js 按同一貼文及帳戶身份確認相冊，main.js 於帳戶更新及補缺重試採用，archive.js 移除確認誤分類的失敗影片項目並保留既有檔案。隔離 Electron profile 用實際「只補缺漏」入口及公開資料修復五個相冊，共 18 張照片，失敗數 0。Node、Electron smoke、macOS arm64 套件均通過，根目錄 bundle 已核對。未寫入使用者現有備份。
- IG 依最新指示查 SocialArchiveCore 的 instagram_web_gallery.py、instagram_web_timeline.py、instagram_web_reels.py 及 instagram_web_client.py。自訂 Web GraphQL 直接按 username 讀一般貼文，從回應核對數字帳戶 ID，再按 cursor 分頁；Reels 按數字 ID 有獨立分頁。Instaloader 僅提供已登入 session，gallery-dl 1.32.17 接收各 node 及處理後續下載。獨立比較公開 IG 帳戶，Instaloader 4.16 返回 BadResponseException。沒有移植 IG adapter 或以真實登入驗證。
- 2026-11-22 IG 帳戶清單（本機驗收完成，實站待驗證）。系統化除錯核對 IG 新增 0、清單讀取失敗；TikTok 重跑 18 跳過、0 失敗，並逐張驗證指定五篇的 18 個 SHA-256，完整清單仍受平台限制。更新 TikTok 界面提示以區分覆蓋限制及已保存內容。
- src/main/sns/instagramWeb.js 依 SocialArchiveCore 的已登入一般貼文清單做法，限域 cookies、讀取 Web 頁面所需資料、按 username 與 cursor 分頁，保留確定身份與原場景可取得最高媒體。偵測登入／403／429、異常頁結構及重複 cursor。只接入一般貼文；Reels／Stories／精選沿用既有入口。IG 重新檢查與帳戶更新都會用新路徑。
- Node fixtures 驗證兩頁、外域 Cookie 排除、身份、最高圖片同原始 ID、拒絕與重複頁。Electron smoke 用合成登入及網頁回應通過匯入、試讀和正常更新寫檔。macOS arm64 包裝檢查與固定交付位置的 app.asar、附帶 wheel 雜湊核對通過。沒有以使用者真實登入試讀或寫入其備份。

### 2026-11-22 X 帳戶備份歷史範圍診斷

- 唯讀核對本機設定、根目錄 ASAR 與備份 metadata。X 帳戶未設起始日，現有 2,447 篇（2,237 篇貼文、210 篇回覆），最早為香港時間 2025-05-03 19:35:38。最近一輪 0 下載失敗、1,558 項媒體資料或品質未能確認，與歷史清單覆蓋分開計算。
- 批量入口由 gallery-dl 1.32.12 讀 `/with_replies`，在指定情況改用公開 `/tweets`。兩條路徑均未用日期搜尋補回舊帖。匿名實站唯讀試讀確認 2018-09-30 的同帳戶貼文可由 `/status/1046200439425777666` 取得 metadata，但 `/with_replies` 及 2018 日期搜尋在匿名試讀要求登入。
- 現有證據指向帳戶清單的歷史覆蓋限制。仍待以已登入唯讀方式核對時間線末頁的停止原因，以及按日期搜尋實際可取得的範圍。今次只更新診斷記錄，未改程式或備份。
### 2026-11-22 問題原文連結與手動單篇備份

1. 設計完成。沿用備份帳戶頁與結果面板，使用 frontend-design 和 SVG 預覽。XML 與指定色碼檢查通過，Chrome 渲染後目視核對。使用者確認「確認，按 SVG 實作」。
2. 資料與備份入口完成。Electron smoke fixtures 驗證已識別的失敗及受限貼文會保存原文 URL、清單遭拒不會推算未見過的連結。單篇入口以合成 X 相片驗證實際存檔及 SHA-256，重跑只傳輸一次。沿用原有選單、同一工作鎖與 archive。
3. UI 與交付完成。已接上貼上表單、開啟原文及複製連結、未取得連結提示、日文介面。Electron smoke 從帳戶頁驗證已有兩類問題的 URL、開啟及複製、清單拒絕、無效網址、指定貼文實際寫檔、重跑去重，以及原剪貼簿選單回歸。

現有目錄沒有 Git metadata，無法以 Git 查核未提交變更；改動限於本功能直接相關檔案。測試用隔離 profile 與合成平台資料。

- `npm test`、`npm run test:desktop` 及 `npm run check:release -- --packages` 均通過。Electron 需在 macOS 沙箱外執行。源碼、打包 ASAR 中的前後端檔案與附帶 gallery-dl wheel 逐檔比對通過。
- 根目錄 macOS arm64 未簽署 App 已置換，核對執行檔、`app.asar`（SHA-256 `b4460b2a3bbc18636a9962692e7030170a956302497b0568aa57b88528ee703b`）及 wheel 與新 build 一致。本輪未重跑實站、讀取真實登入或改動使用者備份。舊報表缺少的 URL 不會回填。

- 2026-11-22 IG Web 參考傳輸對照（本機驗收完成，實站待驗證）。使用者最近結果在香港時間 00:15，新增 0，原因 ig-web-unverified／profile-unverified／extractor。核對固定 App 對應 manual-post-backup build，該 build 已包括 IG 一般貼文的參考 Web GraphQL 查詢、帳號及 cursor 流程。參考版使用 Instaloader／requests session，並接管 gallery-dl 1.32.17 的 Reels 等入口；SNS Downloader 採 Node Web adapter，其他範圍沿用原入口。
- 比對發現 Node 舊實作忽略 Instagram 在首頁更新的 Cookie。新版本只在當次掃描的記憶體接收同域、適用根路徑的更新，下一頁重新產生 CSRF header；分開報告首頁、清單回應及身份錯誤。未確認 Cookie 輪替是否用戶實站失敗主因。Node regression 及 Electron smoke 通過，macOS arm64 打包與固定 App 的執行檔、asar、wheel 核對通過。未讀取使用者真實憑證或觸發其備份；本機無 Accessibility 權限執行現有 App 的唯讀按鈕。
### 2026-11-22 已保存媒體計入受限的診斷

1. 診斷完成。隔離 fixture 建立一張最高畫質、ALT 未核實的 X 相片。檔案通過 SHA-256 驗證，重跑沒有傳輸，仍得到 skipped 1、limited 1。現有 archive 以同一計數累計檔案已保存後的確認問題及真正缺失，帳戶結果也會加上清單級原因。
2. 設計待確認。按 R003 以 `docs/design/backup-result-counts.svg` 示範獨立「已保存，待核對」。未開始本輪產品改動；保留其他進行中的 IG 工作。確認後以 Node fixtures 核對新下載、重跑、實際缺檔與不完整相冊，再用 Electron smoke 核對報表與原文操作。

### 2026-11-22 省略無 ALT 的提示及受限計數

單一 phase 完成。依 R006，移除現有詳情與新生成 Markdown 的無 ALT 提示，archive 不再因此增加受限數。可繼續補抓並保留已保存 ALT。

- Node regression 確認修正前受限數 1，修正後新備份及重跑都是 0。已保存圖片不重傳、有 ALT 照常保存、缺相片仍計入受限。Electron smoke 驗證舊式 `unknown` metadata 的相片仍顯示，但省略 ALT 提示。全套 Node、Electron 與 release package 檢查通過。
- 使用者確認退出後置換根目錄 arm64 bundle。執行檔、ASAR 與 wheel 同已驗證 build 一致。ASAR SHA-256 為 `31d4df71b47dbc3796dab48b33c764eeb8c1c5a6101fe61dadbe9b43c6421a13`。今輪沒有重跑實站或批量改寫舊 Markdown、帳戶報表。

### 2026-11-22 指定起日至止日的帳戶備份

1. 設計完成。以 frontend-design 沿用現有帳戶對話框，新增第三個選項及起止日期欄。SVG 已通過 XML、色碼及 Chrome 畫面核對；使用者已確認。
2. 篩選及表單完成。沿用 `since` 加可選 `until`，在儲存層驗證日期，帳戶更新按香港時間起日零點（包含）至止日翌日零點（不包含）套用。舊帳戶缺 `until` 視為無上限。新增／編輯、日期顯示及兩種語言同時接入。Electron 合成貼文核對同日與午夜前後四個時間點，驗證兩篇入圍並寫檔、逆序及無效日期被拒、編輯重開保留日期、只補缺漏忽略範圍外舊檔。首次更新後的 smoke 曾在既有圖片預覽處逾時，完整重跑通過。Node suite 通過。
3. 交付完成。macOS arm64 本機包裝、`npm run check:release -- --packages`、ASAR 與附帶 wheel 比對均通過。根目錄 App 的二進位、ASAR 和 wheel 與新 build 一致，ASAR SHA-256 為 `0912cf029c1baa214a7e562081fa8f22b7c0d28e5883e44ebae851c2ee6a97d7`。今輪使用隔離測試資料，未執行實站備份。沒有 Git metadata。

### 2026-11-22 X 指定歷史範圍新增 0 篇

- 診斷完成。起止日目前只過濾時間線已返回的貼文。清單有貼文但全在範圍外時，沒有任何原因計入受限，仍更新最近成功日期。
- 本機修正完成。指定起止日且時間線未達起日或未取得範圍內貼文時，以已保存的 X 登入執行日期搜尋，按帳戶與貼文 ID 合併，儲存時保留精確香港日期邊界。搜尋未能取得範圍內貼文時列明未核對，保留上一次成功時間。
- Electron smoke 修正前因未呼叫搜尋失敗，修正後通過。合成清單由 2026 年貼文回補指定 2018 年歷史貼文，並核對兩側午夜邊界、零結果狀態及成功時間。Node suite、macOS arm64 build、release 檢查皆通過。確認未有本機 App 執行後替換根目錄 ASAR，內容與新 build 相同，SHA-256 為 `ddb82af63af03301b5e097f780d93a2d9d62f2de854ef0b82e65ea21b55d3f8e`。未使用真實登入執行日期搜尋或寫入現有備份，實站歷史搜尋覆蓋待核對。

### 2026-11-22 專案檔案清理

- 按使用者要求清理多餘檔案。以檔案內容及符號連結目標核對編號副本，並保留根目錄 App 同 `dist/x-history-range`。11 個舊測試打包、舊打包 debug 清單、Finder 快取同依賴副本，按原有相對路徑放入 `SNSDownloader-cleanup-2026-11-22-b7zn7zf4`，由 macOS `trash` 移走。
- 已在 Finder 垃圾桶確認清理資料夾存在。核對專案內 `dist` 只剩最新打包，`node_modules` 由 947 MiB 降至 474 MiB，`dist` 由約 3.1 GiB 降至 265 MiB。`npm test`、`npm run check:release -- --packages` 及兩份 `app.asar` 的 SHA-256 比對通過。今輪未啟動 App 或執行實站測試。

### 2026-11-22 X 日期清單限流

- 本機報表有 `rate-limit` 及 `x-date-unverified`，實際選段為 2018-09-01 至 2025-05-03。目標帳戶有較早一輪已備份的 2018 年 9 月 7 篇及 4 個媒體。報表沒有保存發生限流的端點。程式可重現時間線限流會阻止日期搜尋。
- 本機修正完成。指定起止日而且有已保存 X 登入時直接讀日期搜尋。gallery-dl 搜尋遇限流退出，保留已取得的清單項目，並回報日期覆蓋未核對。沿用加密登入、精確香港日期邊界、身份核對及存檔去重。
- Electron smoke 先重現舊版誤先讀時間線，再驗證新版直接搜尋、保存限流前取得的 2018 貼文、不另起時間線請求、保留上次成功時間。全套 Node 測試與 release package 檢查通過。打包改用已安裝的 Electron 45.4.1 當作本機來源。
- 本機 App 閒置並正常退出後，以原子交換安裝完整 arm64 bundle。安裝與打包 ASAR 雜湊相同，為 `eb3e4454ec9bbe019b7730feddb3945822e87889bff2c661f143e92424dcb5b9`。已重開並核對原有日期範圍及 X 嘗試時間。未啟動實站備份或改寫現有備份。2018 至 2025 的實站覆蓋仍待核對。


### 2026-11-22 R039 IG 帳戶分頁

進行中。修改 IG Web 清單及既有報告，以 Node 驗證 109 頁與停止保護，使用 Electron Builder 及 verification-before-completion 核對本機交付。目錄無 Git metadata。

完成本機交付。舊版 109 頁 fixture 只取 1,200 篇，新版取齊 1,302 個獨立 ID；probe 只讀一頁。instagramWeb.js 按游標分頁，main.js 保存掃描摘要，renderer/sns/app.js 顯示頁數、篇數及停止原因。npm test、Electron smoke、release package 檢查通過。已原子置換根目錄 App，逐項核對與 dist/ig-pagination-local/mac-arm64 打包版相符。已開視窗需退出重開以載入新版。未執行實站備份，原有日期範圍與平台可見性仍影響結果。

### 2026-11-22 R040 X 歷史回補

進行中。以現有 gallery-dl 及 Node 分段搜尋、重用 archive 寫檔、Electron Store 保存掃描進度。以 Node 與隔離 Electron 驗證空段、分段、限流接續及舊帖，再按 R035 打包核對。目錄無 Git metadata。

完成本機驗收與 R035 交付。xHistory.js 依 UTC 日期向前查至 2006-03-21，預設 30 日，單段返回至少 200 篇時拆細，可縮至一天。main.js 把成功查過且已處理的已結束日期合併儲存，當日保持可重查。報告顯示歷史搜尋狀態及中斷日期。README 已更新。npm test、隔離 Electron smoke、arm64 build、release 檢查通過。實際 App 入口 fixture 跨空月份找回 2018 貼文、限流保留部分結果及重跑不重複新增；Node 驗證跨段接續、密集拆分與寫入中斷。根目錄 App 已原子交換，逐項核對打包內容。未使用真實 X 登入測試或寫入使用者備份。

### 2026-11-23 R041
以 Node 日期與限流 fixtures、Electron smoke 和打包檢查驗證香港月份分段、保存後接續、停止及交付。目錄無 Git metadata。
完成本機交付。xHistory.js、main.js、sources.js 及結果畫面已更新。Node 驗證半年逐月先保存再前進、兩次限流各等待 1800000 ms（模擬時間）；Electron smoke 驗證部分保存、等待時停止及跨空月取回舊帖。打包檢查及根目錄 bundle 與 build 遞迴比較通過。未做實站下載或實等半小時。香港日期覆蓋用新鍵，首次更新會重新核對舊 UTC 覆蓋。

2026-11-23 R041 等待時間改為 15 分鐘。兩處等待、繁中及日文提示、README 與測試已同步。npm test 通過，模擬重複限流各等 900000 ms。已通過打包檢查及根目錄 App 逐檔比對，未實站等候。

### 2026-11-23 R042 貼文詳情返回列表

單一 phase 完成。Electron smoke 重現長貼文捲動後返回按鈕向上偏移 24px。修改 `src/renderer/sns/{styles.css,index.html,app.js}`，固定返回列，只有貼文內容可捲動，並在開啟詳情時重設內容捲動位置。

- `npm run test:desktop` 通過，核對長貼文捲到中段、底部時返回按鈕保持原位且可按，關閉後搜尋條件及卡片焦點保留。`npm test` 通過。
- Electron Builder 產出 macOS arm64 App，`npm run check:release -- --packages` 通過，ASAR 內三個 renderer 檔案與已測試源碼一致。按 R035 原子置換根目錄 App，以遞迴 checksum 及 symlink 核對成功。ASAR SHA-256 為 `5e486fbff7d801ca8affd0b997747ebcc74ea41584a73bc5aba5edfbc6a89378`。
- Electron 測試用隔離 fixture 跑源碼。本輪未另行開啟打包版或使用真實備份。目錄沒有 Git metadata。

2026-11-24 TikTok 修復進行中。先從 HAR 核對影片與媒體變體，再接入 Electron 網頁清單，使用擷取樣本、Node 測試及打包驗證。

指定影片已回復至根目錄 7710980391611518226.mp4，894092 bytes，完整音畫解碼通過。新增 src/main/sns/tiktokWeb.js，接入登入驗證、帳戶列舉與單篇後備，依官方頁面實際回應、作者及游標核對。支援依序解析相冊、影片變體及部分結果，Electron 使用隔離記憶體 session。調整 main.js、sources.js、login.js、renderer/sns/app.js；tests/tiktok-web.test.js 覆蓋錯誤回應、作者及缺圖。
  
已驗證 HAR 兩頁各 16 篇、目標 1080p 變體、另一作者的三張相冊樣本。隔離 Electron 網頁模擬兩頁連續游標至終頁，輸出影片及兩張圖片。npm test、Electron 既有桌面測試及套件邊界檢查通過。macOS arm64 根目錄 App 已原子更新並與打包版遞迴核對，五個變動源檔與 ASAR 相符。

實站完整備份仍受阻。以 App 已保存 TikTok 登入資料驗證，作者頁成功導航，兩次作者清單 HTTP 200 回應本文均為零 bytes。此環境無法實證讀至終頁或取得該作者自己的相冊。已加入對應狀態；瀏覽器錄製僅用於離線核對及回復指定媒體。

2026-11-24 TikTok「下載工具檢查逾時」截圖跟進。login.js 原本遇到主工具逾時會跳過獨立影片清單檢查，tests/tiktok-web.test.js 新增 regression 先重現 timeout，再驗證有影片時回 videos-access、無結果時仍回 timeout。全套 npm test、macOS arm64 打包及套件檢查通過。根目錄 App 已更新，遞迴 checksum 和 ASAR 中的 login.js 已核對。用隔離 Electron 設定、App 已保存的 TikTok 登入，從真實 check-login IPC 驗證一次，21 秒回 videos-empty-body：公開影片清單有結果，帳戶網頁清單回應空白。實站這一輪未觸發同一個逾時，完整相片清單及媒體下載未驗證。

2026-11-24：核對新 Chrome profile 作者清單同樣回 HTTP 200 空本文。Phase 1 移除 X 瀏覽器及檔案入口、補 DevTools 指引。Phase 2 用 HAR 實際作者清單與已捕獲媒體走既有備份流程，以隔離目錄核對。

實作時發現 yt-dlp 的公開 creator/item_list 作者清單會交回逐篇結構，改由該路徑自動分頁。未加入 HAR 匯入入口。resources/tiktok-plugins 只抽取備份所需作者、日期、文字及媒體欄位，用於試讀、帳戶更新及單篇。以桃呼帳戶實站取得 727 篇及終頁標記，1 篇有相冊欄位；App 的更新入口限定相冊當日，在隔離目錄寫入 9 張並重新核對檔案，失敗 0。最初指定影片由實站存檔 894092 bytes、1080 × 1920、有聲。未逐一下載其餘媒體。
X 設定、帳戶錯誤提示、選單及 IPC 均改為手動貼上，打包已移除 X Chrome 擴充套件及交接程式。沿用已加密登入，App 內中日文指引與 README 已更新。npm test、桌面整合及 release 檢查通過；X 貼上／取消／無效值／有效值使用隔離 fixture。實站 TikTok check-login 4 秒回 creator-access。根目錄 macOS arm64 App 已原子置換，核對整個套件、ASAR 入口與隨附 extractor 一致。
