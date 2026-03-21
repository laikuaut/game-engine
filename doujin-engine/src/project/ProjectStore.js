// プロジェクトデータの CRUD
// Electron 環境: IPC 経由でファイルシステムに保存
// ブラウザ環境: Vite dev server API 経由でファイルシステムに保存

import { createEmptySaves } from "../engine/constants";

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
      neutral: "🙂",
      smile: "😊",
      happy: "😄",
      shy: "😳",
      sad: "😢",
      angry: "😠",
      surprise: "😲",
    },
  },
  ren: {
    name: "蓮",
    color: "#6699CC",
    expressions: {
      neutral: "🙂",
      smile: "😊",
      serious: "😐",
      angry: "😠",
      surprise: "😲",
      sad: "😢",
    },
  },
  saki: {
    name: "咲希",
    color: "#FFD700",
    expressions: {
      neutral: "🙂",
      smile: "😊",
      happy: "😄",
      tease: "😏",
      sad: "😢",
      surprise: "😲",
    },
  },
  rin: {
    name: "白石凛",
    color: "#FFD700",
    expressions: {
      neutral: "🙂",
      smile: "😊",
      happy: "😄",
      tease: "😏",
      sad: "😢",
      surprise: "😲",
    },
    sprites: {
      neutral: "/assets/chara/shiraishi_rin/natural.png",
      smile: "/assets/chara/shiraishi_rin/smile.png",
      sad: "/assets/chara/shiraishi_rin/sad.png",
    }
  },
};

const DEFAULT_BG_STYLES = {
  school_gate_昼: {
    // background: "linear-gradient(170deg, #87CEEB 0%, #E0F0FF 40%, #98D8A0 60%, #5A8F3C 100%)",
    background: "url(/assets/bg/bg_schoolgate_an.jpg) center/cover no-repeat",
  },
  classroom_昼: {
    // background: "linear-gradient(180deg, #F5E6D0 0%, #E8D5B8 30%, #C4956A 80%, #8B6914 100%)",
    background: "url(/assets/bg/bg_classroom_an.jpg) center/cover no-repeat",
  },
  classroom_夕方: {
    background: "url(/assets/bg/bg_classroom_af.jpg) center/cover no-repeat",
  },
  classroom_夜: {
    background: "url(/assets/bg/bg_classroom_nt.jpg) center/cover no-repeat",
  },
};

const DEFAULT_BGM_CATALOG = [
  { id: "bgm_hirusagari", name: "昼下がりのハバネラ", filename: "/assets/bgm/昼下がりのハバネラ.mp3", description: "穏やかな午後（甘茶の音楽工房）", volume: 0.8, loop: true, fadeIn: 500, fadeOut: 500 },
  { id: "bgm_morning_theme", name: "morning_theme", filename: null, description: "朝のテーマ", volume: 0.8, loop: true, fadeIn: 500, fadeOut: 500 },
  { id: "bgm_tension", name: "tension", filename: null, description: "緊迫シーン", volume: 0.8, loop: true, fadeIn: 300, fadeOut: 500 },
  { id: "bgm_sadness", name: "sadness", filename: null, description: "悲しいシーン", volume: 0.7, loop: true, fadeIn: 1000, fadeOut: 1000 },
  { id: "bgm_romance", name: "romance", filename: null, description: "恋愛シーン", volume: 0.7, loop: true, fadeIn: 500, fadeOut: 500 },
  { id: "bgm_night", name: "night", filename: null, description: "夜のシーン", volume: 0.6, loop: true, fadeIn: 500, fadeOut: 500 },
  { id: "bgm_battle", name: "battle", filename: null, description: "バトル曲", volume: 0.9, loop: true, fadeIn: 0, fadeOut: 300 },
  { id: "bgm_ending", name: "ending", filename: null, description: "エンディング", volume: 0.8, loop: false, fadeIn: 500, fadeOut: 1000 },
];

const DEFAULT_SE_CATALOG = [
  { id: "se_click", name: "click", filename: null, description: "決定音", volume: 1.0 },
  { id: "se_cancel", name: "cancel", filename: null, description: "キャンセル音", volume: 1.0 },
  { id: "se_chime", name: "chime", filename: null, description: "チャイム", volume: 1.0 },
  { id: "se_door", name: "door", filename: null, description: "ドア開閉", volume: 0.8 },
  { id: "se_footstep", name: "footstep", filename: null, description: "足音", volume: 0.7 },
  { id: "se_surprise", name: "surprise", filename: null, description: "驚き", volume: 1.0 },
  { id: "se_heartbeat", name: "heartbeat", filename: null, description: "心臓の鼓動", volume: 0.8 },
  { id: "se_wind", name: "wind", filename: null, description: "風の音", volume: 0.6 },
  { id: "se_rain", name: "rain", filename: null, description: "雨の音", volume: 0.7 },
  { id: "se_hit", name: "hit", filename: null, description: "打撃音", volume: 1.0 },
];

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
    bgmCatalog: DEFAULT_BGM_CATALOG,
    seCatalog: DEFAULT_SE_CATALOG,
  },
  rpg: {
    script: [
      { type: "bg", src: "field", transition: "fade" },
      { type: "dialog", speaker: "", text: "RPGプロジェクト開始…" },
    ],
    characters: {},
    bgStyles: DEFAULT_BG_STYLES,
    bgmCatalog: DEFAULT_BGM_CATALOG,
    seCatalog: DEFAULT_SE_CATALOG,
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
    bgmCatalog: DEFAULT_BGM_CATALOG,
    seCatalog: DEFAULT_SE_CATALOG,
    minigames: [],
  },
};

// ゲーム種別のラベル
export const GAME_TYPE_LABELS = {
  novel: "ノベル",
  rpg: "RPG",
  minigame: "ミニゲーム",
};

// 作品プリセット一覧（プルダウン用）
export const WORK_PRESETS = [
  {
    id: "blank",
    label: "空のプロジェクト",
    gameType: "novel",
    description: "",
  },
  {
    id: "sample_novel",
    label: "放課後の幽霊少女（ノベルサンプル）",
    gameType: "novel",
    description: "ラノベ風サンプルシナリオ（約10分・2ルート完結）",
    loader: async () => {
      const { default: script } = await import("../data/sample_scenario.js");
      return {
        script,
        characters: {
          yukina: {
            name: "雪菜", color: "#C8D8F0",
            expressions: { neutral: "🙂", smile: "😊", happy: "😄", shy: "😳", sad: "😢" },
          },
          saki: {
            name: "咲希", color: "#FFD700",
            expressions: { smile: "😊", happy: "😄", neutral: "🙂", sad: "😢" },
          },
        },
      };
    },
  },
  {
    id: "sample_ownership",
    label: "所有（ノベルサンプル）",
    gameType: "novel",
    description: "放課後の教室 — 選択肢あり・バッドエンド分岐",
    loader: async () => {
      const { default: script } = await import("../data/scenario_ownership.js");
      return {
        script,
        characters: {
          rin: {
            name: "凛", color: "#C8D8F0",
            expressions: {
              neutral: "🙂", curious: "🤔", perceptive: "👁", thoughtful: "😌",
              calm: "😶", flushed: "😳", vulnerable: "🥺", soft_smile: "🙂",
            },
          },
        },
      };
    },
  },
  {
    id: "sample_rpg",
    label: "勇者レイの冒険（RPGサンプル）",
    gameType: "rpg",
    description: "RPGサンプル（マップ4面・ボス戦付き）",
    loader: async () => {
      const { RPG_SCRIPT, RPG_CHARACTERS, RPG_MAPS, RPG_BATTLE_DATA, RPG_MINIGAMES } = await import("../data/sample_rpg.js");
      return {
        script: RPG_SCRIPT,
        characters: RPG_CHARACTERS,
        maps: RPG_MAPS,
        battleData: RPG_BATTLE_DATA,
        minigames: RPG_MINIGAMES,
      };
    },
  },
];

// プリセットからプロジェクトを作成
export async function createProjectFromPreset(presetId, nameOverride) {
  const preset = WORK_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;

  const name = nameOverride || preset.label;
  const project = await createProject(name, preset.description, preset.gameType);

  if (preset.loader) {
    const data = await preset.loader();
    await updateProject(project.id, data);
    return { ...project, ...data };
  }
  return project;
}

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
    saves: createEmptySaves(),
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
    saves: createEmptySaves(),
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
      saves: createEmptySaves(),
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
  // 絶対パス（/assets/...）はデフォルト素材としてそのまま返す
  if (filename.startsWith("/")) return filename;
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
