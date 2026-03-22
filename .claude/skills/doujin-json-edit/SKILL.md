---
name: doujin-json-edit
description: ノベルゲームエンジンのプロジェクトJSON（シナリオ・キャラ・背景・BGM/SE・CG）を作成・編集・削除・検証する。シナリオ作成、シーン追加、キャラ定義、背景設定、音声カタログ管理に使用。
user-invocable: true
argument-hint: "<操作> [プロジェクト名] [対象]"
---

# doujin-json-edit — ノベルゲーム JSON エディタスキル

## 参照ドキュメント

操作前に必ず以下のスキーマ定義を読み、最新の仕様に従うこと:

- `doujin-engine/docs/design/project-data-schema.md` — プロジェクトデータの完全なスキーマ定義
- `doujin-engine/docs/design/commands.md` — コマンド仕様
- `doujin-engine/docs/design/effects.md` — エフェクト仕様
- `doujin-engine/docs/design/audio.md` — オーディオ仕様
- `doujin-engine/docs/design/transitions.md` — トランジション仕様
- `doujin-engine/docs/design/gallery.md` — CG/シーンギャラリー仕様

**スキーマ定義とこのファイルの記述が矛盾する場合は、スキーマ定義を優先すること。**

## 使い方

```
/doujin-json-edit list                          # プロジェクト一覧
/doujin-json-edit new <プロジェクト名>            # 新規プロジェクト作成
/doujin-json-edit scene <プロジェクト名> add      # シーン追加
/doujin-json-edit scene <プロジェクト名> edit     # シーン編集（シナリオテキストから）
/doujin-json-edit chara <プロジェクト名> add      # キャラ追加
/doujin-json-edit bg <プロジェクト名> add         # 背景追加
/doujin-json-edit bgm <プロジェクト名> add        # BGM追加
/doujin-json-edit se <プロジェクト名> add          # SE追加
/doujin-json-edit cg <プロジェクト名> add          # CG追加
/doujin-json-edit validate <プロジェクト名>        # 整合性チェック
/doujin-json-edit delete <プロジェクト名> <対象>   # 要素削除
/doujin-json-edit nvl-fix <プロジェクト名>         # NVL使用量の最適化
```

引数なしで呼ばれた場合は、ユーザーに操作を確認する。

---

## ベースディレクトリ

```
doujin-engine/data/projects/{プロジェクト名}/
```

プロジェクト名はディレクトリ名と一致。`_index.json` にメタデータが必要。

---

## 操作別の手順

### `list` — プロジェクト一覧

`doujin-engine/data/projects/_index.json` を読み、プロジェクト一覧を表示。

### `new` — 新規プロジェクト作成

1. ユーザーにプロジェクト名、説明、ゲーム種別を確認
2. 以下のファイルをすべて作成:
   - `meta.json` — IDは `Date.now().toString(36) + ランダム6文字`
   - `script.json` — `[]`
   - `storyScenes.json` — `[]`
   - `sceneOrder.json` — `[]`
   - `characters.json` — `{}`
   - `bgStyles.json` — `{}`
   - `bgmCatalog.json` — `[]`
   - `seCatalog.json` — `[]`
   - `cgCatalog.json` — `[]`
   - `sceneCatalog.json` — `[]`
   - `saves.json` — 100個のnull配列
   - その他: `items.json`(`[]`), `gameEvents.json`(`[]`), `maps.json`(`[]`), `customTiles.json`(`[]`), `battleData.json`(`{}`), `minigames.json`(`[]`)
3. `_index.json` に追記

### `scene add` — シーン追加

ユーザーからシーン名・説明を受け取り、`storyScenes.json` に追加。
`sceneOrder.json` にも追加。
必要に応じて `script.json` にシーン参照コマンドを追加。

### `scene edit` — シナリオテキストからシーン生成

ユーザーからシナリオテキスト（小説形式）を受け取り、以下のルールでコマンド配列に変換:

#### 変換ルール

| テキストパターン | コマンド |
|---|---|
| 台詞行: `「セリフ」` の前に話者名がある | `{ "type": "dialog", "speaker": "話者", "text": "セリフ" }` |
| 地の文（話者なし） | `{ "type": "dialog", "speaker": "", "text": "地の文" }` |
| `![挿絵](path)` | `{ "type": "cg", "id": "...", "src": "..." }` |
| `《システムテキスト》` | `{ "type": "dialog", "speaker": "SYSTEM", "text": "..." }` |
| 空行区切りで場面転換 | `{ "type": "wait", "time": 500 }` 等を検討 |

#### NVL 使用ルール（厳守）

- **地の文が3行以上連続し、台詞を挟まないブロック** にのみ `nvl_on` / `nvl_off` を使用
- 1シーンにつき **0〜1回** が目安
- 台詞の応酬、地の文1-2行、会話パートでは **絶対に使わない**
- NVL内で4行ごとに `nvl_clear` を挿入

#### シーン分割の基準

- 場所・時間が変わったら新シーン
- 大きな心理転換点で分割
- 1シーン 20〜80 コマンドが目安
- シーン名: `{話数}-{番号} {タイトル}` 形式

### `chara add` — キャラ追加

```json
{
  "キャラID（半角英数）": {
    "name": "表示名",
    "color": "#カラーコード",
    "expressions": {
      "neutral": "🙂",
      "smile": "😊",
      "sad": "😢",
      "surprise": "😲",
      "angry": "😠"
    },
    "sprites": {}
  }
}
```

- `sprites` は画像がアップロードされるまで空
- `color` はキャラのテーマカラー

### `bg add` — 背景追加

```json
{
  "背景キー": {
    "background": "linear-gradient(180deg, #色1 0%, #色2 100%)"
  }
}
```

- `imageFile` はエディタからアップロードで設定
- キー名は日本語OK

### `bgm add` / `se add` — 音声カタログ追加

```json
{
  "id": "bgm_xxx",
  "name": "半角英数の参照名",
  "filename": null,
  "description": "説明",
  "volume": 0.8,
  "loop": true,
  "fadeIn": 500,
  "fadeOut": 500
}
```

- `name` は **半角英数のみ**（日本語NG）
- `filename` はエディタからアップロードで設定

### `cg add` — CG追加

```json
{
  "id": "cg_xxx",
  "title": "タイトル",
  "group": "グループ名",
  "thumbnail": "",
  "src": "",
  "variants": []
}
```

### `validate` — 整合性チェック

以下を検証してエラーを報告:

1. `script.json` 内の `scene.sceneId` が `storyScenes.json` に存在するか
2. `script.json` 内の `choice.options[].jump` のラベルが定義されているか
3. `storyScenes.json` 内の `chara.id` / `chara_mod.id` が `characters.json` に存在するか
4. `storyScenes.json` 内の `bg.src` が `bgStyles.json` に存在するか
5. `storyScenes.json` 内の `bgm.name` が `bgmCatalog.json` に存在するか
6. `storyScenes.json` 内の `se.name` が `seCatalog.json` に存在するか
7. `storyScenes.json` 内の `cg.id` が `cgCatalog.json` に存在するか
8. `sceneOrder.json` の全IDが `storyScenes.json` に存在するか
9. `nvl_on` / `nvl_off` の対応が取れているか
10. 全ENDの後に `jump` → `script_end` があるか
11. `fadeout` の後に `fadein` があるか（END直前を除く）

### `nvl-fix` — NVL最適化

1. 全 `nvl_on` / `nvl_off` / `nvl_clear` を除去
2. 地の文が3行以上連続するブロックを検出
3. 該当ブロックにのみ `nvl_on` / `nvl_off` を挿入
4. 4行ごとに `nvl_clear` を挿入
5. 1シーンあたり1回を超える場合はユーザーに確認

### `delete` — 要素削除

対象に応じてJSONから削除し、参照元も確認:
- キャラ削除 → `storyScenes.json` 内の参照を警告
- シーン削除 → `script.json` / `sceneOrder.json` からも削除
- 背景削除 → `storyScenes.json` 内の参照を警告

---

## コマンド仕様（全コマンド）

### テキスト

| type | パラメータ | 説明 |
|---|---|---|
| `dialog` | `speaker`, `text` | 台詞/ナレーション。speaker空でナレーション |
| `nvl_on` | — | NVLモード開始 |
| `nvl_off` | — | NVLモード終了 |
| `nvl_clear` | — | NVLテキストクリア |

### 背景・音声

| type | パラメータ | 説明 |
|---|---|---|
| `bg` | `src`, `transition`(fade/crossfade/wipe_left/wipe_right/slide_left/slide_right/none), `time` | 背景切替 |
| `bgm` | `name`, `loop`, `volume` | BGM再生 |
| `bgm_stop` | `fadeout` | BGM停止 |
| `se` | `name`, `volume` | SE再生 |

### キャラ

| type | パラメータ | 説明 |
|---|---|---|
| `chara` | `id`, `position`(left/center/right), `expression`, `anim` | 登場 |
| `chara_mod` | `id`, `expression`, `anim`(shake/bounce/zoom/nod/tremble) | 表情/アニメ変更 |
| `chara_hide` | `id` | 退場 |

### エフェクト

| type | パラメータ | 説明 |
|---|---|---|
| `effect` | `name`(fadeout/fadein/flash/shake/whitefade), `color`, `time`, `clearText` | 画面エフェクト |
| `wait` | `time` | 待機(ms) |

### CG・分岐

| type | パラメータ | 説明 |
|---|---|---|
| `cg` | `id`, `src` | CG表示 |
| `cg_hide` | — | CG非表示 |
| `label` | `name` | ジャンプ先ラベル |
| `jump` | `target` | ラベルへジャンプ |
| `choice` | `options: [{text, jump}]` | 選択肢 |
| `scene` | `sceneId`, `label` | シーン参照 |

### 共通

| フィールド | 説明 |
|---|---|
| `disabled: true` | コマンドを無効化（スキップ） |

---

## 演出パターン集

### 場面転換（暗転→背景切替→復帰）
```json
{ "type": "effect", "name": "fadeout", "color": "#000", "time": 1500, "clearText": true },
{ "type": "chara_hide", "id": "rin" },
{ "type": "bg", "src": "新しい背景", "transition": "none" },
{ "type": "wait", "time": 500 },
{ "type": "effect", "name": "fadein", "time": 1000 }
```

### END演出（fadein なし）
```json
{ "type": "dialog", "speaker": "", "text": "——BAD END 1「タイトル」——" },
{ "type": "effect", "name": "fadeout", "color": "#000", "time": 2000, "clearText": true }
```

### SYSTEMメッセージ
```json
{ "type": "dialog", "speaker": "SYSTEM", "text": "《メッセージ》" }
```

### 選択肢（テキストは自動クリアされる）
```json
{ "type": "dialog", "speaker": "", "text": "選択を迫る地の文。" },
{ "type": "choice", "options": [
  { "text": "選択A", "jump": "route_a" },
  { "text": "選択B", "jump": "route_b" }
]}
```

---

## ファイル名規則

- BGM/SE の `name`, `filename`: **半角英数のみ**
- 背景キー: 日本語OK（`classroom_夕方` など）
- キャラID: **半角英数のみ**
- プロジェクト名/ディレクトリ名: 日本語OK
