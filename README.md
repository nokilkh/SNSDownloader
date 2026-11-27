# SNS Downloader

[繁體中文](#繁體中文) | [English](#english) | [日本語](#日本語)

---

## 繁體中文

**SNS Downloader** 是一款桌面應用程式，能將 **X (Twitter)**、**Instagram** 與 **TikTok** 上可存取的貼文與媒體儲存至自選本機資料夾。所有備份均由使用者手動啟動，介面支援 **繁體中文**、**English** 與 **日本語** 切換，並內建跨平台卡片時間線供離線瀏覽與檢索。

### 主要功能

- **多平台備份（X / Instagram / TikTok）**：支援手動更新單一或全部帳戶，已完整下載的媒體會自動跳過。
- **彈性日期範圍**：可選「全部」、「指定日期之後」或「指定日期範圍」（以香港時間 `UTC+08:00` 計算，起止當日皆包含在內），支援日曆選取或直接輸入 `DD/MM/YYYY`（例如 `26/11/2026`）。
  - X 選擇「全部」時會先儲存時間線，再以已儲存登入按香港曆月向前搜尋（密集月份自動拆分）；若遇平台限流會保留已完成結果，等待 15 分鐘後自動重試，並可隨時停止。
- **單篇貼文補備**：在「貼上連結備份」貼上完整 X、Instagram 或 TikTok 原文連結（或使用「檔案 → 備份已複製的貼文連結」），沿用同一儲存位置與去重規則。
- **安全本機登入**：
  - **X**：於「設定 → 貼上 X 登入資料」貼上從 Chrome 開發人員工具取得的 `auth_token` 與 `ct0` 值並測試讀取。
  - **Instagram / TikTok**：使用 App 內建獨立登入視窗（Instagram 另支援於檔案選單匯入 Netscape `cookies.txt`）。
  - 所有登入資料僅加密儲存於本機使用者資料目錄，絕不寫入備份資料夾或 Git 倉庫。
- **跨平台時間線瀏覽**：於「已下載內容」以卡片形式檢視已備份貼文（預設由新到舊，可切換排序），支援按平台、帳戶、圖片／影片／純文字、日期、ALT 文字與關鍵字篩選，即時顯示符合數量；點擊卡片可查看原文、媒體、ALT 與文字／ALT 修改歷史版本。
- **透明結果回報**：於「備份帳戶 → 查看結果」檢視失敗或受限的貼文連結，支援一鍵開啟或複製。
- **清晰本機存檔結構**：每篇貼文獨立存放 `index.md`、`metadata.json` 與媒體原檔：
  ```text
  <備份位置>/X/MomokoHashimoto/2024/08/2024-08-27_210800__1828419307900149793/
  ```

### 環境與工具需求

- **Node.js**（建議 v20 以上）
- 外部下載工具：`gallery-dl`、`yt-dlp`、`ffmpeg`、`ffprobe`
  - **macOS**：執行前可用以下指令確認工具已安裝並位於 `PATH`：
    ```sh
    command -v gallery-dl yt-dlp ffmpeg ffprobe
    ```
    macOS 單篇 TikTok 相冊會使用隨 App 附帶的 `gallery-dl 1.32.21` wheel 並由現有 Python 版 `gallery-dl` 啟動。
  - **Windows**：需確保 `gallery-dl` 可從 `PATH` 執行（Windows 安裝包仍待完整驗證）。

### 快速開始

```sh
npm ci
npm start
```

1. **新增帳戶**：在「備份帳戶」新增平台帳號、設定備份日期範圍，並確認儲存位置。
2. **設定登入**：
   - **X**：在 Chrome 登入 `x.com` → 開啟開發人員工具 → `Application` → `Storage` → `Cookies` → `https://x.com` → 複製 `auth_token` 與 `ct0` 的 Value → 貼入 App「設定 → 貼上 X 登入資料」並按「儲存並測試讀取」。
   - **Instagram / TikTok**：開啟 App 內建登入視窗登入（Instagram 亦可匯入 Netscape TXT）。
3. **開始備份**：按「更新」或「更新全部帳戶」，或使用「貼上連結備份」單篇補抓。
4. **瀏覽內容**：切至「已下載內容」即可離線搜尋、篩選與檢視貼文及媒體。

### 開發、測試與打包

```sh
npm test                 # 執行單元測試
npm run test:desktop     # 執行桌面端冒煙測試（使用臨時資料與模擬擷取）
npm run check:release    # 檢查發佈設定
npm run build:mac        # 打包 macOS（需於 macOS 執行）
npm run build:win        # 打包 Windows
```

### 免責聲明與授權

本工具僅供使用者備份自己具備合法存取權限之內容，請遵守各平台服務條款及相關著作權規範。
本專案採用 [MIT License](LICENSE) 授權（Copyright (c) 2026 nokilkh）。

---

## English

**SNS Downloader** is a desktop application that archives accessible posts and media from **X (Twitter)**, **Instagram**, and **TikTok** into a local folder of your choice. Backups are triggered manually, the UI supports **Traditional Chinese**, **English**, and **Japanese**, and downloaded posts can be browsed offline in a unified cross-platform card timeline.

### Key Features

- **Multi-Platform Backup (X / Instagram / TikTok)**: Manually update a single account or all accounts at once. Previously downloaded complete media is automatically skipped.
- **Flexible Date Ranges**: Back up everything, posts after a specific date, or a custom date range (calculated in Hong Kong Time `UTC+08:00`, inclusive of both start and end dates). Pick dates via the calendar or enter `DD/MM/YYYY` directly (e.g., `26/11/2026`).
  - For X "All" backups, the app saves the timeline first and then searches backward month-by-month (splitting dense months automatically). On rate limits, partial progress is preserved and retried automatically after 15 minutes; you can stop at any time.
- **Single-Post Backup**: Paste a full X, Instagram, or TikTok post URL under **Backup by URL** (or use **File → Back up copied post URL**). Uses the same storage folder and deduplication rules.
- **Local-Only Authentication**:
  - **X**: Paste `auth_token` and `ct0` cookie values from Chrome DevTools under **Settings → Paste X Login** and test the session.
  - **Instagram / TikTok**: Sign in using the built-in isolated login window (Instagram also supports importing Netscape `cookies.txt` from the File menu).
  - Credentials are stored encrypted locally in the app's user data directory and are never written to your archive or Git repository.
- **Cross-Platform Timeline Browser**: Browse archived posts in **Downloaded** as cards (newest-first by default, toggleable sort). Filter by platform, account, media type (images / videos / text-only), date, ALT text, and keywords with live match counts. Click any card to inspect the full text, media, ALT text, and edit history versions.
- **Clear Result Reporting**: Open **Accounts → View Results** to inspect, open, or copy links to failed or restricted posts.
- **Clean Local Archive Structure**: Each post is stored in its own directory with `index.md`, `metadata.json`, and original media files:
  ```text
  <backup-dir>/X/MomokoHashimoto/2024/08/2024-08-27_210800__1828419307900149793/
  ```

### Requirements

- **Node.js** (v20+ recommended)
- External media tools: `gallery-dl`, `yt-dlp`, `ffmpeg`, `ffprobe`
  - **macOS**: Verify tool availability on your `PATH`:
    ```sh
    command -v gallery-dl yt-dlp ffmpeg ffprobe
    ```
    Single-post TikTok photo albums on macOS use the bundled `gallery-dl 1.32.21` wheel launched via your existing Python `gallery-dl`.
  - **Windows**: Ensure `gallery-dl` is available on `PATH` (Windows installer packaging is still pending full verification).

### Quick Start

```sh
npm ci
npm start
```

1. **Add an Account**: Open **Accounts**, add an X / Instagram / TikTok handle, choose a date range, and confirm the storage location.
2. **Sign In**:
   - **X**: Sign in to `x.com` in Chrome → open DevTools → `Application` → `Storage` → `Cookies` → `https://x.com` → copy the `Value` of `auth_token` and `ct0` → paste them in **Settings → Paste X Login** and click **Save and Test**.
   - **Instagram / TikTok**: Use the built-in login window (or import Netscape TXT for Instagram).
3. **Run Backup**: Click **Update** or **Update All Accounts**, or back up individual posts by pasting a URL.
4. **Browse Offline**: Switch to **Downloaded** to search, filter, and view archived posts and media.

### Development, Testing & Building

```sh
npm test                 # Run unit tests
npm run test:desktop     # Run desktop smoke tests (uses temp data & mocked fetch)
npm run check:release    # Verify release configuration
npm run build:mac        # Build macOS package (run on macOS)
npm run build:win        # Build Windows package
```

### Disclaimer & License

Use this tool only for content you have lawful permission to access, and respect each platform's terms of service and applicable copyright laws.
Licensed under the [MIT License](LICENSE) (Copyright (c) 2026 nokilkh).

---

## 日本語

**SNS Downloader** は、**X (Twitter)**、**Instagram**、**TikTok** で取得可能な投稿やメディアを、指定したローカルフォルダーに保存できるデスクトップアプリです。バックアップは手動で実行でき、UI は **繁體中文**・**English**・**日本語** の切り替えに対応しています。保存した投稿は、プラットフォーム横断のカード型タイムラインでオフライン閲覧・検索できます。

### 主な機能

- **マルチプラットフォーム対応（X / Instagram / TikTok）**：個別アカウントまたは全アカウントを手動で更新できます。すでに完全取得済みのメディアは自動でスキップします。
- **柔軟な期間指定**：「すべて」「指定日以降」「期間指定」から選択できます（香港時間 `UTC+08:00` 基準、開始日・終了日とも含む）。カレンダー選択のほか、`DD/MM/YYYY`（例：`26/11/2026`）の直接入力にも対応しています。
  - X で「すべて」を選んだ場合、まずタイムラインを保存し、その後保存済みログインを使って香港暦の月単位で遡って検索します（投稿が多い月は自動分割）。レート制限時は取得済み分を保持したまま 15 分待機して自動再試行し、いつでも停止できます。
- **単一投稿の補完バックアップ**：「URL を貼り付けてバックアップ」に X / Instagram / TikTok の投稿 URL を貼り付ける（または「ファイル → コピー済み投稿 URL をバックアップ」）ことで、同じ保存先・重複排除ルールで単体保存できます。
- **安全なローカルログイン**：
  - **X**：「設定 → X ログイン情報を貼り付け」で、Chrome DevTools から取得した `auth_token` と `ct0` の値を貼り付けて接続テストを行います。
  - **Instagram / TikTok**：アプリ内蔵の独立ログインウィンドウを使用します（Instagram はファイルメニューから Netscape `cookies.txt` のインポートにも対応）。
  - 認証情報はローカルのユーザーデータ領域に暗号化保存され、アーカイブ先や Git リポジトリには一切書き込まれません。
- **横断タイムライン閲覧**：「ダウンロード済み」画面で保存済み投稿をカード一覧で閲覧できます（初期設定は新しい順、並び替え可能）。プラットフォーム・アカウント・画像／動画／テキストのみ・日付・ALT・キーワードで絞り込み、該当件数をリアルタイム表示します。カードをクリックすると本文・メディア・ALT・テキスト／ALT の変更履歴を確認できます。
- **結果レポート**：「バックアップアカウント → 結果を表示」から、失敗または制限された投稿の URL を確認・開く・コピーできます。
- **分かりやすい保存構造**：投稿ごとにフォルダーを作成し、`index.md`、`metadata.json`、メディア原本を保存します。
  ```text
  <保存先>/X/MomokoHashimoto/2024/08/2024-08-27_210800__1828419307900149793/
  ```

### 動作要件

- **Node.js**（v20 以上推奨）
- 外部ダウンロードツール：`gallery-dl`、`yt-dlp`、`ffmpeg`、`ffprobe`
  - **macOS**：起動前に `PATH` 上で利用可能か確認してください：
    ```sh
    command -v gallery-dl yt-dlp ffmpeg ffprobe
    ```
    macOS での単一 TikTok フォト投稿は、アプリ同梱の `gallery-dl 1.32.21` wheel を既存の Python 版 `gallery-dl` から起動して処理します。
  - **Windows**：`PATH` から実行可能な `gallery-dl` を別途用意してください（Windows インストーラーは検証中です）。

### クイックスタート

```sh
npm ci
npm start
```

1. **アカウントを追加**：「バックアップアカウント」で対象アカウントを追加し、バックアップ期間と保存先を確認します。
2. **ログイン設定**：
   - **X**：Chrome で `x.com` にログイン → デベロッパーツール → `Application` → `Storage` → `Cookies` → `https://x.com` → `auth_token` と `ct0` の Value をコピー → アプリの「設定 → X ログイン情報を貼り付け」に貼り付けて「保存してテスト」を押します。
   - **Instagram / TikTok**：内蔵ログインウィンドウからログインします（Instagram は Netscape TXT インポートも可）。
3. **バックアップ実行**：「更新」または「すべてのアカウントを更新」を押すか、URL を貼り付けて単一投稿を保存します。
4. **オフライン閲覧**：「ダウンロード済み」タブで投稿やメディアを検索・フィルタリングして閲覧できます。

### 開発・テスト・ビルド

```sh
npm test                 # ユニットテストを実行
npm run test:desktop     # デスクトップのスモークテストを実行（一時データ・モック取得を使用）
npm run check:release    # リリース設定を確認
npm run build:mac        # macOS パッケージをビルド（macOS 上で実行）
npm run build:win        # Windows パッケージをビルド
```

### 免責事項・ライセンス

本ツールは正規のアクセス権限を持つコンテンツのバックアップのみを目的としています。各プラットフォームの利用規約および著作権法を遵守してご利用ください。
[MIT License](LICENSE) の下で公開されています（Copyright (c) 2026 nokilkh）。
