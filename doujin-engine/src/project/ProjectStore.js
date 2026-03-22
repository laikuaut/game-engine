// プロジェクトデータの CRUD
// Electron 環境: IPC 経由でファイルシステムに保存
// ブラウザ環境: Vite dev server API 経由でファイルシステムに保存

import { createEmptySaves } from "../engine/constants";

const ACTIVE_KEY = "doujin-engine-active-project";

// Electron 環境判定
const isElectron = () => !!window.electronAPI?.isElectron;

// Electron本番（パッケージ済み）環境用: projectsDir のキャッシュ
let _projectsDirCache = null;
let _isPackaged = false;
const _initPromise = (async () => {
  if (!isElectron()) return;
  try {
    const info = await window.electronAPI.getAppInfo();
    _isPackaged = info.isPackaged;
    if (_isPackaged) {
      _projectsDirCache = info.projectsDir;
    }
  } catch {}
})();

// Electron本番環境: IDからdirNameを解決するキャッシュ
const _dirNameCache = {};
function _cacheDirName(id, dirName) {
  if (id && dirName) _dirNameCache[id] = dirName;
}

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
      neutral: "shiraishi_rin/natural.png",
      smile: "shiraishi_rin/smile.png",
      sad: "shiraishi_rin/sad.png",
    }
  },
};

// 背景: imageFile はプロジェクトアセットのファイル名
// createProject 後に copyDefaultAssets でコピーされるため、ファイル名だけ指定
const DEFAULT_BG_STYLES = {
  school_gate_昼: {
    background: "linear-gradient(170deg, #87CEEB 0%, #E0F0FF 40%, #98D8A0 60%, #5A8F3C 100%)",
    imageFile: "bg_schoolgate_an.jpg",
  },
  classroom_昼: {
    background: "linear-gradient(180deg, #F5E6D0 0%, #E8D5B8 30%, #C4956A 80%, #8B6914 100%)",
    imageFile: "bg_classroom_an.jpg",
  },
  classroom_夕方: {
    background: "linear-gradient(180deg, #FF7E5F 0%, #FEB47B 30%, #FFD194 60%, #1a1a2e 100%)",
    imageFile: "bg_classroom_af.jpg",
  },
  classroom_夜: {
    background: "linear-gradient(180deg, #0a0a2e 0%, #1a1a3e 40%, #2a2a4e 100%)",
    imageFile: "bg_classroom_nt.jpg",
  },
};

const DEFAULT_BGM_CATALOG = [
  { id: "bgm_hirusagari", name: "hirusagari", filename: "hirusagarinohabanera.mp3", description: "昼下がりのハバネラ（甘茶の音楽工房）", volume: 0.8, loop: true, fadeIn: 500, fadeOut: 500 },
];

const DEFAULT_SE_CATALOG = [
  { id: "se_click", name: "click", filename: "click.mp3", description: "クリック音", volume: 1.0 },
  { id: "se_dblclick", name: "dblclick", filename: "dblclick.mp3", description: "ダブルクリック音", volume: 1.0 },
  { id: "se_select2", name: "select2", filename: "select2.mp3", description: "選択音2", volume: 1.0 },
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
  await _initPromise;
  let projects;
  if (isElectron()) {
    projects = await window.electronAPI.projectList();
  } else {
    projects = await apiGet("/api/projects");
  }
  // dirName キャッシュを構築
  (projects || []).forEach((p) => { if (p.id && p.dirName) _cacheDirName(p.id, p.dirName); });
  return projects;
}

// プロジェクトを ID で取得（フルデータ）
export async function getProject(id) {
  await _initPromise;
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
  action: {
    script: [
      { type: "bg", src: "stage_1", transition: "fade" },
      { type: "dialog", speaker: "", text: "アクションプロジェクト開始…" },
    ],
    characters: {},
    bgStyles: DEFAULT_BG_STYLES,
    bgmCatalog: DEFAULT_BGM_CATALOG,
    seCatalog: DEFAULT_SE_CATALOG,
    maps: [
      {
        name: "ステージ1",
        width: 20,
        height: 12,
        tileSize: 32,
        layers: [
          {
            name: "地形",
            tiles: Array.from({ length: 12 }, () =>
              Array.from({ length: 20 }, () => "grass")
            ),
          },
          {
            name: "オブジェクト",
            tiles: Array.from({ length: 12 }, () =>
              Array.from({ length: 20 }, () => null)
            ),
          },
        ],
        events: [],
      },
    ],
    actionData: {
      playerConfig: { speed: 4, jumpPower: 10, hp: 100 },
      enemies: [],
      stages: [],
      items: [],
    },
  },
};

// ゲーム種別のラベル
export const GAME_TYPE_LABELS = {
  novel: "ノベル",
  rpg: "RPG",
  action: "アクション",
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
    id: "sample_features",
    label: "機能デモ（全コマンド網羅）",
    gameType: "novel",
    description: "bg/bgm/se/chara/dialog/choice/effect/wait/nvl/cg — 全コマンドの動作確認",
    loader: async () => {
      const { default: script } = await import("../data/sample_features.js");
      return { script };
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
  {
    id: "sample_action",
    label: "アクションサンプル（3ステージ）",
    gameType: "action",
    description: "2Dサイドスクロール — 草原・洞窟・ボス戦",
    loader: async () => {
      return {
        script: [
          { type: "dialog", speaker: "", text: "魔物が現れた村を救うため、冒険者は旅立った。" },
          { type: "dialog", speaker: "主人公", text: "行くぞ！" },
        ],
        characters: {
          player: {
            name: "主人公", color: "#4488FF",
            expressions: { neutral: "🙂", smile: "😊", damage: "😣" },
          },
        },
        actionData: {
          playerConfig: {
            speed: 4, jumpPower: 10, hp: 100,
            gravity: 0.5, maxFallSpeed: 12, invincibleTime: 1000,
            hitbox: { width: 24, height: 32 },
            attacks: [{ name: "パンチ", damage: 15, range: 32, cooldown: 300 }],
          },
          enemies: [
            { id: "slime", name: "スライム", hp: 30, damage: 10, speed: 1.5, behavior: "patrol", color: "#4CAF50", hitbox: { width: 24, height: 24 }, patrolRange: 4 },
            { id: "bat", name: "コウモリ", hp: 20, damage: 15, speed: 2, behavior: "fly_sine", color: "#9C27B0", hitbox: { width: 20, height: 20 }, patrolRange: 5 },
            { id: "boss_dragon", name: "ドラゴン", hp: 200, damage: 30, speed: 1.5, behavior: "boss", color: "#F44336", hitbox: { width: 48, height: 40 } },
          ],
          stages: [
            {
              id: "stage_1", name: "草原ステージ", mapId: 0, bgm: "stage",
              timeLimit: 120, clearCondition: "reach_goal",
              spawnPoint: { x: 2, y: 10 }, goalPoint: { x: 18, y: 10 },
              enemyPlacements: [
                { enemyId: "slime", x: 7, y: 10 },
                { enemyId: "slime", x: 12, y: 10 },
                { enemyId: "bat", x: 10, y: 6 },
              ],
              itemPlacements: [{ itemId: "coin", x: 5, y: 7 }, { itemId: "heart", x: 15, y: 9 }],
              events: [],
            },
          ],
          items: [
            { id: "coin", name: "コイン", type: "score", value: 100 },
            { id: "heart", name: "ハート", type: "heal", value: 30 },
          ],
        },
      };
    },
  },
  {
    id: "sample_minigame",
    label: "ミニゲームサンプル（3種）",
    gameType: "minigame",
    description: "じゃんけん・クイズ・スロット",
    loader: async () => {
      return {
        script: [
          { type: "dialog", speaker: "ディーラー", text: "ようこそ、ミニゲームカジノへ！" },
        ],
        characters: {
          dealer: {
            name: "ディーラー", color: "#9C27B0",
            expressions: { neutral: "🙂", smile: "😊", surprise: "😲" },
          },
        },
        minigames: [
          {
            id: "janken", name: "じゃんけん勝負", type: "janken",
            config: { rounds: 3 },
          },
          {
            id: "quiz_1", name: "雑学クイズ", type: "quiz",
            config: {
              questions: [
                { question: "日本で一番高い山は？", choices: ["富士山", "北岳", "奥穂高岳", "槍ヶ岳"], answer: 0 },
                { question: "1+1は？", choices: ["1", "2", "3", "11"], answer: 1 },
                { question: "水の化学式は？", choices: ["CO2", "H2O", "NaCl", "O2"], answer: 1 },
              ],
              timePerQuestion: 15, passScore: 2,
            },
          },
          {
            id: "slot_1", name: "スロットマシン", type: "slot",
            config: {
              reels: 3,
              symbols: ["🍒", "🍋", "🔔", "⭐", "7️⃣"],
              initialCoins: 100, betAmount: 10,
            },
          },
        ],
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
  // デフォルト素材をプロジェクトにコピー
  await copyDefaultAssets(project.id).catch((e) => console.warn("デフォルト素材コピー失敗:", e));
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

// デフォルト素材をプロジェクトにコピー
export async function copyDefaultAssets(projectId) {
  if (isElectron()) {
    return await window.electronAPI.copyDefaultAssets(projectId);
  }
  return apiPost("/api/copy-default-assets", { projectId });
}

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
  // 絶対パスやURLはそのまま返す
  if (filename.startsWith("/") || filename.startsWith("http")) return filename;
  // ゲームモード（ビルド済みゲーム）: game-assets/ から配信
  if (projectId === "__game__") {
    return `./game-assets/${type}/${filename}`;
  }
  // Electron 本番環境（パッケージ済み）: file:// で直接参照
  if (_isPackaged && _projectsDirCache) {
    const dirName = _dirNameCache[projectId] || projectId;
    const filePath = `${_projectsDirCache}/${dirName}/assets/${type}/${filename}`;
    return `file:///${filePath.replace(/\\/g, "/")}`;
  }
  // ブラウザ（開発時）: Vite dev server のミドルウェアから配信
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
