// セーブデータ永続化マネージャー
// Electron: IPC 経由でファイル保存
// ブラウザ: localStorage

const SLOT_COUNT = 4; // 0=AUTO, 1-3=手動

const isElectron = () => !!window.electronAPI?.isElectron;

// === ブラウザアダプター ===
const browserAdapter = {
  _key(projectId, slot) {
    return `doujin-save_${projectId}_slot${slot}`;
  },
  async write(projectId, slot, data) {
    localStorage.setItem(this._key(projectId, slot), JSON.stringify(data));
  },
  async read(projectId, slot) {
    const raw = localStorage.getItem(this._key(projectId, slot));
    return raw ? JSON.parse(raw) : null;
  },
  async remove(projectId, slot) {
    localStorage.removeItem(this._key(projectId, slot));
  },
};

// === Electron アダプター ===
const electronAdapter = {
  async write(projectId, slot, data) {
    await window.electronAPI.saveFile(`${projectId}_slot${slot}.json`, data);
  },
  async read(projectId, slot) {
    const result = await window.electronAPI.loadFile(`${projectId}_slot${slot}.json`);
    return result?.success ? result.data : null;
  },
  async remove(projectId, slot) {
    await window.electronAPI.saveFile(`${projectId}_slot${slot}.json`, null);
  },
};

function getAdapter() {
  return isElectron() ? electronAdapter : browserAdapter;
}

// セーブ
export async function saveGame(projectId, slot, stateSnapshot) {
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
  await getAdapter().write(projectId, slot, data);
  return data;
}

// ロード
export async function loadGame(projectId, slot) {
  return await getAdapter().read(projectId, slot);
}

// 全スロットのメタデータ取得
export async function listSlots(projectId) {
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
  return slots;
}

// スロット削除
export async function deleteSlot(projectId, slot) {
  await getAdapter().remove(projectId, slot);
}

export { SLOT_COUNT };
