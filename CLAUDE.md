# CLAUDE.md — React ノベルゲームエンジン for DLsite

## プロジェクト概要

DLsite成人向け同人ノベルゲームを販売するための、React製ノベルゲームエンジンを開発中。
Electron でパッケージングし Windows exe として DLsite に出品する。

### 目標

- **自作エンジンを資産化**: 1作目で基盤を作り、2作目以降は使い回す
- **販売先**: DLsite（同人・成人向け）
- **配布形式**: Windows exe（Electron + electron-builder）
- **強み**: ストーリー・テキスト量、AI画像生成（Stable Diffusion）

---

## 技術スタック

| 区分 | 技術 |
|------|------|
| フロントエンド | React 18+, CSS-in-JS (inline styles) |
| パッケージング | Electron + electron-builder |
| 言語 | JavaScript（TypeScript移行は任意） |
| フォント | Noto Serif JP（Google Fonts） |
| 画像素材 | Stable Diffusion で AI 生成（PNG） |
| BGM/SE | Web Audio API or HTML5 Audio (.ogg, .mp3) |
| セーブデータ | Electron: fs でローカルファイル保存 / ブラウザ: localStorage |

---

## アーキテクチャ

### シナリオデータ形式

シナリオは JavaScript の配列として定義する。各要素がゲームコマンド。

```js
const SCRIPT = [
  { type: "bg", src: "classroom", transition: "fade" },
  { type: "bgm", name: "morning_theme" },
  { type: "chara", id: "sakura", position: "center", expression: "smile" },
  { type: "dialog", speaker: "桜", text: "おはよう、先輩。" },
  { type: "chara_mod", id: "sakura", expression: "shy" },
  { type: "choice", options: [
    { text: "選択肢A", jump: 10 },
    { text: "選択肢B", jump: 15 },
  ]},
  { type: "se", name: "chime" },
  { type: "chara_hide", id: "sakura" },
  // 画面効果（未実装）
  { type: "effect", name: "shake" },
  { type: "effect", name: "flash", color: "#fff" },
  { type: "effect", name: "fadeout", color: "#000", time: 1000 },
];
```

### コマンド一覧

| type | 説明 | パラメータ |
|------|------|-----------|
| `bg` | 背景変更 | `src`, `transition` (fade/crossfade/none) |
| `bgm` | BGM再生 | `name`, `loop` (default: true), `volume` |
| `bgm_stop` | BGM停止 | `fadeout` (ms) |
| `se` | SE再生 | `name`, `volume` |
| `chara` | キャラ表示 | `id`, `position` (left/center/right), `expression` |
| `chara_mod` | 表情変更 | `id`, `expression` |
| `chara_hide` | キャラ非表示 | `id` |
| `dialog` | テキスト表示 | `speaker`, `text` |
| `choice` | 選択肢 | `options: [{ text, jump }]` |
| `effect` | 画面効果 | `name` (shake/flash/fadeout/whitefade), `color`, `time` |
| `wait` | 待機 | `time` (ms) |
| `jump` | ジャンプ | `target` (index) |
| `label` | ラベル | `name` ※jump先の目印 |

### ステート管理

useReducer による集中管理。主要ステート:

```
scriptIndex       現在のスクリプト位置
displayedText     表示中のテキスト
isTyping          タイプ中フラグ
currentSpeaker    現在の話者
currentBg         現在の背景キー
characters        表示中キャラ { id: { position, expression } }
showChoice        選択肢表示中
backlog           バックログ配列
saves             セーブスロット [null, null, null]
textSpeed         テキスト表示速度 (ms/字)
autoMode          オートモード
bgmPlaying        再生中BGM
showBacklog       バックログUI表示
showConfig        設定UI表示
showSaveLoad      セーブ/ロードUI表示
```

---

## 実装済み機能 ✅

- [x] テキストのタイプライター表示（速度調整可能）
- [x] キャラクター表示・表情切替・非表示
- [x] 背景切替（フェードトランジション）
- [x] 選択肢による分岐（jump指定）
- [x] セーブ＆ロード（3スロット、インメモリ）
- [x] バックログ表示
- [x] オート再生モード
- [x] 設定画面（テキスト速度スライダー）
- [x] キーボード操作（Enter/Space で送り、Escape で閉じる）
- [x] BGM/SE のラベル表示（再生はスタブ）

## 未実装（優先順） 🔲

### フェーズ1: エンジン完成（次にやること）

- [ ] **BGM/SE の実際の再生** — Howler.js or Web Audio API
  - BGM: ループ再生、フェードイン/アウト、音量調整
  - SE: ワンショット再生、音量調整
  - 設定画面に BGM/SE 別の音量スライダー追加
- [ ] **画面エフェクト** — shake, flash, fadeout, whitefade
  - CSS animation ベースで実装
  - スクリプトコマンド `{ type: "effect", name: "shake" }` で呼び出し
- [ ] **CGギャラリーモード**
  - 回収したイベントCGをフラグ管理
  - タイトル画面 or メニューからアクセス
  - サムネイル一覧 → クリックで拡大表示
- [ ] **スキップ機能**
  - 既読テキストの高速送り（既読フラグ管理が必要）
  - Ctrl 長押し or ボタンでトグル
- [ ] **セーブデータ永続化**
  - ブラウザ版: localStorage
  - Electron版: fs.writeFileSync で JSON ファイル保存
  - セーブ時のスクリーンショット（canvas.toDataURL）

### フェーズ2: 製品化

- [ ] **タイトル画面** — NEW GAME / CONTINUE / CG GALLERY / CONFIG / EXIT
- [ ] **シーン回想モード** — クリア済みシーンの再プレイ
- [ ] **トランジション強化** — crossfade, wipe, slide 等
- [ ] **キャラアニメーション** — 登場/退場エフェクト、揺れ、ズーム
- [ ] **テキストウィンドウ切替** — ADVモード / NVLモード（全画面テキスト）
- [ ] **多言語テキスト対応**（任意）
- [ ] **Electron パッケージング** — electron-builder で Windows exe 出力
- [ ] **ファイル隠蔽** — asar パッケージングで素材保護

### フェーズ3: DLsite販売準備

- [ ] ゲームアイコン (.ico) 設定
- [ ] インストーラー or ポータブル exe 選択
- [ ] 動作環境テスト（Win10/11 64bit）
- [ ] DLsite サークル登録
- [ ] 予告ページ作成
- [ ] 紹介画像（600×420px メイン + サブ4枚）
- [ ] 体験版ビルド
- [ ] Ci-en 開発日記

---

## ディレクトリ構成（目標）

```
doujin-engine/
├── CLAUDE.md                 ← このファイル
├── package.json
├── electron/
│   ├── main.js               ← Electron メインプロセス
│   └── preload.js            ← IPC ブリッジ（セーブ/ロード）
├── public/
│   └── index.html
├── src/
│   ├── App.jsx               ← エントリーポイント
│   ├── engine/
│   │   ├── NovelEngine.jsx   ← メインエンジンコンポーネント
│   │   ├── reducer.js        ← ステート管理 (useReducer)
│   │   ├── commands.js       ← コマンド処理ロジック
│   │   └── constants.js      ← コマンドタイプ定数
│   ├── components/
│   │   ├── TextBox.jsx       ← テキストボックス + 話者名
│   │   ├── Character.jsx     ← キャラ立ち絵表示
│   │   ├── Background.jsx    ← 背景表示
│   │   ├── ChoiceOverlay.jsx ← 選択肢UI
│   │   ├── BacklogView.jsx   ← バックログ
│   │   ├── SaveLoadView.jsx  ← セーブ/ロード画面
│   │   ├── ConfigView.jsx    ← 設定画面
│   │   ├── TitleScreen.jsx   ← タイトル画面
│   │   ├── CGGallery.jsx     ← CGギャラリー
│   │   └── Controls.jsx      ← 下部コントロールバー
│   ├── audio/
│   │   └── AudioManager.js   ← BGM/SE 再生管理
│   ├── effects/
│   │   └── ScreenEffects.jsx ← 画面エフェクト
│   ├── save/
│   │   └── SaveManager.js    ← セーブ/ロード + 永続化
│   └── data/
│       ├── script.js         ← シナリオデータ
│       ├── characters.js     ← キャラ定義
│       └── config.js         ← ゲーム設定
├── assets/
│   ├── bg/                   ← 背景画像 (.png, .jpg)
│   ├── chara/                ← 立ち絵 (.png 透過)
│   ├── cg/                   ← イベントCG
│   ├── bgm/                  ← BGM (.ogg)
│   ├── se/                   ← SE (.ogg)
│   ├── ui/                   ← UI素材
│   └── font/                 ← フォントファイル（任意）
└── dist/                     ← ビルド出力
```

---

## コーディング規約

- **言語**: JavaScript (JSX)。TypeScript は任意（移行する場合は全体で統一）
- **スタイル**: インラインスタイル or CSS Modules。Tailwind は使わない
- **コンポーネント**: 関数コンポーネント + Hooks のみ。クラスコンポーネント禁止
- **ステート**: エンジン全体の状態は `useReducer` で集中管理
- **命名**: コンポーネント PascalCase、関数 camelCase、定数 UPPER_SNAKE_CASE
- **コメント**: 日本語OK。複雑なロジックには必ずコメント
- **アスペクト比**: ゲーム画面は **16:9**（960×540 基準、フルスクリーン対応）

---

## 開発コマンド（セットアップ後）

```bash
# 開発サーバー起動（ブラウザプレビュー）
npm run dev

# テスト実行
npm test              # 全テスト実行（vitest run）
npm run test:watch    # ウォッチモード（vitest）

# Electron で起動（デスクトップアプリとしてプレビュー）
npm run electron:dev

# プロダクションビルド（Windows exe）
npm run build
npm run electron:build

# exe だけ欲しい場合
npx electron-builder --win --x64
```

---

## Electron パッケージング メモ

```js
// electron/main.js 最小構成
const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 540,
    resizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  // 本番は dist/index.html をロード
  win.loadFile("dist/index.html");
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
```

```json
// package.json の build 設定例
{
  "build": {
    "appId": "com.yoursircle.novelgame",
    "productName": "ゲームタイトル",
    "win": {
      "target": "portable",
      "icon": "assets/icon.ico"
    },
    "asar": true,
    "files": [
      "dist/**/*",
      "electron/**/*",
      "assets/**/*"
    ]
  }
}
```

---

## DLsite 販売情報

| 項目 | 値 |
|------|-----|
| 販売カテゴリ | 同人（男性成人向け） |
| ゲーム形式 | ノベルゲーム (ADV) |
| 推奨価格帯 | 1,500〜2,200円 |
| 手数料 | 約40%（700円以上の場合） |
| 配布形式 | ZIP圧縮した exe パッケージ |
| 紹介画像 | メイン 600×420px + サブ最大4枚 |
| 審査期間 | 通常 3〜7営業日 |

### 販売前チェックリスト

- 予告ページは発売2〜4週間前に作成
- Ci-en で開発日記を3〜5記事投稿してから発売
- 体験版を先行公開して予告ページのお気に入り登録を促す
- ジャンルタグの選定が検索流入の生命線（ニッチ × 需要ありを狙う）

---

## AI活用方針

| 工程 | AI の使い方 |
|------|------------|
| シナリオ | メインストーリーは自分で書く。サブテキスト（NPC会話、アイテム説明、分岐テキスト）はAIで量産 → 自分でリライト |
| 画像素材 | Stable Diffusion でキャラ立ち絵・背景・イベントCG生成。image-prompt スキルでプロンプト管理 |
| コーディング | Claude Code でエンジン機能の実装・デバッグ |
| テスト | AI にバランス調整やテキスト校正を依頼 |
