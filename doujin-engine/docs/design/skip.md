# 設計書: スキップ機能

> 対象: E-015

## 1. 概要

テキスト送りを高速で自動実行し、特定の地点まで一気に進める機能。
Ctrl キー長押しまたはボタンでトグルする。

---

## 2. 動作仕様

### 2.1 トリガー

| 操作 | 動作 |
|------|------|
| Ctrl 長押し | 押している間だけスキップ。離すと停止 |
| SKIP ボタン | トグル式。もう一度押すと停止 |

### 2.2 スキップ中の動作

| コマンド種別 | 動作 |
|-------------|------|
| `dialog` | テキストを即時全文表示 → 50ms 後に次へ |
| `choice` | **スキップ停止**（ユーザー選択が必要） |
| `wait` | 即座にスキップ |
| `effect` | 即座にスキップ（エフェクト完了扱い） |
| `bg`, `chara` 等 | 通常通り即座に処理 |
| `bgm`, `se` | 通常通り処理（音は鳴る） |

### 2.3 スキップ速度

- **ダイアログ間**: 50ms（20コマンド/秒）
- **非ダイアログ**: 即座（0ms）

---

## 3. ステート設計

```js
// reducer.js initialState
skipMode: false,        // スキップモード ON/OFF（ボタントグル用）
ctrlPressed: false,     // Ctrl キー押下状態

// 派生: スキップ中かどうか
// isSkipping = state.skipMode || state.ctrlPressed

// アクション
case "SET_SKIP_MODE":
  return { ...state, skipMode: action.payload };
case "SET_CTRL_PRESSED":
  return { ...state, ctrlPressed: action.payload };
```

---

## 4. 実装

### 4.1 キーボードハンドラ変更

```js
// NovelEngine.jsx
useEffect(() => {
  const onKeyDown = (e) => {
    if (e.key === "Control") {
      dispatch({ type: "SET_CTRL_PRESSED", payload: true });
    }
    // ... 既存の Enter/Space/Escape 処理
  };
  const onKeyUp = (e) => {
    if (e.key === "Control") {
      dispatch({ type: "SET_CTRL_PRESSED", payload: false });
    }
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };
}, [advance]);
```

### 4.2 スキップループ

```js
const isSkipping = state.skipMode || state.ctrlPressed;
const skipRef = useRef(null);

useEffect(() => {
  if (isSkipping && !state.showChoice && !state.isWaiting) {
    skipRef.current = setInterval(() => {
      advance();
    }, 50);
  }
  return () => {
    if (skipRef.current) {
      clearInterval(skipRef.current);
      skipRef.current = null;
    }
  };
}, [isSkipping, state.showChoice, advance]);
```

### 4.3 スキップ中のテキスト表示

スキップ中はタイプライターをバイパスして即時全文表示:

```js
// startDialog 内
function startDialog(index) {
  const cmd = SCRIPT[index];
  if (isSkipping) {
    // タイプライターなしで即時表示
    dispatch({ type: "SET_SPEAKER", payload: cmd.speaker });
    dispatch({ type: "SET_DISPLAYED_TEXT", payload: cmd.text });
    dispatch({ type: "SET_TYPING", payload: false });
    dispatch({ type: "ADD_BACKLOG", payload: { speaker: cmd.speaker, text: cmd.text } });
    return;
  }
  // ... 既存のタイプライター処理
}
```

### 4.4 スキップ中の choice 到達

```js
// advance() 内、choice に到達した場合
if (cmd.type === "choice") {
  dispatch({ type: "SHOW_CHOICE", payload: cmd.options });
  // スキップモードを解除
  dispatch({ type: "SET_SKIP_MODE", payload: false });
}
```

---

## 5. UI

### 5.1 Controls に SKIP ボタン追加

```js
// Controls.jsx のボタン配列に追加
{ label: isSkipping ? "SKIP ●" : "SKIP",
  action: () => dispatch({ type: "SET_SKIP_MODE", payload: !state.skipMode }),
  active: isSkipping }
```

### 5.2 スキップ中インジケーター

```jsx
// NovelEngine.jsx 内、AUTO インジケーターと同様
{isSkipping && (
  <div style={{
    position: "absolute", top: 12, right: 16, zIndex: 20,
    fontSize: 11, color: "#F55", fontFamily: "monospace",
    background: "rgba(0,0,0,0.4)", padding: "3px 10px", borderRadius: 12,
  }}>
    {">> SKIP"}
  </div>
)}
```

---

## 6. AUTO モードとの競合

- スキップ開始時に AUTO モードを OFF にする
- AUTO 開始時にスキップモードを OFF にする
- Ctrl 長押しは AUTO と共存しない（Ctrl 中は AUTO 無効）

---

## 7. 変更ファイルまとめ

| ファイル | 変更内容 |
|---------|---------|
| `reducer.js` | `skipMode`, `ctrlPressed` ステート追加 |
| `constants.js` | `SET_SKIP_MODE`, `SET_CTRL_PRESSED` アクション追加 |
| `NovelEngine.jsx` | Ctrl ハンドラ、スキップループ、startDialog 分岐 |
| `Controls.jsx` | SKIP ボタン追加 |

---

## 8. テスト観点

- [ ] Ctrl 長押しでスキップが動作すること
- [ ] Ctrl を離すとスキップが停止すること
- [ ] SKIP ボタンでトグルできること
- [ ] 選択肢でスキップが停止すること
- [ ] スキップ中にテキストが即時表示されること
- [ ] スキップ中にバックログが正しく蓄積されること
- [ ] スキップ中に wait がスキップされること
- [ ] AUTO モードとの相互排他が動作すること
- [ ] スキップ中インジケーターが表示されること
