// CG / シーン解放フラグ管理
const STORAGE_KEY = "doujin-engine-unlocks";

export function getUnlocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { cg: [], scene: [] };
  } catch {
    return { cg: [], scene: [] };
  }
}

export function unlock(type, id) {
  const data = getUnlocks();
  if (!data[type].includes(id)) {
    data[type].push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export function isUnlocked(type, id) {
  return getUnlocks()[type].includes(id);
}

export function unlockAll(catalog, type) {
  const data = getUnlocks();
  data[type] = catalog.map((item) => item.id || item.name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetUnlocks() {
  localStorage.removeItem(STORAGE_KEY);
}
