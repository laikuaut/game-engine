// プロジェクトデータの CRUD
// Electron 環境: IPC 経由でファイルシステムに保存
// ブラウザ環境: localStorage にフォールバック

const STORAGE_KEY = "doujin-engine-projects";
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
// ブラウザ用（localStorage）
// ============================
function getProjectsLocal() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveProjectsLocal(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function getProjectLocal(id) {
  return getProjectsLocal().find((p) => p.id === id) || null;
}

// ============================
// 統一 API（Electron は非同期、ブラウザは同期）
// すべて async に統一する
// ============================

// 全プロジェクト一覧を取得（メタデータのみ）
export async function getProjects() {
  if (isElectron()) {
    return await window.electronAPI.projectList();
  }
  return getProjectsLocal();
}

// プロジェクトを ID で取得（フルデータ）
export async function getProject(id) {
  if (isElectron()) {
    return await window.electronAPI.projectGet(id);
  }
  return getProjectLocal(id);
}

// プロジェクトを保存（Electron: ファイル, ブラウザ: localStorage）
async function persistProject(project) {
  if (isElectron()) {
    await window.electronAPI.projectSave(project);
  } else {
    const projects = getProjectsLocal();
    const idx = projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      projects[idx] = project;
    } else {
      projects.push(project);
    }
    saveProjectsLocal(projects);
  }
}

// プロジェクトを削除
async function removeProject(id) {
  if (isElectron()) {
    await window.electronAPI.projectDelete(id);
  } else {
    const projects = getProjectsLocal().filter((p) => p.id !== id);
    saveProjectsLocal(projects);
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

// デモプロジェクトを初期作成（初回起動時用）
export async function ensureDemoProject() {
  const projects = await getProjects();
  if (projects.length > 0) return;
  const demo = createProject("デモプロジェクト", "エンジンのデモシナリオ");
  // デモ用のフルスクリプトを設定
  updateProject(demo.id, {
    script: [
      { type: "bg", src: "school_gate", transition: "fade" },
      { type: "bgm", name: "morning_theme" },
      { type: "chara", id: "sakura", position: "center", expression: "smile" },
      { type: "dialog", speaker: "桜", text: "おはよう、先輩。今日もいい天気だね。" },
      { type: "dialog", speaker: "桜", text: "ねぇ、放課後なんだけど……ちょっと話したいことがあるの。" },
      { type: "chara_mod", id: "sakura", expression: "shy" },
      { type: "dialog", speaker: "桜", text: "あ、もし迷惑じゃなければ、だけど……" },
      {
        type: "choice",
        options: [
          { text: "もちろん、いいよ", jump: 7 },
          { text: "ごめん、今日は用事がある", jump: 12 },
        ],
      },
      { type: "chara_mod", id: "sakura", expression: "happy" },
      { type: "dialog", speaker: "桜", text: "ほんと！？ やったぁ！" },
      { type: "dialog", speaker: "桜", text: "じゃあ、放課後に屋上で待ってるね。" },
      { type: "se", name: "chime" },
      { type: "dialog", speaker: "", text: "チャイムが鳴り、桜は嬉しそうに教室へ向かった。" },
      { type: "chara_mod", id: "sakura", expression: "sad" },
      { type: "dialog", speaker: "桜", text: "そっか……そうだよね、忙しいもんね。" },
      { type: "dialog", speaker: "桜", text: "ううん、気にしないで。また今度でいいから。" },
      { type: "dialog", speaker: "", text: "桜は寂しそうに微笑んで、教室へ戻っていった。" },
      { type: "bg", src: "classroom", transition: "fade" },
      { type: "dialog", speaker: "", text: "ーー 第1章 終わり ーー" },
    ],
    // RPG デモデータ
    maps: [
      {
        name: "はじまりの村",
        width: 12,
        height: 10,
        tileSize: 32,
        layers: [
          {
            name: "地形",
            tiles: [
              ["tree","tree","tree","tree","tree","tree","tree","tree","tree","tree","tree","tree"],
              ["tree","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
              ["tree","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
              ["tree","grass","grass","stone","stone","stone","stone","grass","grass","grass","grass","tree"],
              ["tree","grass","grass","stone","stone","stone","stone","grass","grass","water","water","tree"],
              ["tree","grass","grass","stone","stone","stone","stone","grass","grass","water","water","tree"],
              ["tree","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
              ["tree","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
              ["tree","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
              ["tree","tree","tree","tree","tree","exit","tree","tree","tree","tree","tree","tree"],
            ],
          },
          {
            name: "オブジェクト",
            tiles: [
              [null,null,null,null,null,null,null,null,null,null,null,null],
              [null,null,null,null,null,null,null,null,null,null,null,null],
              [null,null,null,null,null,null,null,null,"npc",null,null,null],
              [null,null,null,null,null,"door",null,null,null,null,null,null],
              [null,null,null,null,null,null,null,null,null,null,null,null],
              [null,null,"chest",null,null,null,null,null,null,null,null,null],
              [null,null,null,null,null,null,null,null,null,null,null,null],
              [null,null,null,null,"spawn",null,null,null,null,null,null,null],
              [null,null,null,null,null,null,null,null,null,null,null,null],
              [null,null,null,null,null,null,null,null,null,null,null,null],
            ],
          },
        ],
        events: [
          { id: "e1", x: 8, y: 2, type: "dialog", trigger: "action", data: { speaker: "村人", text: "ようこそ、はじまりの村へ！" } },
          { id: "e2", x: 2, y: 5, type: "item", trigger: "action", data: { item: "ポーション", amount: 3 } },
          { id: "e3", x: 5, y: 9, type: "warp", trigger: "auto", data: { mapIndex: 1, x: 5, y: 1 } },
        ],
      },
      {
        name: "森の道",
        width: 12,
        height: 10,
        tileSize: 32,
        layers: [
          {
            name: "地形",
            tiles: [
              ["tree","tree","tree","tree","tree","exit","tree","tree","tree","tree","tree","tree"],
              ["tree","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
              ["tree","tree","grass","grass","dirt","dirt","grass","grass","tree","tree","grass","tree"],
              ["tree","tree","tree","grass","dirt","dirt","grass","tree","tree","tree","grass","tree"],
              ["tree","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
              ["tree","grass","tree","tree","dirt","dirt","tree","tree","grass","grass","grass","tree"],
              ["tree","grass","grass","grass","dirt","dirt","grass","grass","grass","tree","tree","tree"],
              ["tree","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
              ["tree","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
              ["tree","tree","tree","tree","tree","tree","tree","tree","tree","tree","tree","tree"],
            ],
          },
          {
            name: "オブジェクト",
            tiles: Array.from({ length: 10 }, (_, r) =>
              Array.from({ length: 12 }, (_, c) => {
                if (r === 3 && c === 7) return "enemy";
                if (r === 6 && c === 2) return "enemy";
                if (r === 8 && c === 9) return "chest";
                return null;
              })
            ),
          },
        ],
        events: [
          { id: "e4", x: 5, y: 0, type: "warp", trigger: "auto", data: { mapIndex: 0, x: 5, y: 8 } },
          { id: "e5", x: 7, y: 3, type: "battle", trigger: "action", data: { battleId: "b1" } },
          { id: "e6", x: 2, y: 6, type: "battle", trigger: "action", data: { battleId: "b2" } },
        ],
      },
    ],
    battleData: {
      enemies: [
        { id: "slime", name: "スライム", hp: 20, atk: 4, def: 2, speed: 3, exp: 5, gold: 3, skills: [], drops: [], sprite: "" },
        { id: "goblin", name: "ゴブリン", hp: 35, atk: 8, def: 4, speed: 5, exp: 12, gold: 8, skills: ["sk_slash"], drops: [], sprite: "" },
        { id: "wolf", name: "灰色オオカミ", hp: 28, atk: 10, def: 3, speed: 8, exp: 10, gold: 5, skills: ["sk_bite"], drops: [], sprite: "" },
        { id: "boss_troll", name: "トロル", hp: 120, atk: 18, def: 10, speed: 2, exp: 50, gold: 30, skills: ["sk_smash", "sk_roar"], drops: [], sprite: "" },
      ],
      skills: [
        { id: "sk_slash", name: "斬りつけ", type: "attack", power: 12, mpCost: 0, target: "single", element: "none", description: "鋭い一撃" },
        { id: "sk_bite", name: "噛みつき", type: "attack", power: 8, mpCost: 0, target: "single", element: "none", description: "素早い噛みつき" },
        { id: "sk_smash", name: "叩きつけ", type: "attack", power: 25, mpCost: 0, target: "single", element: "none", description: "強烈な一撃" },
        { id: "sk_roar", name: "咆哮", type: "debuff", power: 0, mpCost: 0, target: "all", element: "none", description: "全体の防御を下げる" },
        { id: "sk_fire", name: "ファイア", type: "magic", power: 15, mpCost: 5, target: "single", element: "fire", description: "炎の魔法" },
        { id: "sk_heal", name: "ヒール", type: "heal", power: 20, mpCost: 4, target: "self", element: "holy", description: "HPを回復" },
      ],
      battles: [
        { id: "b1", name: "森のゴブリン戦", enemies: ["goblin", "goblin"], bgm: "battle_theme", background: "forest", escapeAllowed: true, rewards: { exp: 24, gold: 16, items: [] } },
        { id: "b2", name: "オオカミの群れ", enemies: ["wolf", "wolf", "wolf"], bgm: "battle_theme", background: "forest", escapeAllowed: true, rewards: { exp: 30, gold: 15, items: [] } },
        { id: "b3", name: "ボス: トロル", enemies: ["slime", "boss_troll", "slime"], bgm: "boss_theme", background: "cave", escapeAllowed: false, rewards: { exp: 100, gold: 60, items: [] } },
      ],
    },
    minigames: [
      {
        id: "mg1",
        type: "quiz",
        title: "村人クイズ",
        timeLimit: 30,
        questions: [
          { text: "この村の名前は？", choices: ["はじまりの村", "終わりの村", "真ん中の村", "ない"], answer: 0, points: 10 },
          { text: "スライムの弱点は？", choices: ["火", "水", "雷", "物理"], answer: 0, points: 10 },
        ],
        passingScore: 10,
        onPass: { type: "jump", target: 0 },
        onFail: { type: "jump", target: 0 },
      },
    ],
  });
}
