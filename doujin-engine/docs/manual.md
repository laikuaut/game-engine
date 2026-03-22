# Doujin Engine 利用マニュアル

## 1. はじめに

### エンジン概要

Doujin Engine は React + Electron で構築されたノベルゲームエンジンです。DLsite 成人向け同人ノベルゲームを Windows exe として出品するために設計されています。

対応ゲームタイプ:

- **ノベル (ADV)** -- テキスト・選択肢・分岐によるビジュアルノベル
- **RPG** -- タイルマップ・ターン制バトルを含むRPG
- **アクション** -- ステージクリア型のアクションゲーム
- **ミニゲーム** -- じゃんけん・クイズ・スロットなどの小規模ゲーム

### 対応環境

- Windows 10 / 11 (64bit)
- Node.js 18 以上
- npm 9 以上

### セットアップ手順

```bash
# リポジトリをクローン
git clone <repository-url>
cd doujin-engine

# 依存パッケージをインストール
npm install

# 開発サーバーを起動（ブラウザで http://localhost:5555 が開く）
npm run dev
```

---

## 2. プロジェクト管理

### 新規プロジェクト作成

起動するとプロジェクト管理画面が表示されます。「新規プロジェクト」ボタンからプロジェクトを作成します。

作成時にゲームタイプを選択します:

| ゲームタイプ | 説明 | 利用可能なエディタタブ |
|---|---|---|
| ノベル | ビジュアルノベル (ADV) | スクリプト、シーン編集、テキスト、キャラ、背景、BGM、SE、CG、シーン回想、イベント、フロー、プレビュー、DEBUG、セーブ、Deploy |
| RPG | タイルマップRPG | 上記 + アイテム、マップ、バトル |
| アクション | アクションゲーム | 上記 + アクション |
| ミニゲーム | ミニゲーム集 | ノベル系 + ミニゲーム |

### プロジェクトの複製・削除

プロジェクト管理画面の各プロジェクトカードから操作できます:

- **複製**: プロジェクトデータとアセットを丸ごとコピー
- **削除**: プロジェクトデータとアセットを完全に削除（復元不可）

### インポート/エクスポート

- **エクスポート**: プロジェクトを JSON 形式でダウンロード
- **インポート**: JSON ファイルをアップロードしてプロジェクトを復元

### ディレクトリ構造

プロジェクトデータは `data/projects/{プロジェクトID}/` に保存されます:

```
data/projects/{id}/
  meta.json           -- プロジェクト名・ゲームタイプ等のメタ情報
  script.json         -- スクリプトコマンド配列
  characters.json     -- キャラクター定義
  storyScenes.json    -- シーン部品データ
  sceneOrder.json     -- シーンの再生順
  bgmCatalog.json     -- BGMカタログ
  seCatalog.json      -- SEカタログ
  assets/
    bg/               -- 背景画像
    chara/            -- キャラクター立ち絵
    bgm/              -- BGMファイル
    se/               -- SEファイル
    cg/               -- CGファイル
```

---

## 3. エディタ画面

プロジェクト管理画面から「編集」ボタンでエディタを開きます。画面上部のタブで各機能を切り替えます。

### スクリプトタブ

メインのスクリプト編集画面です。左側にコマンドリスト、右側に選択コマンドの編集パネルが表示されます。

**コマンドの追加**: 画面上部のカテゴリメニュー（テキスト系、キャラ系、演出系、音声系、制御系、イベント系）からコマンドを選択して追加します。

**コマンドの操作**:

- ドラッグ&ドロップで並べ替え
- 右クリックメニューまたはボタンで削除
- チェックボックスで無効化（実行時スキップ）
- コマンドをクリックして右パネルで編集

コマンド編集では入力バリデーションが働き、未定義のキャラクター・背景・BGM・SE・ラベルをエラー表示します。表情・ラベル・シーンはプルダウンから選択できます。

### シーン編集タブ

スクリプトを「シーン」単位に部品化して管理する機能です。

- シーンの新規作成・削除・名前変更
- シーン内にコマンドを追加・編集
- ドラッグ&ドロップでシーンの順序を変更
- スクリプトへの反映方法:
  - **参照方式**: `{ type: "scene", sceneId: "xxx" }` でスクリプトから参照
  - **展開方式**: シーン内のコマンドをスクリプトに直接結合（ラベル自動挿入）

### テキストタブ

ダイアログコマンドのテキストを一括編集するモードです。

- スクリプト中の全 `dialog` コマンドを一覧表示
- 話者・テキストをインラインで編集
- フィルター機能で特定の話者のセリフだけ表示

### キャラタブ

キャラクター定義の管理画面です。

- **キャラクター追加**: ID、名前、テーマカラーを設定
- **表情管理**: 絵文字 or 画像ファイルで表情を定義
- **立ち絵アップロード**: 画像ファイルをドラッグ&ドロップまたはファイル選択でアップロード
- キャラクターの削除・編集

### 背景タブ

背景画像の管理画面です。

- **画像アップロード**: 画像ファイルをアップロードして背景として登録
- **グラデーション**: CSSグラデーションで背景を定義（デフォルトで `school_gate`, `classroom`, `rooftop` 等のプリセットあり）

### BGM / SE タブ

音声ファイルの管理画面です。

- ファイルアップロード（.ogg, .mp3 対応）
- ドラッグ&ドロップ対応
- テスト再生ボタンで音声を確認
- 音量プレビュー

### CG タブ

CG カタログの管理画面です。

- CGの登録（ID、名前、画像）
- 差分管理（variant で複数の差分を登録）
- ドラッグ&ドロップでの画像アップロード

### シーン回想タブ

シーン回想カタログの管理画面です。ゲーム内の回想モードで再生可能なシーンを登録します。

### イベントタブ

ゲームイベント（フラグ・変数・アイテム条件、アクション）を定義するエディタです。

### フロータブ

スクリプトの選択肢・ジャンプによる分岐構造をグラフとして可視化します。ラベル・ジャンプ先の関係を視覚的に確認できます。

### アイテムタブ (RPG)

ゲーム内アイテムの定義画面です。アイテムID、名前、説明を管理します。

### マップタブ (RPG)

タイルマップエディタです。

- 2レイヤー構成（地面レイヤー + オブジェクトレイヤー）
- ペイント / 消しゴムツール
- タイルセット分割インポート（スプライトシートから一括切り出し）
- カスタムタイル（画像アップロード）
- マップイベント（ダイアログ、バトル、マップ移動等）
- ランダムマップ生成

### バトルタブ (RPG)

ターン制バトルシステムの設定画面です。敵キャラクター・スキル・バトル構成を定義します。

### アクションタブ (アクション)

アクションステージの設定画面です。

### ミニゲームタブ (ミニゲーム)

ミニゲーム（じゃんけん、クイズ、スロット）の設定画面です。

### プレビュータブ

スクリプトの実行プレビューです。分割表示（エディタとプレビューを並べて表示）またはフルプレビューで動作確認できます。

### DEBUG タブ

デバッグ用の情報表示パネルです。

- スクリプト統計（総コマンド数、タイプ別カウント）
- バリデーション結果（未定義参照のエラー一覧）
- 現在のゲームステート表示

### セーブタブ

セーブデータの JSON 直接編集が可能です。セーブデータの修復や検証に使用します。

### Deploy タブ

ゲームのビルドと配布パネルです。

- **Web ビルド**: Vite でビルドして静的サイトとして配布
- **Portable ビルド**: 単体実行可能な exe ファイル
- **NSIS ビルド**: Windows インストーラー

---

## 4. スクリプトコマンドリファレンス

### テキスト系

| コマンド | パラメータ | 説明 |
|---|---|---|
| `dialog` | `speaker` (文字列), `text` (文字列) | テキスト表示。speaker 空欄でナレーション |
| `choice` | `options` ([{text, jump}]) | 選択肢表示。jump はラベル名 |
| `nvl_on` | なし | NVLモード開始（全画面テキスト表示） |
| `nvl_off` | なし | NVLモード終了 |
| `nvl_clear` | なし | NVLテキストログをクリア |

### キャラクター系

| コマンド | パラメータ | 説明 |
|---|---|---|
| `chara` | `id` (文字列), `position` (left/center/right), `expression` (文字列), `anim` (文字列) | キャラクター表示 |
| `chara_mod` | `id` (文字列), `expression` (文字列), `anim` (文字列) | 表情変更 |
| `chara_hide` | `id` (文字列) | キャラクター非表示 |

**キャラアニメーション** (`anim` パラメータ):

| 値 | 効果 |
|---|---|
| `shake` | 左右に揺れる |
| `bounce` | 上下にバウンド |
| `zoom` | 拡大エフェクト |
| `nod` | うなずき |
| `tremble` | 震え |

### 演出系

| コマンド | パラメータ | 説明 |
|---|---|---|
| `bg` | `src` (背景キー), `transition` (fade/crossfade/wipe_left/wipe_right/slide_left/slide_right/none), `time` (ms) | 背景変更 |
| `effect` | `name` (エフェクト名), `color` (色), `time` (ms), `clearText` (真偽値) | 画面エフェクト |
| `cg` | `id` (CG ID), `variant` (数値) | CG表示。cgCatalog から画像を解決。variant で差分指定 |
| `cg_hide` | なし | CG非表示 |
| `wait` | `time` (ms) | 指定ミリ秒の待機 |

**エフェクト名** (`effect` の `name` パラメータ):

| 値 | 効果 |
|---|---|
| `shake` | 画面全体が揺れる |
| `flash` | 画面フラッシュ（白 or 指定色） |
| `fadeout` | フェードアウト（黒 or 指定色） |
| `fadein` | フェードイン |
| `whitefade` | 白フェード |

### 音声系

| コマンド | パラメータ | 説明 |
|---|---|---|
| `bgm` | `name` (BGM名), `loop` (真偽値, デフォルトtrue), `volume` (0-1) | BGM再生 |
| `bgm_stop` | `fadeout` (ms) | BGM停止 |
| `se` | `name` (SE名), `volume` (0-1) | SE再生 |

### 制御系

| コマンド | パラメータ | 説明 |
|---|---|---|
| `jump` | `target` (ラベル名) | 指定ラベルへジャンプ |
| `label` | `name` (ラベル名), `recollection` (真偽値) | ラベル定義。recollection=true でシーン回想対象 |
| `scene` | `sceneId` (シーンID) | シーン参照。シーン編集で作成した部品を展開 |

### イベント系

| コマンド | パラメータ | 説明 |
|---|---|---|
| `set_flag` | `key` (フラグ名), `value` (true/false) | フラグを設定 |
| `set_variable` | `key` (変数名), `operator` (=, +=, -=, *=), `value` (数値) | 変数を設定 |
| `if_flag` | `key` (フラグ名), `operator` (==, !=), `value` (true/false), `jump` (ラベル名) | フラグ条件分岐 |
| `if_variable` | `key` (変数名), `operator` (==, !=, >, <, >=, <=), `value` (数値), `jump` (ラベル名) | 変数条件分岐 |
| `add_item` | `id` (アイテムID), `amount` (個数, デフォルト1) | アイテム追加 |
| `remove_item` | `id` (アイテムID), `amount` (個数, デフォルト1) | アイテム削除 |
| `check_item` | `id` (アイテムID), `amount` (必要数, デフォルト1), `jump` (ラベル名) | アイテム所持チェック。条件を満たせばジャンプ |

### 拡張系

| コマンド | パラメータ | 説明 |
|---|---|---|
| `action_stage` | `stageId` (ステージID) | アクションステージを開始 |

---

## 5. イベントシステム

### フラグ

ON/OFF の真偽値で管理する状態変数です。

```js
// フラグをONにする
{ type: "set_flag", key: "met_heroine", value: true }

// フラグがONなら特定ラベルへジャンプ
{ type: "if_flag", key: "met_heroine", operator: "==", value: true, jump: "already_met" }
```

### 変数

数値で管理する状態変数です。好感度やポイントの管理に使います。

```js
// 変数を初期化
{ type: "set_variable", key: "affection", operator: "=", value: 0 }

// 変数を加算
{ type: "set_variable", key: "affection", operator: "+=", value: 10 }

// 変数が一定以上ならジャンプ
{ type: "if_variable", key: "affection", operator: ">=", value: 50, jump: "good_ending" }
```

演算子一覧: `=` (代入), `+=` (加算), `-=` (減算), `*=` (乗算)

比較演算子一覧: `==`, `!=`, `>`, `<`, `>=`, `<=`

### アイテム

所持数で管理するアイテムシステムです。

```js
// アイテムを追加
{ type: "add_item", id: "key_item", amount: 1 }

// アイテムを消費
{ type: "remove_item", id: "key_item", amount: 1 }

// アイテムを持っているかチェック
{ type: "check_item", id: "key_item", amount: 1, jump: "has_key" }
```

### CG解放

`cg` コマンド実行時に自動的にギャラリーに登録されます。プレイヤーがCGギャラリーから閲覧できるようになります。

### シーン解放

`label` コマンドの `recollection` を `true` に設定すると、そのラベルを通過した時点でシーン回想カタログに登録されます。

```js
{ type: "label", name: "event_01", recollection: true }
```

---

## 6. ゲームプレイ

### 基本操作

| 操作 | 効果 |
|---|---|
| クリック / Enter / Space | テキスト送り（タイプ中は即時表示） |
| マウスホイール上 | バックログ表示 |
| Escape | メニュー/オーバーレイを閉じる |
| Ctrl 長押し | スキップモード（既読テキストを高速送り） |
| F11 | フルスクリーン切替 |

### セーブ / ロード

- 100 スロット利用可能
- サムネイル付きで保存日時を表示
- Electron 環境ではファイルシステムに永続化、ブラウザ環境では localStorage に保存

### オートモード

テキスト表示完了後に自動的に次のコマンドへ進みます。画面内のコントロールパネルから ON/OFF を切り替えます。

### 設定

| 項目 | 説明 |
|---|---|
| テキスト速度 | 1文字あたりの表示速度 (ms) |
| マスター音量 | 全体の音量 (0-1) |
| BGM音量 | BGMの音量 (0-1) |
| SE音量 | 効果音の音量 (0-1) |
| 画面サイズ | 960x540 / 1280x720 / 1600x900 / 1920x1080 |

---

## 7. ビルドと配布

### 開発コマンド

```bash
# 開発サーバー起動（ブラウザプレビュー、ポート5555）
npm run dev

# テスト実行
npm test              # 全テスト（vitest run）
npm run test:watch    # ウォッチモード

# Electron 開発モード（デスクトップアプリとしてプレビュー）
npm run electron:dev

# プロダクションビルド
npm run build              # Vite ビルドのみ（dist/ に出力）
npm run electron:build     # Vite ビルド + Electron パッケージング（NSIS + Portable）
npm run electron:portable  # Vite ビルド + Portable exe のみ
```

### Portable vs NSIS インストーラー

| 形式 | 説明 | 用途 |
|---|---|---|
| Portable | 単体 exe ファイル。インストール不要 | DLsite 配布向け。ZIP に入れて出品 |
| NSIS | Windows インストーラー。Program Files にインストール | 大規模ゲーム向け |

### asar パッケージング

`package.json` の `build.asar` が `true` に設定されており、ソースコードは asar アーカイブにパッケージングされます。

### ビルド出力先

- Vite ビルド: `dist/`
- Electron パッケージ: `deploy/`

---

## 8. AI画像生成ワークフロー

### 推奨環境

- **モデル**: SDXL (Stable Diffusion XL)
- **UI**: ComfyUI 推奨
- **出力形式**: PNG

### キャラクター立ち絵

1. 同一プロンプトのベースに表情だけ変えて差分を生成
2. `rembg` で背景を透過（PNG alpha チャネル）
3. 統一サイズにリサイズ（推奨: 高さ 1080px）
4. エディタのキャラタブからドラッグ&ドロップでアップロード

表情差分の例:
```
基本プロンプト: 1girl, school uniform, standing, simple background, white background
表情: smile / sad / angry / surprised / shy / neutral
```

### 背景画像

- `white background` を指定せず、シーンに合った背景を生成
- LoRA で画風を統一
- 推奨解像度: 1920x1080 以上

### イベントCG

- 構図の一貫性を保つため、同じ seed 値やControlNet を活用
- 差分（表情・衣装の変化）は同一構図で生成
- CG タブの variant で差分を管理

---

## 9. DLsite 出品チェックリスト

### 販売情報

| 項目 | 値 |
|---|---|
| 販売カテゴリ | 同人（男性成人向け） |
| ゲーム形式 | ノベルゲーム (ADV) |
| 推奨価格帯 | 1,500 - 2,200 円 |
| 手数料 | 約40%（700円以上の場合） |
| 配布形式 | ZIP 圧縮した exe パッケージ |
| 審査期間 | 3 - 7 営業日 |

### 出品準備

- [ ] ジャンルタグの選定（ニッチ x 需要ありを狙う。検索流入の生命線）
- [ ] 紹介画像の作成（メイン 600x420px + サブ画像 最大4枚）
- [ ] 体験版ビルド（Portable 形式で ZIP 配布）
- [ ] 予告ページ作成（発売 2 - 4 週間前）
- [ ] Ci-en 開発日記を 3 - 5 記事投稿
- [ ] ゲームアイコン (.ico) の設定（`package.json` の `build.win.icon`）
- [ ] 動作環境テスト（Windows 10/11 64bit で確認）
- [ ] DLsite サークル登録

### ビルド手順（出品用）

```bash
# Portable exe をビルド
npm run electron:portable

# deploy/ ディレクトリに exe が出力される
# exe を ZIP 圧縮して DLsite にアップロード
```

---

## 10. トラブルシューティング

### 画像が表示されない

- アセットファイルが `data/projects/{id}/assets/` 以下に正しく配置されているか確認
- ファイル名に日本語や全角文字が含まれている場合、半角英数字にリネーム
- 背景キーがスクリプトの `src` パラメータと一致しているか確認

### BGM が再生されない

- Web Audio API の制限により、ユーザーの操作（クリック等）が発生するまで音声再生がブロックされます。ゲーム開始後のクリックで再生が開始されます
- 音声ファイル形式が `.ogg` または `.mp3` であることを確認
- BGM カタログにファイルが登録されているか確認

### Electron ビルドエラー

- Node.js のバージョンが 18 以上であることを確認: `node -v`
- `node_modules` を削除して再インストール: `rm -rf node_modules && npm install`
- `electron-builder` の設定は `package.json` の `build` セクションを確認

### セーブデータ破損

- エディタの DEBUG タブからゲームステートを確認
- セーブタブから JSON を直接編集して修復
- ブラウザ環境では localStorage をクリアしてリセット可能

### プレビューが動かない

- スクリプトにバリデーションエラーがないか DEBUG タブで確認
- 未定義のキャラクター・背景・ラベルへの参照がないか確認

---

## 11. 付録

### キーボードショートカット一覧

#### ゲームプレイ中

| キー | 効果 |
|---|---|
| Enter / Space | テキスト送り |
| Escape | メニュー/オーバーレイを閉じる |
| Ctrl (長押し) | スキップモード |
| F11 | フルスクリーン切替 |

#### エディタ

| キー | 効果 |
|---|---|
| Ctrl + Z | 元に戻す (Undo) |
| Ctrl + Y | やり直し (Redo) |
| Ctrl + S | プロジェクト保存 |

### ファイル構成図

```
doujin-engine/
  package.json              -- パッケージ設定・ビルド設定
  vite.config.js            -- Vite 設定 + 開発サーバー API
  electron/
    main.cjs                -- Electron メインプロセス（IPC, アセット管理, ビルド）
    preload.cjs             -- IPC ブリッジ（レンダラーとメインプロセスの通信）
  src/
    App.jsx                 -- エントリーポイント（画面遷移管理）
    main.jsx                -- React マウントポイント
    engine/
      NovelEngine.jsx       -- ノベルエンジン本体
      reducer.js            -- ゲームステート管理 (useReducer)
      commands.js           -- コマンド処理ロジック
      constants.js          -- CMD/ACTION 定数, SAVE_SLOT_COUNT
    components/
      Background.jsx        -- 背景表示
      Character.jsx         -- キャラクター表示
      TextBox.jsx           -- テキストボックス（ADVモード）
      NVLTextBox.jsx        -- テキストボックス（NVLモード）
      ChoiceOverlay.jsx     -- 選択肢オーバーレイ
      Controls.jsx          -- ゲームUIコントロール
      BacklogView.jsx       -- バックログ表示
      SaveLoadView.jsx      -- セーブ/ロード画面
      ConfigView.jsx        -- 設定画面
      TitleScreen.jsx       -- タイトル画面
      CGGallery.jsx         -- CGギャラリー
      SceneRecollection.jsx -- シーン回想
      HelpModal.jsx         -- ヘルプ表示
    editor/
      EditorScreen.jsx      -- エディタ統合画面（タブ管理）
      ScriptList.jsx        -- スクリプトリスト
      CommandEditor.jsx     -- コマンド編集パネル
      SceneEditor.jsx       -- シーン編集
      TextEditor.jsx        -- テキスト一括編集
      CharacterEditor.jsx   -- キャラクターエディタ
      BackgroundEditor.jsx  -- 背景エディタ
      AudioCatalogEditor.jsx -- BGM/SE エディタ
      CGCatalogEditor.jsx   -- CG カタログエディタ
      SceneCatalogEditor.jsx -- シーン回想カタログ
      EventEditor.jsx       -- イベントエディタ
      ItemEditor.jsx        -- アイテムエディタ
      FlowGraph.jsx         -- フローグラフ
      DebugPanel.jsx        -- デバッグパネル
      SaveDataEditor.jsx    -- セーブデータエディタ
      DeployPanel.jsx       -- ビルド/デプロイパネル
      PreviewPanel.jsx      -- プレビューパネル
      rpg/
        MapEditor.jsx       -- タイルマップエディタ
        TilesetSplitter.jsx -- タイルセット分割
        BattleEditor.jsx    -- バトルエディタ
      minigame/
        MinigameEditor.jsx  -- ミニゲームエディタ
    audio/
      AudioManager.js       -- Web Audio API ラッパー
      useAudio.js           -- ステート連動オーディオフック
    effects/
      ScreenEffects.jsx     -- 画面エフェクト
    action/
      ActionEngine.jsx      -- アクションエンジン
    rpg/
      RPGEngine.jsx         -- RPGエンジン
    minigame/
      MinigameRunner.jsx    -- ミニゲーム実行
    save/
      SaveManager.js        -- セーブ/ロード + 永続化
    project/
      ProjectStore.js       -- プロジェクト CRUD + アセット管理
      ProjectManager.jsx    -- プロジェクト一覧 UI
    data/
      config.js             -- 画面設定、カラーパレット、フォント
      sample_scenario.js    -- サンプルシナリオ
  data/                     -- プロジェクトデータ (git 管理外)
  dist/                     -- Vite ビルド出力
  deploy/                   -- Electron ビルド出力
```

### データフォーマット仕様

#### script.json

スクリプトコマンドの配列です。各要素は `type` フィールドを持つオブジェクトです。

```json
[
  { "type": "bg", "src": "classroom", "transition": "fade" },
  { "type": "bgm", "name": "morning_theme" },
  { "type": "chara", "id": "sakura", "position": "center", "expression": "smile" },
  { "type": "dialog", "speaker": "桜", "text": "おはよう、先輩。" },
  { "type": "choice", "options": [
    { "text": "おはよう", "jump": "greeting" },
    { "text": "無視する", "jump": "ignore" }
  ]},
  { "type": "label", "name": "greeting" },
  { "type": "dialog", "speaker": "桜", "text": "今日もいい天気ですね。" }
]
```

#### characters.json

キャラクター ID をキーとするオブジェクトです。

```json
{
  "sakura": {
    "name": "桜",
    "color": "#FFB7C5",
    "expressions": {
      "neutral": "🙂",
      "smile": "😊",
      "sad": "😢",
      "angry": "😠"
    }
  }
}
```

表情の値は絵文字（文字列）または画像ファイルパスです。画像の場合は `assets/chara/` 以下にファイルを配置します。

#### storyScenes.json

シーン部品の配列です。

```json
[
  {
    "id": "scene_001",
    "name": "プロローグ",
    "commands": [
      { "type": "bg", "src": "school_gate", "transition": "fade" },
      { "type": "dialog", "speaker": "", "text": "物語が始まる。" }
    ]
  }
]
```

#### bgmCatalog.json / seCatalog.json

音声ファイルのカタログ配列です。

```json
[
  {
    "id": "morning_theme",
    "name": "朝のテーマ",
    "file": "morning_theme.ogg"
  }
]
```
