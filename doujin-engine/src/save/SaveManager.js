// セーブデータ永続化マネージャー
// Electron: IPC 経由でファイル保存
// ブラウザ: localStorage

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log("[SaveManager]", ...args);
}

const SLOT_COUNT = 4; // 0=AUTO, 1-3=手動

const isElectron = () => !!window.electronAPI?.isElectron;

// === ブラウザアダプター ===
const browserAdapter = {
  _key(projectId, slot) {
    return `doujin-save_${projectId}_slot${slot}`;
  },
  async write(projectId, slot, data) {
    const key = this._key(projectId, slot);
    log("browser.write:", key);
    localStorage.setItem(key, JSON.stringify(data));
  },
  async read(projectId, slot) {
    const key = this._key(projectId, slot);
    const raw = localStorage.getItem(key);
    log("browser.read:", key, raw ? "→ データあり" : "→ null");
    return raw ? JSON.parse(raw) : null;
  },
  async remove(projectId, slot) {
    const key = this._key(projectId, slot);
    log("browser.remove:", key);
    localStorage.removeItem(key);
  },
};

// === Electron アダプター ===
const electronAdapter = {
  async write(projectId, slot, data) {
    const filename = `${projectId}_slot${slot}.json`;
    log("electron.write:", filename);
    await window.electronAPI.saveFile(filename, data);
  },
  async read(projectId, slot) {
    const filename = `${projectId}_slot${slot}.json`;
    log("electron.read:", filename);
    const result = await window.electronAPI.loadFile(filename);
    log("electron.read: result =", result?.success ? "成功" : "失敗");
    return result?.success ? result.data : null;
  },
  async remove(projectId, slot) {
    const filename = `${projectId}_slot${slot}.json`;
    log("electron.remove:", filename);
    await window.electronAPI.saveFile(filename, null);
  },
};

function getAdapter() {
  const adapter = isElectron() ? "electron" : "browser";
  log("getAdapter:", adapter);
  return isElectron() ? electronAdapter : browserAdapter;
}

// セーブ
export async function saveGame(projectId, slot, stateSnapshot) {
  log("saveGame: projectId =", projectId, ", slot =", slot, ", scriptIndex =", stateSnapshot.scriptIndex, ", bg =", stateSnapshot.currentBg);
  const data = {
    version: "1.0",
    projectId,
    slot,
    savedAt: new Date().toISOString(),
    date: new Date().toLocaleString("ja-JP"),
    state: {
      scriptIndex: stateSnapshot.scriptIndex,
      currentBg: stateSnapshot.currentBg,
      characters: stateSnapshot.characters,
      backlog: stateSnapshot.backlog,
      bgmPlaying: stateSnapshot.bgmPlaying,
      speaker: stateSnapshot.currentSpeaker,
      text: stateSnapshot.displayedText,
    },
  };
  try {
    await getAdapter().write(projectId, slot, data);
    log("saveGame: 保存完了");
  } catch (err) {
    console.error("[SaveManager] saveGame エラー:", err);
  }
  return data;
}

// ロード
export async function loadGame(projectId, slot) {
  log("loadGame: projectId =", projectId, ", slot =", slot);
  try {
    const data = await getAdapter().read(projectId, slot);
    log("loadGame:", data ? `scriptIndex=${data.state?.scriptIndex}` : "データなし");
    return data;
  } catch (err) {
    console.error("[SaveManager] loadGame エラー:", err);
    return null;
  }
}

// 全スロットのメタデータ取得
export async function listSlots(projectId) {
  log("listSlots: projectId =", projectId);
  const adapter = getAdapter();
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const data = await adapter.read(projectId, i);
    slots.push(data ? {
      slot: i,
      date: data.date || data.savedAt,
      speaker: data.state?.speaker,
      text: data.state?.text,
    } : null);
  }
  const filled = slots.filter(Boolean).length;
  log("listSlots: 使用中スロット =", filled, "/", SLOT_COUNT);
  return slots;
}

// スロット削除
export async function deleteSlot(projectId, slot) {
  log("deleteSlot: projectId =", projectId, ", slot =", slot);
  await getAdapter().remove(projectId, slot);
}

export { SLOT_COUNT };
