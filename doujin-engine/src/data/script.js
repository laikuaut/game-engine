// 完成サンプルスクリプト — 全コマンドのデモ
const SCRIPT = [
  // === プロローグ ===
  { type: "label", name: "prologue", recollection: true },
  { type: "bg", src: "school_gate", transition: "fade", time: 1200 },
  { type: "bgm", name: "morning_theme" },
  { type: "nvl_on" },
  { type: "dialog", speaker: "", text: "春の日差しが降り注ぐ校門。\n桜の花びらが舞い散る中、新学期が始まろうとしていた。" },
  { type: "dialog", speaker: "", text: "僕はいつものように、少し遅刻気味に学校へ向かっていた。" },
  { type: "nvl_clear" },
  { type: "dialog", speaker: "", text: "すると——" },
  { type: "nvl_off" },

  // キャラ登場
  { type: "chara", id: "sakura", position: "center", expression: "smile" },
  { type: "se", name: "chime" },
  { type: "dialog", speaker: "桜", text: "おはよう、先輩。今日もいい天気だね。" },
  { type: "dialog", speaker: "桜", text: "ねぇ、放課後なんだけど……ちょっと話したいことがあるの。" },
  { type: "chara_mod", id: "sakura", expression: "shy" },
  { type: "dialog", speaker: "桜", text: "あ、もし迷惑じゃなければ、だけど……" },

  // === 選択肢（ラベルジャンプ） ===
  {
    type: "choice",
    options: [
      { text: "もちろん、いいよ", jump: "route_a" },
      { text: "ごめん、今日は用事がある", jump: "route_b" },
    ],
  },

  // === Route A: 屋上 ===
  { type: "label", name: "route_a", recollection: true },
  { type: "chara_mod", id: "sakura", expression: "happy" },
  { type: "effect", name: "flash", color: "#ffe0e0", time: 200 },
  { type: "dialog", speaker: "桜", text: "ほんと！？ やったぁ！" },
  { type: "dialog", speaker: "桜", text: "じゃあ、放課後に屋上で待ってるね。" },
  { type: "se", name: "chime" },
  { type: "wait", time: 800 },
  { type: "dialog", speaker: "", text: "チャイムが鳴り、桜は嬉しそうに教室へ向かった。" },

  // 場面転換デモ（各トランジション）
  { type: "effect", name: "fadeout", color: "#000", time: 800 },
  { type: "chara_hide", id: "sakura" },
  { type: "bg", src: "classroom", transition: "none" },
  { type: "effect", name: "fadein", time: 800 },
  { type: "dialog", speaker: "", text: "——放課後。" },

  { type: "bg", src: "rooftop", transition: "crossfade", time: 1500 },
  { type: "wait", time: 500 },
  { type: "chara", id: "sakura", position: "center", expression: "smile" },
  { type: "dialog", speaker: "桜", text: "来てくれたんだ……ありがとう。" },
  { type: "chara_mod", id: "sakura", expression: "shy" },
  { type: "dialog", speaker: "桜", text: "あのね、実は……" },
  { type: "effect", name: "shake", intensity: 3, time: 400 },
  { type: "dialog", speaker: "桜", text: "……先輩のことが、好きです。" },
  { type: "wait", time: 1500 },
  { type: "dialog", speaker: "", text: "夕日に照らされた桜の頬が、赤く染まっていた。" },
  { type: "jump", target: "ending" },

  // === Route B: 別れ ===
  { type: "label", name: "route_b", recollection: true },
  { type: "chara_mod", id: "sakura", expression: "sad" },
  { type: "effect", name: "shake", intensity: 4, time: 300 },
  { type: "dialog", speaker: "桜", text: "そっか……そうだよね、忙しいもんね。" },
  { type: "dialog", speaker: "桜", text: "ううん、気にしないで。また今度でいいから。" },
  { type: "wait", time: 500 },
  { type: "dialog", speaker: "", text: "桜は寂しそうに微笑んで、教室へ戻っていった。" },
  { type: "chara_hide", id: "sakura" },
  { type: "wait", time: 800 },
  { type: "dialog", speaker: "", text: "……なぜだろう。少しだけ、胸が痛んだ。" },

  // === エンディング ===
  { type: "label", name: "ending" },
  { type: "effect", name: "fadeout", color: "#000", time: 1500 },
  { type: "bgm_stop" },
  { type: "chara_hide", id: "sakura" },
  { type: "bg", src: "school_gate", transition: "none" },
  { type: "effect", name: "fadein", time: 1500 },

  // NVL モードでエンディングテキスト
  { type: "nvl_on" },
  { type: "dialog", speaker: "", text: "ーー 第1章 終わり ーー" },
  { type: "dialog", speaker: "", text: "あの日の選択が、僕たちの未来を変えた。" },
  { type: "dialog", speaker: "", text: "でも、それはまた別の物語——。" },
  { type: "nvl_off" },

  // エフェクトデモ
  { type: "effect", name: "whitefade", time: 1000 },
  {
    type: "dialog",
    speaker: "",
    text: "【デモ完了】\n\n使用した全コマンド:\n・dialog / choice（ラベルジャンプ）\n・bg（fade / crossfade / none）\n・chara / chara_mod / chara_hide\n・bgm / bgm_stop / se\n・effect（shake / flash / fadeout / fadein / whitefade）\n・wait（クリックスキップ可）\n・jump / label（recollection 付き）\n・nvl_on / nvl_off / nvl_clear",
  },
];

export default SCRIPT;
