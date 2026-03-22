# CLAUDE_json.md — ゲームエンジン JSON データ作成ガイド

Claude Code でプロジェクトの JSON データ（シナリオ・キャラ・背景・BGM/SE・CG・アクション）を作成・編集するための仕様書。
対応ゲーム種別: ノベル / RPG / アクション / ミニゲーム

---

## ファイル構成

```
data/projects/{プロジェクト名}/
├── meta.json          ← プロジェクト基本情報
├── script.json        ← メインスクリプト（シーン参照・分岐制御）
├── storyScenes.json   ← シーン定義（実際のコマンド配列）
├── sceneOrder.json    ← シーン再生順
├── characters.json    ← キャラクター定義
├── bgStyles.json      ← 背景定義
├── bgmCatalog.json    ← BGMカタログ
├── seCatalog.json     ← SEカタログ
├── cgCatalog.json     ← CGカタログ
└── assets/{type}/     ← アップロード画像・音声ファイル
```

新規プロジェクトを手動作成する場合は、上記すべてのファイルと `_index.json` への追記が必要。

---

## meta.json

```json
{
  "id": "一意のID（英数字）",
  "name": "プロジェクト名",
  "description": "説明文",
  "gameType": "novel",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

---

## script.json — メインスクリプト

シーン参照（`scene`）、選択肢分岐（`choice`/`label`/`jump`）、地の文を組み合わせる。
**シーン内のコマンドは `storyScenes.json` に定義し、ここでは参照のみ。**

```json
[
  { "type": "scene", "sceneId": "ch01_prologue", "label": "ch01_start" },

  { "type": "label", "name": "choice_1" },
  { "type": "dialog", "speaker": "", "text": "選択を迫られている。" },
  { "type": "choice", "options": [
    { "text": "進む", "jump": "ch01_next_entry" },
    { "text": "立ち去る", "jump": "bad_end_1" }
  ]},

  { "type": "label", "name": "ch01_next_entry" },
  { "type": "scene", "sceneId": "ch01_next" },
  { "type": "jump", "target": "script_end" },

  { "type": "label", "name": "bad_end_1" },
  { "type": "scene", "sceneId": "bad_end_1" },
  { "type": "jump", "target": "script_end" },

  { "type": "label", "name": "script_end" }
]
```

### ルール
- 各ENDの後は `{ "type": "jump", "target": "script_end" }` で末尾に合流
- 末尾に `{ "type": "label", "name": "script_end" }` を配置
- `scene` の `label` は省略可（展開時にシーン名が自動でラベルになる）

---

## storyScenes.json — シーン定義

```json
[
  {
    "id": "ch01_prologue",
    "name": "01-1 放課後の教室",
    "description": "教室の情景描写、主人公の独白",
    "commands": [
      // コマンド配列（後述）
    ]
  }
]
```

### シーン名の命名規則
- `{話数}-{シーン番号} {タイトル}` 形式（例: `01-1 放課後の教室`）
- バッドエンドは `BAD END {番号} — {タイトル}`

---

## コマンド一覧

### テキスト表示

```json
// 台詞（話者あり）
{ "type": "dialog", "speaker": "凛", "text": "セリフ" }

// ナレーション（話者なし）
{ "type": "dialog", "speaker": "", "text": "地の文" }

// NVL モード（全画面テキスト）— 3行以上の連続する地の文のみに使用
{ "type": "nvl_on" }
{ "type": "dialog", "speaker": "", "text": "独白1行目" }
{ "type": "dialog", "speaker": "", "text": "独白2行目" }
{ "type": "dialog", "speaker": "", "text": "独白3行目" }
{ "type": "nvl_off" }

// NVL テキストクリア（ページ送り）
{ "type": "nvl_clear" }
```

#### NVL 使用ルール（重要）
- **使う**: 地の文が3行以上連続する独白・心理描写ブロック
- **使わない**: 台詞の応酬、地の文1-2行、台詞と地の文が交互に出る会話パート
- シーン全体が独白でも、使わなくてよい場合がある（短い独白の連続など）
- 1シーンにつき **0〜1回** が目安。多くても2回まで
- `nvl_clear` は長い独白の途中で4行程度ごとに挿入

### 背景

```json
{ "type": "bg", "src": "classroom_夕方", "transition": "fade", "time": 1500 }
```

| transition | 説明 |
|---|---|
| `fade` | フェードイン |
| `crossfade` | クロスフェード |
| `wipe_left` / `wipe_right` | ワイプ |
| `slide_left` / `slide_right` | スライド |
| `none` | 即座切替 |

### BGM / SE

```json
{ "type": "bgm", "name": "hirusagari" }
{ "type": "bgm_stop", "fadeout": 1500 }
{ "type": "se", "name": "click" }
{ "type": "se", "name": "click", "volume": 0.5 }
```

- `name` は `bgmCatalog.json` / `seCatalog.json` の `name` フィールドと一致させる
- ファイル名ではなくカタログ名で参照

### キャラクター

```json
// 登場
{ "type": "chara", "id": "rin", "position": "center", "expression": "neutral" }

// 表情変更（+ アニメーション）
{ "type": "chara_mod", "id": "rin", "expression": "smile" }
{ "type": "chara_mod", "id": "rin", "expression": "surprise", "anim": "shake" }

// 退場
{ "type": "chara_hide", "id": "rin" }
```

| position | 配置 |
|---|---|
| `left` | 左 (20%) |
| `center` | 中央 (50%) |
| `right` | 右 (80%) |

| anim | 効果 |
|---|---|
| `shake` | 左右に揺れる（驚き・衝撃） |
| `bounce` | 上に跳ねる（喜び） |
| `zoom` | 一瞬拡大（強調） |
| `nod` | 下に沈む（うなずき） |
| `tremble` | 細かく震える（恐怖・緊張） |

### エフェクト

```json
{ "type": "effect", "name": "fadeout", "color": "#000", "time": 1500, "clearText": true }
{ "type": "effect", "name": "fadein", "time": 1000 }
{ "type": "effect", "name": "flash", "color": "#4488ff", "time": 300 }
{ "type": "effect", "name": "shake", "time": 500 }
{ "type": "effect", "name": "whitefade", "time": 800 }
```

| name | 説明 |
|---|---|
| `fadeout` | 暗転（**必ず後に `fadein` を入れる**。END直前は例外） |
| `fadein` | 暗転から復帰 |
| `flash` | フラッシュ（`color` で色指定可） |
| `shake` | 画面振動 |
| `whitefade` | 白い暗転（**必ず後に `fadein` を入れる**） |

- `clearText: true` — エフェクト開始時にテキストボックスをクリア
- `fadeout` の後は `{ "type": "wait", "time": 500 }` → `{ "type": "effect", "name": "fadein", "time": 1000 }` のセットで使う
- END直前の `fadeout` は `fadein` 不要（暗転したまま終了）

### 待機

```json
{ "type": "wait", "time": 1000 }
```

### CG（イベント絵）

```json
{ "type": "cg", "id": "ch01_01", "src": "ch01-01.png" }
{ "type": "cg_hide" }
```

- CG はレイヤーとして背景の上に表示される
- `cg_hide` で非表示にするまで表示し続ける

### 分岐

```json
// ラベル（ジャンプ先）
{ "type": "label", "name": "chapter1_start" }

// ジャンプ
{ "type": "jump", "target": "chapter1_start" }

// 選択肢
{ "type": "choice", "options": [
  { "text": "選択肢A", "jump": "route_a" },
  { "text": "選択肢B", "jump": "route_b" }
]}
```

- 選択肢表示時、テキストボックスは自動でクリアされる

### コマンドの無効化

```json
{ "type": "dialog", "speaker": "", "text": "この行はスキップされる", "disabled": true }
```

- `disabled: true` を付けるとエンジン実行時にスキップされる
- データは残るので復活可能

---

## characters.json

```json
{
  "rin": {
    "name": "白石凛",
    "color": "#C8D8F0",
    "expressions": {
      "neutral": "🙂",
      "smile": "😊",
      "sad": "😢",
      "surprise": "😲"
    },
    "sprites": {
      "neutral": "shiraishi_rin/natural.png",
      "smile": "shiraishi_rin/smile.png"
    }
  }
}
```

- `expressions` のキーが表情ID。値は絵文字（スプライト未設定時のフォールバック）
- `sprites` のファイル名はプロジェクトの `assets/chara/` 配下のパス

---

## bgStyles.json

```json
{
  "classroom_夕方": {
    "background": "linear-gradient(180deg, #FF7E5F 0%, #FEB47B 30%, #FFD194 60%, #1a1a2e 100%)",
    "imageFile": "bg_classroom_af.jpg"
  },
  "hallway_夕方": {
    "background": "linear-gradient(180deg, #D5C4A1 0%, #C4B896 40%, #A89060 100%)"
  }
}
```

- `imageFile` がある場合はプロジェクトアセットから画像を読み込む
- `imageFile` がない場合は `background`（CSSグラデーション）で表示
- キー名がスクリプトの `bg.src` と一致する

---

## bgmCatalog.json

```json
[
  {
    "id": "bgm_hirusagari",
    "name": "hirusagari",
    "filename": "hirusagarinohabanera.mp3",
    "description": "放課後の穏やかな空気",
    "volume": 0.8,
    "loop": true,
    "fadeIn": 500,
    "fadeOut": 500
  }
]
```

- `name` がスクリプトの `bgm.name` と一致する
- `filename` はプロジェクトの `assets/bgm/` 配下のファイル名
- `filename: null` は未設定（ファイル未配置）

---

## seCatalog.json

```json
[
  {
    "id": "se_click",
    "name": "click",
    "filename": "click.mp3",
    "description": "決定音",
    "volume": 1.0
  }
]
```

---

## cgCatalog.json

```json
[
  {
    "id": "ch01_01",
    "title": "窓際の白石凛",
    "group": "第1話",
    "thumbnail": "ch01-01.png",
    "src": "ch01-01.png",
    "variants": []
  }
]
```

- `id` がスクリプトの `cg.id` と一致する
- `src` はプロジェクトの `assets/cg/` 配下のファイル名

---

## sceneOrder.json

```json
["ch01_prologue", "ch01_system", "ch01_approach", "bad_end_1", "bad_end_2"]
```

- シーンの表示順序を定義（エディタのシーン一覧に反映）

---

## _index.json への追記

`data/projects/_index.json` にプロジェクトのメタデータを追加する必要がある。

```json
{
  "id": "meta.json の id と一致",
  "name": "プロジェクト名",
  "dirName": "ディレクトリ名（= プロジェクト名）",
  "description": "説明",
  "gameType": "novel",
  "createdAt": "...",
  "updatedAt": "...",
  "scriptLength": 29,
  "mapCount": 0,
  "minigameCount": 0
}
```

---

## シナリオ作成のベストプラクティス

### シーン分割の粒度
- 1シーン = 1つの場面・情景の単位（場所・時間が変わったら新シーン）
- 長い会話は1シーンにまとめてOK
- 1シーンあたり 20〜80 コマンドが目安

### 演出パターン

**場面転換**
```json
{ "type": "effect", "name": "fadeout", "color": "#000", "time": 1500, "clearText": true },
{ "type": "chara_hide", "id": "rin" },
{ "type": "bg", "src": "classroom_夜", "transition": "none" },
{ "type": "wait", "time": 500 },
{ "type": "effect", "name": "fadein", "time": 1000 }
```

**SYSTEM メッセージ（ゲーム内UI）**
```json
{ "type": "dialog", "speaker": "SYSTEM", "text": "《メッセージ内容》" }
```
- NVLモードにはしない。通常テキストボックスで表示

**END 演出**
```json
{ "type": "dialog", "speaker": "", "text": "——BAD END 1「タイトル」——" },
{ "type": "effect", "name": "fadeout", "color": "#000", "time": 2000, "clearText": true }
```
- END直前の `fadeout` には `fadein` を入れない

**選択肢の前**
```json
{ "type": "dialog", "speaker": "", "text": "選択を迫る地の文。" },
{ "type": "choice", "options": [...] }
```
- 選択肢表示時、テキストは自動クリアされる

### ファイル名の規則
- **半角英数のみ**（日本語ファイル名は `file://` URLで問題を起こす）
- BGM/SE の `name` も半角英数
- 背景キーは日本語OK（`classroom_夕方` など）

---

## アクションゲーム（gameType: "action"）

### actionData.json

```json
{
  "playerConfig": {
    "speed": 4,
    "jumpPower": 10,
    "hp": 100,
    "gravity": 0.5,
    "maxFallSpeed": 12,
    "invincibleTime": 1000,
    "sprites": {
      "idle": "player_idle.png",
      "run": "player_run.png",
      "jump": "player_jump.png",
      "attack": "player_attack.png"
    },
    "hitbox": { "width": 24, "height": 32 },
    "attacks": [
      { "name": "通常攻撃", "damage": 10, "range": 32, "cooldown": 300 }
    ]
  },
  "enemies": [
    {
      "id": "slime",
      "name": "スライム",
      "hp": 30,
      "damage": 10,
      "speed": 1.5,
      "behavior": "patrol",
      "sprite": "enemy_slime.png",
      "hitbox": { "width": 24, "height": 24 },
      "drops": [{ "itemId": "coin", "chance": 0.5 }]
    }
  ],
  "stages": [
    {
      "id": "stage_1",
      "name": "草原ステージ",
      "mapId": 0,
      "bgm": "adventure",
      "timeLimit": 180,
      "clearCondition": "reach_goal",
      "spawnPoint": { "x": 2, "y": 10 },
      "goalPoint": { "x": 38, "y": 10 },
      "enemyPlacements": [
        { "enemyId": "slime", "x": 10, "y": 10 }
      ],
      "itemPlacements": [
        { "itemId": "coin", "x": 5, "y": 8 }
      ],
      "events": [
        { "trigger": "clear", "action": "novel", "sceneId": "stage_clear" }
      ]
    }
  ],
  "items": [
    { "id": "coin", "name": "コイン", "type": "score", "value": 100 },
    { "id": "heart", "name": "ハート", "type": "heal", "value": 20 }
  ]
}
```

### 敵behavior一覧

| behavior | 動作 |
|---|---|
| `patrol` | 左右往復 |
| `chase` | プレイヤー追跡 |
| `fly_sine` | 正弦波で飛行 |
| `stationary` | 固定（砲台等） |
| `boss` | ボス（専用AI） |

### clearCondition一覧

| 条件 | 説明 |
|---|---|
| `reach_goal` | ゴール地点到達 |
| `defeat_all` | 全敵撃破 |
| `defeat_boss` | ボス撃破 |
| `survive` | 制限時間生存 |
| `collect_all` | 全アイテム収集 |

### ノベルパート連携コマンド

```json
{ "type": "action_stage", "stageId": "stage_1" }
```

script.json でノベルとアクションを交互に配置:
```json
[
  { "type": "scene", "sceneId": "prologue" },
  { "type": "action_stage", "stageId": "stage_1" },
  { "type": "scene", "sceneId": "after_stage1" },
  { "type": "action_stage", "stageId": "stage_2" },
  { "type": "scene", "sceneId": "ending" }
]
```

### 詳細設計

`doujin-engine/docs/design/action-pipeline.md` を参照。
