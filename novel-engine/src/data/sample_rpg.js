// RPGサンプルプロジェクト「勇者レイの冒険」
// マップ4面 / 敵8種 / スキル12種 / バトル6戦 / ボス2体
// シナリオ付き（ノベルパート連携）

// ============================================================
// シナリオスクリプト（RPGイベント間のストーリー）
// ============================================================
export const RPG_SCRIPT = [
  { type: "label", name: "prologue" },
  { type: "bg", src: "field", transition: "fade", time: 1500 },
  { type: "bgm", name: "village_theme" },

  { type: "nvl_on" },
  { type: "dialog", speaker: "", text: "かつて、この世界は魔王の脅威に怯えていた。" },
  { type: "dialog", speaker: "", text: "しかし一人の勇者が立ち上がり、\n魔王を封印の塔に閉じ込めた。" },
  { type: "dialog", speaker: "", text: "それから百年——\n封印が綻び始めているという噂が流れ始めた。" },
  { type: "nvl_clear" },
  { type: "dialog", speaker: "", text: "小さな村に暮らす少年レイは、\n村長から呼び出しを受けた。" },
  { type: "nvl_off" },

  { type: "chara", id: "elder", position: "center", expression: "neutral" },
  { type: "dialog", speaker: "村長", text: "レイよ、お前の父は先代の勇者だった。" },
  { type: "dialog", speaker: "村長", text: "封印の塔に異変が起きておる。\nお前にしか頼めぬことがある。" },
  { type: "dialog", speaker: "レイ", text: "俺が……勇者の息子だって？" },
  { type: "chara_mod", id: "elder", expression: "sad" },
  { type: "dialog", speaker: "村長", text: "お前の父はな、封印の代償に命を落とした。\nだがその力は、お前に受け継がれておる。" },
  { type: "dialog", speaker: "レイ", text: "…………わかった。行くよ。" },
  { type: "chara_mod", id: "elder", expression: "smile" },
  { type: "dialog", speaker: "村長", text: "ありがとう。まずは西の森を抜け、\n山岳地帯の先にある魔道士の塔を目指すのだ。" },
  { type: "dialog", speaker: "村長", text: "そこに封印の鍵がある。" },
  { type: "chara_hide", id: "elder" },
  { type: "se", name: "item_get" },
  { type: "dialog", speaker: "", text: "レイは村長から『勇者の剣』を受け取った。" },

  { type: "effect", name: "fadeout", color: "#000", time: 1000 },
  { type: "bg", src: "field", transition: "none" },
  { type: "effect", name: "fadein", time: 1000 },

  { type: "chara", id: "lina", position: "center", expression: "smile" },
  { type: "dialog", speaker: "リナ", text: "レイ！ 私も一緒に行くよ！" },
  { type: "dialog", speaker: "レイ", text: "リナ……危険だぞ？" },
  { type: "chara_mod", id: "lina", expression: "happy" },
  { type: "dialog", speaker: "リナ", text: "私だって回復魔法くらい使えるんだから！\n一人で行かせるわけないでしょ！" },
  { type: "dialog", speaker: "レイ", text: "……ありがとう。心強いよ。" },
  { type: "chara_hide", id: "lina" },

  { type: "dialog", speaker: "", text: "こうして二人の冒険が始まった——" },

  // 森クリア後
  { type: "label", name: "after_forest" },
  { type: "bg", src: "field", transition: "fade" },
  { type: "chara", id: "lina", position: "center", expression: "smile" },
  { type: "dialog", speaker: "リナ", text: "森を抜けたね。次は山岳地帯だ。" },
  { type: "dialog", speaker: "レイ", text: "ああ。でもモンスターが強くなってきたな。" },
  { type: "chara_mod", id: "lina", expression: "neutral" },
  { type: "dialog", speaker: "リナ", text: "大丈夫。二人なら何とかなるよ。" },
  { type: "chara_hide", id: "lina" },

  // 山岳クリア後 → 魔道士の塔
  { type: "label", name: "before_tower" },
  { type: "effect", name: "fadeout", color: "#000", time: 1000 },
  { type: "bg", src: "rooftop", transition: "none" },
  { type: "bgm", name: "dungeon_theme" },
  { type: "effect", name: "fadein", time: 1000 },
  { type: "dialog", speaker: "", text: "二人は魔道士の塔にたどり着いた。\n不気味な魔力が渦巻いている。" },
  { type: "chara", id: "lina", position: "center", expression: "sad" },
  { type: "dialog", speaker: "リナ", text: "嫌な気配……気をつけてね。" },
  { type: "chara_hide", id: "lina" },

  // ボス前
  { type: "label", name: "before_boss" },
  { type: "effect", name: "shake", intensity: 5, time: 600 },
  { type: "dialog", speaker: "？？？", text: "愚かな人間どもが……\nこの塔に足を踏み入れるとはな。" },
  { type: "chara", id: "demon", position: "center", expression: "neutral" },
  { type: "dialog", speaker: "魔将ヴォルグ", text: "我は魔王の右腕、魔将ヴォルグ。\n封印の鍵は渡さん。" },
  { type: "dialog", speaker: "レイ", text: "お前を倒してでも、鍵は手に入れる！" },
  { type: "chara_hide", id: "demon" },

  // ボス撃破後
  { type: "label", name: "after_boss" },
  { type: "bgm", name: "victory_theme" },
  { type: "se", name: "item_get" },
  { type: "dialog", speaker: "", text: "魔将ヴォルグを倒し、封印の鍵を手に入れた！" },
  { type: "chara", id: "lina", position: "center", expression: "happy" },
  { type: "dialog", speaker: "リナ", text: "やった……やったよレイ！" },
  { type: "dialog", speaker: "レイ", text: "ああ。でもこれはまだ始まりだ。\n封印の塔で魔王を止めなきゃ。" },
  { type: "chara_mod", id: "lina", expression: "smile" },
  { type: "dialog", speaker: "リナ", text: "うん。最後まで一緒に行くよ。" },
  { type: "chara_hide", id: "lina" },

  // エンディング
  { type: "label", name: "ending" },
  { type: "effect", name: "fadeout", color: "#000", time: 1500 },
  { type: "bgm_stop", fadeout: 1500 },
  { type: "wait", time: 500 },
  { type: "bg", src: "school_gate", transition: "none" },
  { type: "bgm", name: "ending_theme" },
  { type: "effect", name: "fadein", time: 1500 },

  { type: "nvl_on" },
  { type: "dialog", speaker: "", text: "封印の鍵を手に、\nレイとリナは封印の塔を目指す。" },
  { type: "dialog", speaker: "", text: "二人の冒険はまだ続く——" },
  { type: "dialog", speaker: "", text: "『勇者レイの冒険』\n\n—— 第一章 完 ——" },
  { type: "nvl_off" },
];

// ============================================================
// キャラクター定義
// ============================================================
export const RPG_CHARACTERS = {
  elder: {
    name: "村長",
    color: "#A0926B",
    expressions: { neutral: "🧓", smile: "😊", sad: "😢" },
  },
  lina: {
    name: "リナ",
    color: "#FF8FAB",
    expressions: { smile: "😊", happy: "😄", neutral: "🙂", sad: "😟" },
  },
  demon: {
    name: "魔将ヴォルグ",
    color: "#8B0000",
    expressions: { neutral: "👹" },
  },
};

// ============================================================
// マップデータ（4面）
// ============================================================
export const RPG_MAPS = [
  // === マップ1: はじまりの村 ===
  {
    name: "はじまりの村",
    width: 14,
    height: 12,
    tileSize: 32,
    layers: [
      {
        name: "地形",
        tiles: [
          ["tree","tree","tree","tree","tree","tree","tree","tree","tree","tree","tree","tree","tree","tree"],
          ["tree","grass","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","grass","tree"],
          ["tree","grass","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","grass","tree"],
          ["tree","grass","grass","stone","stone","stone","stone","stone","stone","grass","grass","grass","grass","tree"],
          ["tree","grass","grass","stone","stone","stone","stone","stone","stone","grass","grass","water","water","tree"],
          ["tree","grass","grass","stone","stone","stone","stone","stone","stone","grass","grass","water","water","tree"],
          ["tree","grass","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","grass","tree"],
          ["tree","grass","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","grass","tree"],
          ["tree","grass","grass","grass","grass","dirt","dirt","grass","grass","grass","stone","stone","grass","tree"],
          ["tree","grass","grass","grass","grass","dirt","dirt","grass","grass","grass","stone","stone","grass","tree"],
          ["tree","grass","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","grass","tree"],
          ["tree","tree","tree","tree","tree","exit","exit","tree","tree","tree","tree","tree","tree","tree"],
        ],
      },
      {
        name: "オブジェクト",
        tiles: [
          [null,null,null,null,null,null,null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,"npc",null,null,null,null],
          [null,null,null,null,null,"door",null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,null,null,null,null,null],
          [null,null,"npc",null,null,null,null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,"chest",null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,null,null,"npc",null,null],
          [null,null,null,null,"spawn",null,null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,null,null,null,null,null],
          [null,null,null,null,null,null,null,null,null,null,null,null,null,null],
        ],
      },
    ],
    events: [
      { id: "e_elder", x: 9, y: 2, type: "dialog", trigger: "action", data: { speaker: "村人", text: "村長が君を探していたよ。村長の家は北の大きな建物だ。" } },
      { id: "e_shop", x: 2, y: 5, type: "dialog", trigger: "action", data: { speaker: "道具屋", text: "いらっしゃい！ ポーションなら10Gだよ。" } },
      { id: "e_chest1", x: 8, y: 7, type: "item", trigger: "action", data: { item: "ポーション", amount: 3 } },
      { id: "e_hint", x: 11, y: 8, type: "dialog", trigger: "action", data: { speaker: "老人", text: "西の森には魔物がおる。\nレベルを上げてから行きなさい。" } },
      { id: "e_exit", x: 5, y: 11, type: "warp", trigger: "auto", data: { mapIndex: 1, x: 6, y: 1 } },
      { id: "e_exit2", x: 6, y: 11, type: "warp", trigger: "auto", data: { mapIndex: 1, x: 7, y: 1 } },
    ],
  },

  // === マップ2: 西の森 ===
  {
    name: "西の森",
    width: 14,
    height: 12,
    tileSize: 32,
    layers: [
      {
        name: "地形",
        tiles: [
          ["tree","tree","tree","tree","tree","tree","exit","exit","tree","tree","tree","tree","tree","tree"],
          ["tree","grass","grass","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
          ["tree","grass","tree","tree","grass","grass","dirt","dirt","grass","grass","tree","grass","grass","tree"],
          ["tree","grass","tree","tree","tree","grass","dirt","dirt","grass","tree","tree","grass","grass","tree"],
          ["tree","grass","grass","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
          ["tree","grass","grass","tree","tree","grass","dirt","dirt","grass","tree","tree","grass","grass","tree"],
          ["tree","grass","grass","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
          ["tree","tree","grass","grass","tree","grass","dirt","dirt","grass","grass","grass","tree","grass","tree"],
          ["tree","grass","grass","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
          ["tree","grass","tree","grass","grass","grass","dirt","dirt","grass","grass","tree","tree","grass","tree"],
          ["tree","grass","grass","grass","grass","grass","dirt","dirt","grass","grass","grass","grass","grass","tree"],
          ["tree","tree","tree","tree","tree","tree","exit","exit","tree","tree","tree","tree","tree","tree"],
        ],
      },
      {
        name: "オブジェクト",
        tiles: Array.from({ length: 12 }, (_, r) =>
          Array.from({ length: 14 }, (_, c) => {
            if (r === 3 && c === 9) return "enemy";
            if (r === 5 && c === 3) return "enemy";
            if (r === 7 && c === 11) return "enemy";
            if (r === 9 && c === 2) return "enemy";
            if (r === 6 && c === 12) return "chest";
            return null;
          })
        ),
      },
    ],
    events: [
      { id: "e_back_village", x: 6, y: 0, type: "warp", trigger: "auto", data: { mapIndex: 0, x: 5, y: 10 } },
      { id: "e_back_village2", x: 7, y: 0, type: "warp", trigger: "auto", data: { mapIndex: 0, x: 6, y: 10 } },
      { id: "e_wolf1", x: 9, y: 3, type: "battle", trigger: "action", data: { battleId: "b_wolf" } },
      { id: "e_goblin1", x: 3, y: 5, type: "battle", trigger: "action", data: { battleId: "b_goblin" } },
      { id: "e_wolf2", x: 11, y: 7, type: "battle", trigger: "action", data: { battleId: "b_wolf_pack" } },
      { id: "e_goblin2", x: 2, y: 9, type: "battle", trigger: "action", data: { battleId: "b_goblin_chief" } },
      { id: "e_chest_forest", x: 12, y: 6, type: "item", trigger: "action", data: { item: "鉄の盾", amount: 1 } },
      { id: "e_to_mountain", x: 6, y: 11, type: "warp", trigger: "auto", data: { mapIndex: 2, x: 6, y: 1 } },
      { id: "e_to_mountain2", x: 7, y: 11, type: "warp", trigger: "auto", data: { mapIndex: 2, x: 7, y: 1 } },
    ],
  },

  // === マップ3: 山岳地帯 ===
  {
    name: "山岳地帯",
    width: 14,
    height: 12,
    tileSize: 32,
    layers: [
      {
        name: "地形",
        tiles: [
          ["stone","stone","stone","stone","stone","stone","exit","exit","stone","stone","stone","stone","stone","stone"],
          ["stone","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","stone"],
          ["stone","dirt","stone","stone","dirt","dirt","dirt","dirt","dirt","stone","stone","dirt","dirt","stone"],
          ["stone","dirt","stone","stone","stone","dirt","dirt","dirt","stone","stone","stone","dirt","dirt","stone"],
          ["stone","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","stone"],
          ["stone","dirt","dirt","stone","dirt","dirt","dirt","dirt","dirt","stone","dirt","dirt","dirt","stone"],
          ["stone","dirt","dirt","stone","stone","dirt","dirt","dirt","stone","stone","dirt","dirt","dirt","stone"],
          ["stone","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","stone"],
          ["stone","dirt","stone","dirt","dirt","dirt","dirt","dirt","dirt","dirt","stone","dirt","dirt","stone"],
          ["stone","dirt","stone","stone","dirt","dirt","dirt","dirt","dirt","stone","stone","dirt","dirt","stone"],
          ["stone","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","stone"],
          ["stone","stone","stone","stone","stone","stone","exit","exit","stone","stone","stone","stone","stone","stone"],
        ],
      },
      {
        name: "オブジェクト",
        tiles: Array.from({ length: 12 }, (_, r) =>
          Array.from({ length: 14 }, (_, c) => {
            if (r === 3 && c === 5) return "enemy";
            if (r === 5 && c === 10) return "enemy";
            if (r === 8 && c === 4) return "enemy";
            if (r === 9 && c === 11) return "chest";
            return null;
          })
        ),
      },
    ],
    events: [
      { id: "e_back_forest", x: 6, y: 0, type: "warp", trigger: "auto", data: { mapIndex: 1, x: 6, y: 10 } },
      { id: "e_back_forest2", x: 7, y: 0, type: "warp", trigger: "auto", data: { mapIndex: 1, x: 7, y: 10 } },
      { id: "e_gargoyle1", x: 5, y: 3, type: "battle", trigger: "action", data: { battleId: "b_gargoyle" } },
      { id: "e_harpy", x: 10, y: 5, type: "battle", trigger: "action", data: { battleId: "b_harpy" } },
      { id: "e_golem", x: 4, y: 8, type: "battle", trigger: "action", data: { battleId: "b_golem" } },
      { id: "e_chest_mt", x: 11, y: 9, type: "item", trigger: "action", data: { item: "エリクサー", amount: 1 } },
      { id: "e_to_tower", x: 6, y: 11, type: "warp", trigger: "auto", data: { mapIndex: 3, x: 6, y: 1 } },
      { id: "e_to_tower2", x: 7, y: 11, type: "warp", trigger: "auto", data: { mapIndex: 3, x: 7, y: 1 } },
    ],
  },

  // === マップ4: 魔道士の塔 ===
  {
    name: "魔道士の塔",
    width: 14,
    height: 14,
    tileSize: 32,
    layers: [
      {
        name: "地形",
        tiles: [
          ["stone","stone","stone","stone","stone","stone","stone","stone","stone","stone","stone","stone","stone","stone"],
          ["stone","stone","stone","stone","stone","stone","stone","stone","stone","stone","stone","stone","stone","stone"],
          ["stone","stone","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","stone","stone"],
          ["stone","stone","dirt","stone","stone","dirt","dirt","dirt","dirt","stone","stone","dirt","stone","stone"],
          ["stone","stone","dirt","stone","dirt","dirt","dirt","dirt","dirt","dirt","stone","dirt","stone","stone"],
          ["stone","stone","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","stone","stone"],
          ["stone","stone","dirt","dirt","dirt","dirt","stone","stone","dirt","dirt","dirt","dirt","stone","stone"],
          ["stone","stone","dirt","dirt","dirt","dirt","stone","stone","dirt","dirt","dirt","dirt","stone","stone"],
          ["stone","stone","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","stone","stone"],
          ["stone","stone","dirt","stone","dirt","dirt","dirt","dirt","dirt","dirt","stone","dirt","stone","stone"],
          ["stone","stone","dirt","stone","stone","dirt","dirt","dirt","dirt","stone","stone","dirt","stone","stone"],
          ["stone","stone","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","dirt","stone","stone"],
          ["stone","stone","stone","stone","stone","stone","exit","exit","stone","stone","stone","stone","stone","stone"],
          ["stone","stone","stone","stone","stone","stone","stone","stone","stone","stone","stone","stone","stone","stone"],
        ],
      },
      {
        name: "オブジェクト",
        tiles: Array.from({ length: 14 }, (_, r) =>
          Array.from({ length: 14 }, (_, c) => {
            if (r === 4 && c === 4) return "enemy";
            if (r === 4 && c === 9) return "enemy";
            if (r === 6 && c === 6) return "enemy"; // ボス
            if (r === 9 && c === 4) return "chest";
            if (r === 9 && c === 9) return "chest";
            return null;
          })
        ),
      },
    ],
    events: [
      { id: "e_back_mt", x: 6, y: 12, type: "warp", trigger: "auto", data: { mapIndex: 2, x: 6, y: 10 } },
      { id: "e_back_mt2", x: 7, y: 12, type: "warp", trigger: "auto", data: { mapIndex: 2, x: 7, y: 10 } },
      { id: "e_demon1", x: 4, y: 4, type: "battle", trigger: "action", data: { battleId: "b_dark_knight" } },
      { id: "e_demon2", x: 9, y: 4, type: "battle", trigger: "action", data: { battleId: "b_dark_mage" } },
      { id: "e_boss", x: 6, y: 6, type: "battle", trigger: "action", data: { battleId: "b_boss_volg" } },
      { id: "e_chest_tower1", x: 4, y: 9, type: "item", trigger: "action", data: { item: "ハイポーション", amount: 3 } },
      { id: "e_chest_tower2", x: 9, y: 9, type: "item", trigger: "action", data: { item: "フェニックスの尾", amount: 1 } },
    ],
  },
];

// ============================================================
// バトルデータ
// ============================================================
export const RPG_BATTLE_DATA = {
  enemies: [
    // 森エリア
    { id: "slime",        name: "スライム",       hp: 20,  atk: 4,  def: 2,  speed: 3,  exp: 5,   gold: 3,   skills: [],               drops: [{ item: "スライムゼリー", rate: 0.3 }], sprite: "" },
    { id: "goblin",       name: "ゴブリン",       hp: 35,  atk: 8,  def: 4,  speed: 5,  exp: 12,  gold: 8,   skills: ["sk_slash"],      drops: [{ item: "ゴブリンの牙", rate: 0.2 }],   sprite: "" },
    { id: "wolf",         name: "灰色オオカミ",   hp: 28,  atk: 10, def: 3,  speed: 8,  exp: 10,  gold: 5,   skills: ["sk_bite"],       drops: [],                                      sprite: "" },
    { id: "goblin_chief", name: "ゴブリンチーフ",  hp: 60,  atk: 14, def: 6,  speed: 5,  exp: 25,  gold: 20,  skills: ["sk_slash", "sk_war_cry"], drops: [{ item: "鉄の剣", rate: 0.1 }],  sprite: "" },
    // 山岳エリア
    { id: "gargoyle",     name: "ガーゴイル",     hp: 55,  atk: 16, def: 12, speed: 4,  exp: 22,  gold: 15,  skills: ["sk_stone_claw"], drops: [],                                      sprite: "" },
    { id: "harpy",        name: "ハーピー",       hp: 40,  atk: 13, def: 5,  speed: 12, exp: 18,  gold: 12,  skills: ["sk_wind_slash"], drops: [{ item: "風切り羽", rate: 0.25 }],       sprite: "" },
    { id: "golem",        name: "ロックゴーレム", hp: 90,  atk: 20, def: 18, speed: 1,  exp: 35,  gold: 25,  skills: ["sk_smash"],      drops: [{ item: "魔石", rate: 0.15 }],           sprite: "" },
    // 塔エリア
    { id: "dark_knight",  name: "ダークナイト",   hp: 70,  atk: 22, def: 14, speed: 6,  exp: 40,  gold: 30,  skills: ["sk_dark_slash", "sk_guard"], drops: [],                           sprite: "" },
    { id: "dark_mage",    name: "ダークメイジ",   hp: 50,  atk: 12, def: 6,  speed: 9,  exp: 38,  gold: 28,  skills: ["sk_fire", "sk_blizzard"],   drops: [{ item: "魔道書", rate: 0.1 }], sprite: "" },
    // ボス
    { id: "boss_volg",    name: "魔将ヴォルグ",   hp: 250, atk: 30, def: 16, speed: 7,  exp: 150, gold: 100, skills: ["sk_dark_slash", "sk_smash", "sk_roar", "sk_dark_flame"], drops: [{ item: "封印の鍵", rate: 1.0 }], sprite: "" },
  ],

  skills: [
    // 物理系
    { id: "sk_slash",      name: "斬りつけ",   type: "attack", power: 12, mpCost: 0, target: "single", element: "none",  description: "鋭い一撃" },
    { id: "sk_bite",       name: "噛みつき",   type: "attack", power: 8,  mpCost: 0, target: "single", element: "none",  description: "素早い噛みつき" },
    { id: "sk_smash",      name: "叩きつけ",   type: "attack", power: 25, mpCost: 0, target: "single", element: "none",  description: "強烈な一撃" },
    { id: "sk_stone_claw", name: "石の爪",     type: "attack", power: 18, mpCost: 0, target: "single", element: "earth", description: "硬い爪で引き裂く" },
    { id: "sk_dark_slash", name: "暗黒斬",     type: "attack", power: 22, mpCost: 3, target: "single", element: "dark",  description: "闇を纏った剣撃" },
    // 魔法系
    { id: "sk_fire",       name: "ファイア",   type: "magic",  power: 15, mpCost: 5,  target: "single", element: "fire",  description: "炎の魔法" },
    { id: "sk_blizzard",   name: "ブリザド",   type: "magic",  power: 15, mpCost: 5,  target: "single", element: "ice",   description: "氷の魔法" },
    { id: "sk_wind_slash", name: "風の刃",     type: "magic",  power: 12, mpCost: 4,  target: "all",    element: "wind",  description: "全体に風の刃を飛ばす" },
    { id: "sk_dark_flame", name: "暗黒炎",     type: "magic",  power: 30, mpCost: 8,  target: "all",    element: "dark",  description: "全体を暗黒の炎で焼き尽くす" },
    // 補助系
    { id: "sk_heal",       name: "ヒール",     type: "heal",   power: 20, mpCost: 4,  target: "self",   element: "holy",  description: "HPを回復" },
    { id: "sk_roar",       name: "咆哮",       type: "debuff", power: 0,  mpCost: 0,  target: "all",    element: "none",  description: "全体の防御を下げる" },
    { id: "sk_war_cry",    name: "鬨の声",     type: "buff",   power: 0,  mpCost: 0,  target: "self",   element: "none",  description: "攻撃力を上げる" },
    { id: "sk_guard",      name: "ガード",     type: "buff",   power: 0,  mpCost: 0,  target: "self",   element: "none",  description: "防御力を大幅に上げる" },
  ],

  battles: [
    // 森エリア
    { id: "b_wolf",         name: "オオカミとの遭遇",     enemies: ["wolf", "slime"],                bgm: "battle_theme", background: "forest",  escapeAllowed: true,  rewards: { exp: 15,  gold: 8,   items: [] } },
    { id: "b_goblin",       name: "ゴブリンの待ち伏せ",   enemies: ["goblin", "goblin"],             bgm: "battle_theme", background: "forest",  escapeAllowed: true,  rewards: { exp: 24,  gold: 16,  items: [] } },
    { id: "b_wolf_pack",    name: "オオカミの群れ",       enemies: ["wolf", "wolf", "wolf"],         bgm: "battle_theme", background: "forest",  escapeAllowed: true,  rewards: { exp: 30,  gold: 15,  items: [{ item: "ポーション", amount: 1 }] } },
    { id: "b_goblin_chief", name: "ゴブリンチーフ戦",     enemies: ["goblin", "goblin_chief", "goblin"], bgm: "boss_theme", background: "forest", escapeAllowed: false, rewards: { exp: 50,  gold: 40,  items: [{ item: "ハイポーション", amount: 1 }] } },
    // 山岳エリア
    { id: "b_gargoyle",     name: "ガーゴイルの襲撃",     enemies: ["gargoyle", "gargoyle"],          bgm: "battle_theme", background: "mountain", escapeAllowed: true,  rewards: { exp: 44,  gold: 30,  items: [] } },
    { id: "b_harpy",        name: "ハーピーの巣",         enemies: ["harpy", "harpy", "harpy"],       bgm: "battle_theme", background: "mountain", escapeAllowed: true,  rewards: { exp: 54,  gold: 36,  items: [] } },
    { id: "b_golem",        name: "ロックゴーレム戦",     enemies: ["golem"],                         bgm: "boss_theme",   background: "mountain", escapeAllowed: false, rewards: { exp: 60,  gold: 40,  items: [{ item: "魔石", amount: 1 }] } },
    // 塔エリア
    { id: "b_dark_knight",  name: "ダークナイトの番人",   enemies: ["dark_knight", "dark_knight"],    bgm: "battle_theme", background: "cave",     escapeAllowed: true,  rewards: { exp: 80,  gold: 60,  items: [] } },
    { id: "b_dark_mage",    name: "ダークメイジの罠",     enemies: ["dark_mage", "dark_mage"],        bgm: "battle_theme", background: "cave",     escapeAllowed: true,  rewards: { exp: 76,  gold: 56,  items: [] } },
    // ボス
    { id: "b_boss_volg",    name: "魔将ヴォルグ",         enemies: ["dark_knight", "boss_volg", "dark_mage"], bgm: "boss_theme", background: "cave", escapeAllowed: false, rewards: { exp: 300, gold: 200, items: [{ item: "封印の鍵", amount: 1 }] } },
  ],
};

// ============================================================
// ミニゲーム
// ============================================================
export const RPG_MINIGAMES = [
  {
    id: "mg_quiz",
    type: "quiz",
    title: "冒険者検定",
    timeLimit: 30,
    questions: [
      { text: "スライムの弱点属性は？",         choices: ["火", "水", "雷", "弱点なし"], answer: 3, points: 10 },
      { text: "ゴブリンチーフの特技は？",        choices: ["鬨の声", "ガード", "咆哮", "暗黒斬"], answer: 0, points: 10 },
      { text: "封印の鍵がある場所は？",          choices: ["村長の家", "森の奥", "魔道士の塔", "山頂"], answer: 2, points: 10 },
      { text: "魔将ヴォルグの属性は？",          choices: ["火", "闇", "氷", "無"], answer: 1, points: 20 },
      { text: "勇者レイの父は何をした？",        choices: ["魔王を倒した", "魔王を封印した", "逃げた", "魔王と和解した"], answer: 1, points: 20 },
    ],
    passingScore: 40,
    onPass: { type: "jump", target: 0 },
    onFail: { type: "jump", target: 0 },
  },
  {
    id: "mg_janken",
    type: "janken",
    title: "ゴブリンとジャンケン",
    rounds: 3,
    onWin: { type: "jump", target: 0 },
    onLose: { type: "jump", target: 0 },
  },
];
