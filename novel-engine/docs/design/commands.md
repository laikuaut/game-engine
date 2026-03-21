# 設計書: コマンド拡張（wait / jump / label）

> 対象: E-013, E-014

## 1. 概要

スクリプト制御コマンド `wait`, `jump`, `label` を実装する。
ラベルベースのジャンプにより、インデックス直指定の脆弱性を解消する。

---

## 2. コマンド仕様

### 2.1 label

```js
{ type: "label", name: "scene_2" }
{ type: "label", name: "ending_a", recollection: true }
```

- **実行時**: 何もしない（マーカーとしてスキップ）
- **recollection: true**: シーン回想モードの対象としてフラグ登録
- **制約**: `name` はスクリプト内でユニークであること

### 2.2 jump

```js
{ type: "jump", target: "scene_2" }
{ type: "jump", target: 42 }           // 後方互換: インデックス直指定
```

- **target が文字列**: ラベルマップから解決
- **target が数値**: インデックスとしてそのまま使用（既存互換）
- **ラベル未発見時**: コンソール警告 + 次のコマンドへ進む（ゲームは止めない）

### 2.3 wait

```js
{ type: "wait", time: 2000 }
```

- **動作**: 指定ミリ秒間スクリプト進行を停止
- **スキップ**: クリック / Enter / Space で即座にスキップ可能
- **スキップモード中**: 即座にスキップ

---

## 3. ラベルマップの構築

### 3.1 構築タイミング

NovelEngine マウント時（または script prop 変更時）に一度だけ構築。

```js
// NovelEngine.jsx 内
const labelMap = useMemo(() => {
  const map = {};
  script.forEach((cmd, index) => {
    if (cmd.type === "label" && cmd.name) {
      if (map[cmd.name] !== undefined) {
        console.warn(`重複ラベル: "${cmd.name}" (index ${map[cmd.name]} と ${index})`);
      }
      map[cmd.name] = index;
    }
  });
  return map;
}, [script]);
```

### 3.2 ラベル解決関数

```js
function resolveTarget(target, labelMap) {
  if (typeof target === "number") return target;
  if (typeof target === "string") {
    const index = labelMap[target];
    if (index === undefined) {
      console.warn(`ラベル未発見: "${target}"`);
      return -1;  // 無効 → 次のコマンドへ進む
    }
    return index;
  }
  return -1;
}
```

### 3.3 choice コマンドとの連携

既存の `options[].jump` でもラベル名を使えるようにする:

```js
// handleChoice 内
const jumpTarget = resolveTarget(option.jump, labelMap);
if (jumpTarget < 0) return;  // 無効なジャンプ先
let nextIndex = jumpTarget;
nextIndex = processCommand(nextIndex);
// ...
```

---

## 4. wait コマンドの実装

### 4.1 ステート追加

```js
// reducer.js initialState
isWaiting: false,

// アクション
case "START_WAIT":
  return { ...state, isWaiting: true };
case "END_WAIT":
  return { ...state, isWaiting: false };
```

### 4.2 processCommand の変更

`wait` は `dialog` / `choice` / `effect` と同様に processCommand ループを中断する。

```js
// commands.js
case CMD.WAIT:
  dispatch({ type: ACTION.START_WAIT });
  // ループ中断 → NovelEngine 側で setTimeout を管理
  return i;  // 現在位置を返す

case CMD.LABEL:
  // 何もしない（スキップ）
  break;

case CMD.JUMP:
  const jumpIndex = resolveTarget(cmd.target, labelMap);
  if (jumpIndex >= 0) {
    // ジャンプ先から processCommand を再開
    return processCommand(jumpIndex);
  }
  break;
```

### 4.3 NovelEngine での wait 処理

```jsx
// advance() 内で wait に到達した場合
if (cmd.type === "wait") {
  dispatch({ type: "START_WAIT" });
  dispatch({ type: "SET_SCRIPT_INDEX", payload: nextIndex });
  const waitTime = cmd.time || 1000;
  waitRef.current = setTimeout(() => {
    dispatch({ type: "END_WAIT" });
    advance();  // 待機完了 → 次へ
  }, waitTime);
  return;
}

// advance() 冒頭で waiting 中のクリック処理
if (state.isWaiting) {
  clearTimeout(waitRef.current);
  waitRef.current = null;
  dispatch({ type: "END_WAIT" });
  // 次のコマンドへ進む（advance を再帰呼出しではなく、
  // 現在の scriptIndex + 1 から processCommand）
  proceedToNext();
  return;
}
```

---

## 5. jump の特殊ケース

### 5.1 前方ジャンプ（ループ防止）

```js
// jump で同じインデックスに飛ぶと無限ループになる
// → jump 先が自分自身の場合は警告して次へ進む
if (jumpIndex === currentIndex) {
  console.warn(`自己参照ジャンプ: index ${currentIndex}`);
  break;
}
```

### 5.2 jump 先が dialog/choice の場合

jump 先のコマンドが `dialog` や `choice` の場合は、直前の非表示コマンド（bg, chara 等）を
処理しない（jump 先から processCommand を再開すれば自然にそうなる）。

---

## 6. 変更ファイルまとめ

| ファイル | 変更内容 |
|---------|---------|
| `constants.js` | `CMD.WAIT`, `CMD.JUMP`, `CMD.LABEL`, `ACTION.START_WAIT`, `ACTION.END_WAIT` 追加 |
| `reducer.js` | `isWaiting` ステート + アクション追加 |
| `commands.js` | `wait`, `jump`, `label` の case 追加。`resolveTarget` 関数追加 |
| `NovelEngine.jsx` | `labelMap` 構築、`waitRef` 追加、advance() に wait/jump 処理追加 |

---

## 7. テスト観点

- [ ] label: 実行時にスキップされること
- [ ] jump (文字列): ラベル先へ正しくジャンプすること
- [ ] jump (数値): インデックスへ正しくジャンプすること（後方互換）
- [ ] jump: 存在しないラベルで警告が出てゲームが止まらないこと
- [ ] jump: 自己参照で無限ループしないこと
- [ ] choice の jump でラベル名が使えること
- [ ] wait: 指定時間後に次へ進むこと
- [ ] wait: クリックで即座にスキップできること
- [ ] wait: スキップモード中は即座にスキップされること
- [ ] 重複ラベル名で警告が出ること
