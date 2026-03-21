// プロジェクトデータの CRUD
// Electron 環境: IPC 経由でファイルシステムに保存
// ブラウザ環境: Vite dev server API 経由でファイルシステムに保存

const ACTIVE_KEY = "doujin-engine-active-project";

// Electron 環境判定
const isElectron = () => !!window.electronAPI?.isElectron;

// デフォルトのプロジェクトテンプレート
const DEFAULT_SCRIPT = [
  { type: "bg", src: "school_gate", transition: "fade" },
  { type: "dialog", speaker: "", text: "ここにテキストを入力…" },
];

const DEFAULT_CHARACTERS = {
  sakura: {
    name: "桜",
    color: "#FFB7C5",
    expressions: {
      smile: "😊",
      happy: "😄",
      shy: "😳",
      sad: "😢",
      neutral: "🙂",
    },
  },
};

const DEFAULT_BG_STYLES = {
  school_gate: {
    background: "linear-gradient(170deg, #87CEEB 0%, #E0F0FF 40%, #98D8A0 60%, #5A8F3C 100%)",
  },
  classroom: {
    background: "linear-gradient(180deg, #F5E6D0 0%, #E8D5B8 30%, #C4956A 80%, #8B6914 100%)",
  },
  rooftop: {
    background: "linear-gradient(180deg, #4A90D9 0%, #87CEEB 40%, #B0C4DE 90%)",
  },
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ============================
// ブラウザ用（Vite dev server API）
// ============================
async function apiGet(url) {
  const res = await fetch(url);
  return res.json();
}

async function apiPost(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ============================
// 統一 API
// Electron: IPC, ブラウザ: fetch API
// すべて async に統一する
// ============================

// 全プロジェクト一覧を取得（メタデータのみ）
export async function getProjects() {
  if (isElectron()) {
    return await window.electronAPI.projectList();
  }
  return apiGet("/api/projects");
}

// プロジェクトを ID で取得（フルデータ）
export async function getProject(id) {
  if (isElectron()) {
    return await window.electronAPI.projectGet(id);
  }
  return apiPost("/api/project-get", { id });
}

// プロジェクトを保存
async function persistProject(project) {
  if (isElectron()) {
    await window.electronAPI.projectSave(project);
  } else {
    await apiPost("/api/project-save", project);
  }
}

// プロジェクトを削除
async function removeProject(id) {
  if (isElectron()) {
    await window.electronAPI.projectDelete(id);
  } else {
    await apiPost("/api/project-delete", { id });
  }
}

// ゲーム種別ごとのテンプレート
const GAME_TYPE_TEMPLATES = {
  novel: {
    script: DEFAULT_SCRIPT,
    characters: DEFAULT_CHARACTERS,
    bgStyles: DEFAULT_BG_STYLES,
  },
  rpg: {
    script: [
      { type: "bg", src: "field", transition: "fade" },
      { type: "dialog", speaker: "", text: "RPGプロジェクト開始…" },
    ],
    characters: {},
    bgStyles: DEFAULT_BG_STYLES,
    maps: [
      {
        name: "スタートマップ",
        width: 12,
        height: 10,
        tileSize: 32,
        layers: [
          {
            name: "地形",
            tiles: Array.from({ length: 10 }, () =>
              Array.from({ length: 12 }, () => "grass")
            ),
          },
          {
            name: "オブジェクト",
            tiles: Array.from({ length: 10 }, () =>
              Array.from({ length: 12 }, () => null)
            ),
          },
        ],
        events: [],
      },
    ],
    battleData: {
      enemies: [],
      skills: [],
      battles: [],
    },
  },
  minigame: {
    script: [
      { type: "dialog", speaker: "", text: "ミニゲームプロジェクト開始…" },
    ],
    characters: {},
    bgStyles: DEFAULT_BG_STYLES,
    minigames: [],
  },
};

// ゲーム種別のラベル
export const GAME_TYPE_LABELS = {
  novel: "ノベル",
  rpg: "RPG",
  minigame: "ミニゲーム",
};

// 新規プロジェクト作成
export async function createProject(name, description = "", gameType = "novel") {
  const template = GAME_TYPE_TEMPLATES[gameType] || GAME_TYPE_TEMPLATES.novel;
  const project = {
    id: generateId(),
    name,
    description,
    gameType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...JSON.parse(JSON.stringify(template)),
    saves: [null, null, null],
  };
  await persistProject(project);
  return project;
}

// プロジェクト更新（部分更新可）
export async function updateProject(id, updates) {
  const existing = await getProject(id);
  if (!existing) return null;
  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await persistProject(updated);
  return updated;
}

// プロジェクト削除
export async function deleteProject(id) {
  await removeProject(id);
  if (getActiveProjectId() === id) {
    setActiveProjectId(null);
  }
}

// プロジェクト複製
export async function duplicateProject(id) {
  const source = await getProject(id);
  if (!source) return null;
  const project = {
    ...JSON.parse(JSON.stringify(source)),
    id: generateId(),
    name: source.name + "（コピー）",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    saves: [null, null, null],
  };
  await persistProject(project);
  return project;
}

// アクティブプロジェクト ID
export function getActiveProjectId() {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveProjectId(id) {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

// プロジェクトをエクスポート（JSON 文字列を返す）
export async function exportProject(id) {
  const project = await getProject(id);
  if (!project) return null;
  const exported = {
    ...project,
    _exportVersion: "1.0",
    _exportedAt: new Date().toISOString(),
  };
  delete exported.saves;
  return JSON.stringify(exported, null, 2);
}

// プロジェクトをインポート（JSON 文字列から新規作成）
export async function importProject(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.name) throw new Error("プロジェクト名がありません");

    const project = {
      ...data,
      id: generateId(),
      name: data.name + "（インポート）",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      saves: [null, null, null],
    };
    delete project._exportVersion;
    delete project._exportedAt;

    await persistProject(project);
    return project;
  } catch (e) {
    console.error("インポート失敗:", e);
    return null;
  }
}

// ============================
// アセット管理
// ============================

// アセットをアップロード（type: "chara" | "bg"）
export async function uploadAsset(projectId, type, file) {
  const base64 = await fileToBase64(file);
  if (isElectron()) {
    return await window.electronAPI.assetUpload(projectId, type, file.name, base64);
  }
  return apiPost("/api/asset-upload", {
    projectId, type, filename: file.name, data: base64,
  });
}

// アセット一覧を取得
export async function listAssets(projectId, type) {
  if (isElectron()) {
    return await window.electronAPI.assetList(projectId, type);
  }
  return apiPost("/api/asset-list", { projectId, type });
}

// アセットを削除
export async function deleteAsset(projectId, type, filename) {
  if (isElectron()) {
    return await window.electronAPI.assetDelete(projectId, type, filename);
  }
  return apiPost("/api/asset-delete", { projectId, type, filename });
}

// アセットの表示用URLを取得
export function getAssetUrl(projectId, type, filename) {
  if (!projectId || !filename) return null;
  // ゲームモード（ビルド済みゲーム）: game-assets/ から配信
  if (projectId === "__game__") {
    return `./game-assets/${type}/${filename}`;
  }
  // Electron: file:// プロトコルで直接アクセス（非同期APIもあるが同期的にパス生成）
  // ブラウザ: Vite dev server のミドルウェアから配信
  return `/project-assets/${projectId}/${type}/${filename}`;
}

// File → base64 data URL
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// サンプルプロジェクト定義
const DEMO_NOVEL_NAME = "放課後の幽霊少女";
const DEMO_RPG_NAME = "勇者レイの冒険";

// デモプロジェクトを初期作成（不足分を補完）
let _demoLock = null;
export async function ensureDemoProject() {
  if (_demoLock) return _demoLock;
  _demoLock = _ensureDemoProjectImpl();
  try { await _demoLock; } finally { _demoLock = null; }
}
async function _ensureDemoProjectImpl() {
  const projects = await getProjects();
  const hasNovel = projects.some((p) => p.name === DEMO_NOVEL_NAME);
  const hasRPG = projects.some((p) => p.name === DEMO_RPG_NAME);
  if (hasNovel && hasRPG) return;

  // ノベルサンプル（存在しなければ作成）
  if (!hasNovel) {
    const { default: SAMPLE_SCENARIO } = await import("../data/sample_scenario.js");
    const novel = await createProject(DEMO_NOVEL_NAME, "ラノベ風サンプルシナリオ（約10分・2ルート完結）");
    await updateProject(novel.id, {
      script: SAMPLE_SCENARIO,
      characters: {
        yukina: {
          name: "雪菜",
          color: "#C8D8F0",
          expressions: { neutral: "🙂", smile: "😊", happy: "😄", shy: "😳", sad: "😢" },
        },
        saki: {
          name: "咲希",
          color: "#FFD700",
          expressions: { smile: "😊", happy: "😄", neutral: "🙂", sad: "😢" },
        },
      },
    });
  }

  // RPGサンプル（存在しなければ作成）
  if (!hasRPG) {
    const { RPG_SCRIPT, RPG_CHARACTERS, RPG_MAPS, RPG_BATTLE_DATA, RPG_MINIGAMES } = await import("../data/sample_rpg.js");
    const rpg = await createProject(DEMO_RPG_NAME, "RPGサンプル（マップ4面・ボス戦付き）", "rpg");
    await updateProject(rpg.id, {
      script: RPG_SCRIPT,
      characters: RPG_CHARACTERS,
      maps: RPG_MAPS,
      battleData: RPG_BATTLE_DATA,
      minigames: RPG_MINIGAMES,
    });
  }
}

// サンプルプロジェクトを手動で復元
export async function restoreDemoProjects() {
  // 既存の同名サンプルを削除してから再作成
  const projects = await getProjects();
  for (const p of projects) {
    if (p.name === DEMO_NOVEL_NAME || p.name === DEMO_RPG_NAME) {
      await deleteProject(p.id);
    }
  }

  const { default: SAMPLE_SCENARIO } = await import("../data/sample_scenario.js");
  const novel = await createProject(DEMO_NOVEL_NAME, "ラノベ風サンプルシナリオ（約10分・2ルート完結）");
  await updateProject(novel.id, {
    script: SAMPLE_SCENARIO,
    characters: {
      yukina: {
        name: "雪菜",
        color: "#C8D8F0",
        expressions: { neutral: "🙂", smile: "😊", happy: "😄", shy: "😳", sad: "😢" },
      },
      saki: {
        name: "咲希",
        color: "#FFD700",
        expressions: { smile: "😊", happy: "😄", neutral: "🙂", sad: "😢" },
      },
    },
  });

  const { RPG_SCRIPT, RPG_CHARACTERS, RPG_MAPS, RPG_BATTLE_DATA, RPG_MINIGAMES } = await import("../data/sample_rpg.js");
  const rpg = await createProject(DEMO_RPG_NAME, "RPGサンプル（マップ4面・ボス戦付き）", "rpg");
  await updateProject(rpg.id, {
    script: RPG_SCRIPT,
    characters: RPG_CHARACTERS,
    maps: RPG_MAPS,
    battleData: RPG_BATTLE_DATA,
    minigames: RPG_MINIGAMES,
  });
}
