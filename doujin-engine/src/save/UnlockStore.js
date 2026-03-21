// CG / シーン解放フラグ管理
const STORAGE_KEY = "doujin-engine-unlocks";

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log("[UnlockStore]", ...args);
}

export function getUnlocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : { cg: [], scene: [] };
    log("getUnlocks: cg =", data.cg.length, ", scene =", data.scene.length);
    return data;
  } catch (err) {
    log("getUnlocks: パースエラー →", err.message);
    return { cg: [], scene: [] };
  }
}

export function unlock(type, id) {
  const data = getUnlocks();
  if (!data[type].includes(id)) {
    data[type].push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    log("unlock: 新規解放", type, "→", id, ", 合計:", data[type].length);
  } else {
    log("unlock: 既に解放済み", type, "→", id);
  }
}

export function isUnlocked(type, id) {
  const result = getUnlocks()[type].includes(id);
  log("isUnlocked:", type, id, "→", result);
  return result;
}

export function unlockAll(catalog, type) {
  const data = getUnlocks();
  data[type] = catalog.map((item) => item.id || item.name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  log("unlockAll:", type, "→", data[type].length, "件解放");
}

export function resetUnlocks() {
  log("resetUnlocks: 全解放フラグをリセット");
  localStorage.removeItem(STORAGE_KEY);
}
