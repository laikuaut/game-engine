// シナリオデータ
const SCRIPT = [
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
  // Route A (index 7)
  { type: "chara_mod", id: "sakura", expression: "happy" },
  { type: "dialog", speaker: "桜", text: "ほんと！？ やったぁ！" },
  { type: "dialog", speaker: "桜", text: "じゃあ、放課後に屋上で待ってるね。" },
  { type: "se", name: "chime" },
  { type: "dialog", speaker: "", text: "チャイムが鳴り、桜は嬉しそうに教室へ向かった。" },
  // Route B (index 12)
  { type: "chara_mod", id: "sakura", expression: "sad" },
  { type: "dialog", speaker: "桜", text: "そっか……そうだよね、忙しいもんね。" },
  { type: "dialog", speaker: "桜", text: "ううん、気にしないで。また今度でいいから。" },
  { type: "dialog", speaker: "", text: "桜は寂しそうに微笑んで、教室へ戻っていった。" },
  // Common
  { type: "bg", src: "classroom", transition: "fade" },
  { type: "dialog", speaker: "", text: "ーー 第1章 終わり ーー" },
  {
    type: "dialog",
    speaker: "",
    text: "【デモ終了】\nこのエンジンの機能:\n・テキスト送り（クリック/Enter/Space）\n・オート再生\n・バックログ\n・セーブ＆ロード（3スロット）\n・選択肢分岐\n・テキスト速度調整\n・キャラ表示・表情切替\n・背景切替\n・BGM/SE表示",
  },
];

export default SCRIPT;
