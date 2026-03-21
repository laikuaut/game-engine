# 設計書: セーブシステム

> 対象: S-003, S-004, S-005

## 1. 概要

セーブデータをブラウザ（localStorage）と Electron（fs）の両方で永続化する。
環境を自動判定し、統一 API で操作する。

---

## 2. アーキテクチャ

```
NovelEngine.jsx
  └─ SaveLoadView.jsx
       └─ SaveManager.js
            ├─ ElectronAdapter  (window.electronAPI 経由)
            └─ BrowserAdapter   (localStorage 経由)
```

---

## 3. ファイル構成

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/save/SaveManager.js` | 新規 | 環境判定 + 統一 API |
| `src/components/SaveLoadView.jsx` | 修正 | SaveManager 呼び出し |
| `src/engine/NovelEngine.jsx` | 修正 | オートセーブ呼び出し |
| `src/engine/reducer.js` | 修正 | saves を SaveManager から初期ロード |

---

## 4. SaveManager API

```js
class SaveManager {
  constructor(projectId) {
    this.projectId = projectId;
    this.adapter = window.electronAPI ? new ElectronAdapter() : new BrowserAdapter();
  }

  // セーブ
  async save(slot, stateSnapshot) {
    const data = {
      version: "1.0",
      projectId: this.projectId,
      slot,
      savedAt: new Date().toISOString(),
      state: {
        scriptIndex: stateSnapshot.scriptIndex,
        currentBg: stateSnapshot.currentBg,
        characters: stateSnapshot.characters,
        backlog: stateSnapshot.backlog,
        bgmPlaying: stateSnapshot.bgmPlaying,
        speaker: stateSnapshot.currentSpeaker,
        text: stateSnapshot.displayedText,
      },
      thumbnail: stateSnapshot.thumbnail || null,
    };
    await this.adapter.write(this.projectId, slot, data);
    return data;
  }

  // ロード
  async load(slot) {
    return await this.adapter.read(this.projectId, slot);
  }

  // 全スロット一覧（メタデータのみ）
  async listSlots() {
    const slots = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const data = await this.adapter.read(this.projectId, i);
      slots.push(data ? {
        slot: i,
        savedAt: data.savedAt,
        speaker: data.state?.speaker,
        text: data.state?.text,
        thumbnail: data.thumbnail,
      } : null);
    }
    return slots;
  }

  // スロット削除
  async deleteSlot(slot) {
    await this.adapter.delete(this.projectId, slot);
  }
}

const SLOT_COUNT = 4;  // スロット0=オートセーブ, 1-3=手動
```

---

## 5. アダプター設計

### 5.1 BrowserAdapter

```js
class BrowserAdapter {
  _key(projectId, slot) {
    return `doujin-save_${projectId}_slot${slot}`;
  }

  async write(projectId, slot, data) {
    localStorage.setItem(this._key(projectId, slot), JSON.stringify(data));
  }

  async read(projectId, slot) {
    const raw = localStorage.getItem(this._key(projectId, slot));
    return raw ? JSON.parse(raw) : null;
  }

  async delete(projectId, slot) {
    localStorage.removeItem(this._key(projectId, slot));
  }
}
```

### 5.2 ElectronAdapter

```js
class ElectronAdapter {
  async write(projectId, slot, data) {
    const path = `saves/${projectId}/slot_${slot}.json`;
    await window.electronAPI.saveFile(path, JSON.stringify(data, null, 2));
  }

  async read(projectId, slot) {
    const path = `saves/${projectId}/slot_${slot}.json`;
    try {
      const raw = await window.electronAPI.loadFile(path);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async delete(projectId, slot) {
    const path = `saves/${projectId}/slot_${slot}.json`;
    await window.electronAPI.saveFile(path, "");
  }
}
```

---

## 6. スロット設計

| スロット | 用途 | UI 表示 |
|---------|------|--------|
| 0 | オートセーブ | 「AUTO」ラベル、手動上書き不可 |
| 1 | 手動スロット 1 | 「スロット 1」 |
| 2 | 手動スロット 2 | 「スロット 2」 |
| 3 | 手動スロット 3 | 「スロット 3」 |

---

## 7. オートセーブ（S-005）

### トリガー

```js
// NovelEngine.jsx 内
useEffect(() => {
  // 以下のタイミングでオートセーブ
  // 1. 選択肢に到達した時
  // 2. BGM が変わった時
  // 3. 50 コマンドごと
  if (shouldAutoSave(state)) {
    saveManager.save(0, state);  // スロット 0 = AUTO
  }
}, [state.scriptIndex]);

function shouldAutoSave(state) {
  const cmd = script[state.scriptIndex];
  if (!cmd) return false;
  if (cmd.type === "choice") return true;
  if (state.scriptIndex > 0 && state.scriptIndex % 50 === 0) return true;
  return false;
}
```

---

## 8. サムネイル（S-004）

### キャプチャ方式

html2canvas は重いため、Canvas API で簡易キャプチャする。

```js
async function captureThumbnail(containerRef) {
  const el = containerRef.current;
  if (!el) return null;

  // html2canvas を使う場合（要 npm install html2canvas）
  // const canvas = await html2canvas(el, { scale: 0.25, useCORS: true });
  // return canvas.toDataURL("image/jpeg", 0.6);

  // 軽量版: 現在の背景色 + テキストのみのプレースホルダー
  // → 将来的に html2canvas に差し替え
  return null;
}
```

### サムネイル表示

```jsx
// SaveLoadView.jsx のスロット表示
{save.thumbnail && (
  <img
    src={save.thumbnail}
    alt=""
    style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 3 }}
  />
)}
```

---

## 9. reducer.js 変更

```js
// initialState
saves: [null, null, null, null],  // 4スロット（0=AUTO）

// SAVE_GAME を SaveManager 経由に変更するため、
// reducer 内の直接操作から、NovelEngine 側のコールバックに移行
// reducer からは SAVE_GAME / LOAD_GAME を削除し、
// saves ステートは SaveManager.listSlots() の結果を SET_SAVES で設定

case "SET_SAVES":
  return { ...state, saves: action.payload };
```

---

## 10. 初期ロードフロー

```
1. NovelEngine マウント
2. SaveManager.listSlots() で全スロットのメタデータ取得
3. dispatch({ type: "SET_SAVES", payload: slots })
4. UI にスロット一覧が反映される
```

---

## 11. テスト観点

- [ ] ブラウザ環境で localStorage にセーブ/ロードできること
- [ ] Electron 環境で fs にセーブ/ロードできること
- [ ] オートセーブが選択肢到達時に動作すること
- [ ] オートセーブスロットが手動上書きされないこと
- [ ] セーブデータが正しく復元されること（scriptIndex, bg, characters, backlog）
- [ ] 存在しないスロットのロードで null が返ること
- [ ] プロジェクト間でセーブデータが混在しないこと
- [ ] セーブ削除が正しく動作すること
