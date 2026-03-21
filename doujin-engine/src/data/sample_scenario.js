// ラノベ風サンプルシナリオ「放課後の幽霊少女」
// プレイ時間: 約10分 / 2ルート完結
//
// キャラクター:
//   yukina  — 橘 雪菜（ヒロイン / 幽霊少女）
//   saki    — 水瀬 咲希（クラスメイト / 明るい系）
//   主人公  — 一ノ瀬 蓮（語り手 / speaker: "" or "蓮"）

const SAMPLE_SCENARIO = [
  // ============================================================
  // プロローグ — 放課後の旧校舎
  // ============================================================
  { type: "label", name: "prologue" },
  { type: "bg", src: "classroom", transition: "fade", time: 1500 },
  { type: "bgm", name: "calm_afternoon" },

  { type: "nvl_on" },
  { type: "dialog", speaker: "", text: "その噂は、いつの間にか学校中に広まっていた。" },
  { type: "dialog", speaker: "", text: "『旧校舎の三階、一番奥の教室。\n　放課後に行くと、窓辺に佇む少女の姿が見える』" },
  { type: "dialog", speaker: "", text: "もちろん、僕はそんな話を信じるタイプじゃない。\nだけど——" },
  { type: "nvl_clear" },
  { type: "dialog", speaker: "", text: "まさか自分がその当事者になるとは、\nこの時はまだ思ってもいなかった。" },
  { type: "nvl_off" },

  { type: "wait", time: 500 },

  // 教室シーン — 咲希との会話
  { type: "chara", id: "saki", position: "center", expression: "smile" },
  { type: "dialog", speaker: "咲希", text: "ねーねー蓮くん、旧校舎の幽霊の話知ってる？" },
  { type: "dialog", speaker: "蓮", text: "ああ、最近やたら聞くやつだろ。窓辺に女の子がどうとかっていう。" },
  { type: "chara_mod", id: "saki", expression: "happy" },
  { type: "dialog", speaker: "咲希", text: "そうそう！ うちのクラスの田中くんが見たんだって！" },
  { type: "dialog", speaker: "蓮", text: "田中って、去年も体育倉庫で幽霊見たとか言ってたやつじゃん。" },
  { type: "chara_mod", id: "saki", expression: "neutral" },
  { type: "dialog", speaker: "咲希", text: "うっ、それはそうだけど……" },
  { type: "dialog", speaker: "咲希", text: "でもね、今回はマジっぽいの。写真まであるんだよ？" },
  { type: "dialog", speaker: "蓮", text: "写真？" },
  { type: "chara_mod", id: "saki", expression: "smile" },
  { type: "dialog", speaker: "咲希", text: "ほら、これ。" },
  { type: "dialog", speaker: "", text: "咲希がスマホの画面を見せてくる。\nそこには確かに、薄暗い教室の窓際に、白っぽい人影が映っていた。" },
  { type: "dialog", speaker: "蓮", text: "……ただの光の加減だろ。" },
  { type: "chara_mod", id: "saki", expression: "happy" },
  { type: "dialog", speaker: "咲希", text: "ほんとにぃ？ じゃあ確かめに行ってきてよ。蓮くん怖いもの知らずじゃん。" },

  { type: "choice", options: [
    { text: "仕方ないな、行ってやるよ", jump: "accept" },
    { text: "バカバカしい、帰る", jump: "refuse_then_go" },
  ]},

  // === 素直に引き受ける ===
  { type: "label", name: "accept" },
  { type: "dialog", speaker: "蓮", text: "仕方ないな。そこまで言うなら行ってやるよ。" },
  { type: "chara_mod", id: "saki", expression: "happy" },
  { type: "dialog", speaker: "咲希", text: "さっすが蓮くん！ 頼りになる〜！" },
  { type: "dialog", speaker: "蓮", text: "おだてても何も出ないぞ。" },
  { type: "dialog", speaker: "咲希", text: "あ、ちなみに私は用事あるから一緒には行けないけどね。がんばって！" },
  { type: "dialog", speaker: "蓮", text: "……おい。" },
  { type: "chara_hide", id: "saki" },
  { type: "dialog", speaker: "", text: "咲希は手を振りながら、すたこらと教室を出て行った。" },
  { type: "jump", target: "old_building" },

  // === 断るが結局行く ===
  { type: "label", name: "refuse_then_go" },
  { type: "dialog", speaker: "蓮", text: "バカバカしい。幽霊なんているわけないだろ。帰るぞ。" },
  { type: "chara_mod", id: "saki", expression: "sad" },
  { type: "dialog", speaker: "咲希", text: "えー、つまんないなぁ。" },
  { type: "chara_hide", id: "saki" },
  { type: "dialog", speaker: "", text: "そう言って教室を出た。\nだけど、廊下を歩いているうちに、どうにも気になってしまう。" },
  { type: "dialog", speaker: "蓮", text: "（……写真の人影、やけにはっきりしてたな）" },
  { type: "dialog", speaker: "蓮", text: "（ちょっと覗くだけだ。ちょっとだけ。）" },
  { type: "dialog", speaker: "", text: "気がつくと、僕の足は旧校舎へと向かっていた。" },

  // ============================================================
  // 旧校舎 — 幽霊少女との邂逅
  // ============================================================
  { type: "label", name: "old_building" },
  { type: "effect", name: "fadeout", color: "#000", time: 1000 },
  { type: "bg", src: "rooftop", transition: "none" },
  { type: "bgm", name: "mystery_theme" },
  { type: "effect", name: "fadein", time: 1000 },

  { type: "dialog", speaker: "", text: "旧校舎の三階。\n埃っぽい空気と、錆びた蛍光灯の匂いが鼻をつく。" },
  { type: "dialog", speaker: "", text: "廊下の一番奥——噂の教室の前に立つ。" },
  { type: "dialog", speaker: "蓮", text: "（さすがに雰囲気あるな……）" },
  { type: "se", name: "door_open" },
  { type: "dialog", speaker: "", text: "軋む音を立てて、引き戸を開けた。" },
  { type: "wait", time: 800 },

  { type: "dialog", speaker: "", text: "夕日が差し込む教室。\n誰もいない——はずだった。" },
  { type: "wait", time: 500 },

  { type: "chara", id: "yukina", position: "center", expression: "neutral" },
  { type: "effect", name: "flash", color: "#ffffff", time: 300 },
  { type: "se", name: "wind" },

  { type: "dialog", speaker: "", text: "——窓際に、少女が立っていた。" },
  { type: "dialog", speaker: "", text: "透き通るような白い肌。腰まで伸びた銀色の髪。\nそして、こちらを見つめる、深い藍色の瞳。" },
  { type: "dialog", speaker: "蓮", text: "……え？" },
  { type: "dialog", speaker: "？？？", text: "…………。" },
  { type: "dialog", speaker: "蓮", text: "あの、ここ立入禁止なんだけど——" },
  { type: "chara_mod", id: "yukina", expression: "sad" },
  { type: "dialog", speaker: "？？？", text: "……来てくれたんだ。" },
  { type: "dialog", speaker: "蓮", text: "は？" },
  { type: "dialog", speaker: "？？？", text: "ずっと待ってた。\n誰か、私のことが見える人を。" },
  { type: "dialog", speaker: "蓮", text: "見えるって……普通に見えてるけど。" },
  { type: "chara_mod", id: "yukina", expression: "smile" },
  { type: "dialog", speaker: "？？？", text: "うん。だからすごいの。\n今まで誰にも見えなかったから。" },

  { type: "dialog", speaker: "", text: "少女が一歩近づく。\nその足元に、影がないことに気づいた。" },
  { type: "effect", name: "shake", intensity: 3, time: 300 },

  { type: "dialog", speaker: "蓮", text: "っ——！？" },
  { type: "dialog", speaker: "蓮", text: "お、お前……まさか本当に幽霊なのか？" },
  { type: "chara_mod", id: "yukina", expression: "neutral" },
  { type: "dialog", speaker: "？？？", text: "幽霊……うん、そうなのかも。" },
  { type: "dialog", speaker: "？？？", text: "私の名前は橘雪菜。\n……だったと思う。" },
  { type: "dialog", speaker: "蓮", text: "だったと思うって……" },
  { type: "chara_mod", id: "yukina", expression: "sad" },
  { type: "dialog", speaker: "雪菜", text: "よく覚えてないの。\n自分がなぜここにいるのかも、いつからいるのかも。" },
  { type: "dialog", speaker: "雪菜", text: "ただ、ひとつだけわかることがある。" },
  { type: "chara_mod", id: "yukina", expression: "neutral" },
  { type: "dialog", speaker: "雪菜", text: "私には、やり残したことがある。\nそれを終わらせないと、ここから離れられない。" },
  { type: "dialog", speaker: "蓮", text: "やり残したこと……" },
  { type: "dialog", speaker: "雪菜", text: "お願い。私を手伝ってくれない？" },

  { type: "choice", options: [
    { text: "わかった、手伝うよ", jump: "help_yes" },
    { text: "どうして僕なんだ？", jump: "help_why" },
  ]},

  // === なぜ僕に？ ===
  { type: "label", name: "help_why" },
  { type: "dialog", speaker: "蓮", text: "待ってくれ。どうして僕なんだ？\n他にも人はいるだろ。" },
  { type: "chara_mod", id: "yukina", expression: "smile" },
  { type: "dialog", speaker: "雪菜", text: "言ったでしょ？ 私が見えるのは、あなただけ。" },
  { type: "dialog", speaker: "雪菜", text: "それに——" },
  { type: "dialog", speaker: "雪菜", text: "あなたの目、すごく優しいから。" },
  { type: "dialog", speaker: "蓮", text: "……そういうのはずるいだろ。" },

  // === 手伝う ===
  { type: "label", name: "help_yes" },
  { type: "dialog", speaker: "蓮", text: "……わかったよ。何をすればいい？" },
  { type: "chara_mod", id: "yukina", expression: "happy" },
  { type: "dialog", speaker: "雪菜", text: "ありがとう！" },
  { type: "dialog", speaker: "雪菜", text: "あのね、この教室の机の中に、\n私の大切なものが残っているはずなの。" },
  { type: "dialog", speaker: "蓮", text: "大切なもの？" },
  { type: "chara_mod", id: "yukina", expression: "neutral" },
  { type: "dialog", speaker: "雪菜", text: "手紙。\n誰かに宛てた、渡せなかった手紙。" },
  { type: "dialog", speaker: "蓮", text: "誰かに……って、誰に？" },
  { type: "chara_mod", id: "yukina", expression: "sad" },
  { type: "dialog", speaker: "雪菜", text: "それが……思い出せないの。" },

  // ============================================================
  // 探索パート — 手紙を探す
  // ============================================================
  { type: "label", name: "search" },
  { type: "dialog", speaker: "", text: "僕は教室の机を一つ一つ調べ始めた。" },
  { type: "dialog", speaker: "", text: "埃をかぶった机の引き出しを開けていく。\n使い古しのノート、乾いた修正テープ、折れた鉛筆——" },
  { type: "dialog", speaker: "蓮", text: "……これか？" },
  { type: "se", name: "item_get" },
  { type: "dialog", speaker: "", text: "窓際から三列目、前から二番目の机の奥に、\n小さな封筒が挟まっていた。" },
  { type: "dialog", speaker: "", text: "淡いピンク色の封筒。表に名前が書かれている。" },

  { type: "effect", name: "flash", color: "#ffe8e8", time: 200 },
  { type: "chara_mod", id: "yukina", expression: "neutral" },
  { type: "dialog", speaker: "蓮", text: "『一ノ瀬くんへ』——" },
  { type: "wait", time: 1000 },
  { type: "effect", name: "shake", intensity: 4, time: 400 },
  { type: "dialog", speaker: "蓮", text: "——は？ 一ノ瀬って、僕じゃないか？" },
  { type: "chara_mod", id: "yukina", expression: "happy" },
  { type: "dialog", speaker: "雪菜", text: "あ——そうだ。思い出した。" },
  { type: "dialog", speaker: "雪菜", text: "私が手紙を渡したかったのは、あなただったんだ。" },
  { type: "dialog", speaker: "蓮", text: "ちょ、ちょっと待ってくれ。僕はお前のこと知らないぞ？" },
  { type: "chara_mod", id: "yukina", expression: "smile" },
  { type: "dialog", speaker: "雪菜", text: "知らないよね。私、あなたに話しかけたことなかったから。" },
  { type: "dialog", speaker: "雪菜", text: "でも、ずっと見てたの。\n放課後にひとりで本を読んでるあなたのこと。" },
  { type: "dialog", speaker: "蓮", text: "…………。" },
  { type: "dialog", speaker: "雪菜", text: "その手紙、読んでくれる？" },

  { type: "choice", options: [
    { text: "手紙を読む", jump: "read_letter" },
    { text: "先に聞きたいことがある", jump: "ask_first" },
  ]},

  // === 先に質問する ===
  { type: "label", name: "ask_first" },
  { type: "dialog", speaker: "蓮", text: "読む前に聞かせてくれ。\nお前は……いつからここにいるんだ？" },
  { type: "chara_mod", id: "yukina", expression: "sad" },
  { type: "dialog", speaker: "雪菜", text: "わからない。\nでも、窓から見える桜の木が何度も咲いて散るのを見た。" },
  { type: "dialog", speaker: "蓮", text: "何度もって……何年も？" },
  { type: "dialog", speaker: "雪菜", text: "たぶん。\nでもね、寂しくはなかったよ。" },
  { type: "chara_mod", id: "yukina", expression: "smile" },
  { type: "dialog", speaker: "雪菜", text: "いつかきっと届くって、信じてたから。" },
  { type: "dialog", speaker: "蓮", text: "…………そうか。" },

  // === 手紙を読む ===
  { type: "label", name: "read_letter" },
  { type: "dialog", speaker: "", text: "封を切り、中の便箋を取り出す。\n丁寧な丸い文字が並んでいた。" },
  { type: "bgm_stop", fadeout: 1500 },
  { type: "wait", time: 500 },
  { type: "bgm", name: "emotional_theme" },

  { type: "nvl_on" },
  { type: "dialog", speaker: "", text: "『一ノ瀬くんへ" },
  { type: "dialog", speaker: "", text: "　突然のお手紙、ごめんなさい。\n　私はあなたの隣のクラスの橘雪菜です。" },
  { type: "dialog", speaker: "", text: "　あなたはきっと私のことを知らないと思います。\n　でも、私はずっとあなたのことを見ていました。" },
  { type: "nvl_clear" },
  { type: "dialog", speaker: "", text: "　放課後の図書室で、いつも静かに本を読んでいるあなた。\n　時々、窓の外を見つめて微笑むあなた。" },
  { type: "dialog", speaker: "", text: "　その横顔がとても綺麗で、\n　私はいつも目が離せなくなってしまうのです。" },
  { type: "dialog", speaker: "", text: "　本当は直接伝えたかった。\n　でも、勇気が出なくて。" },
  { type: "nvl_clear" },
  { type: "dialog", speaker: "", text: "　だからせめて、この手紙で伝えさせてください。" },
  { type: "dialog", speaker: "", text: "　一ノ瀬くんのことが、好きです。" },
  { type: "dialog", speaker: "", text: "　　　　　　　　　　　　　　　　橘 雪菜　』" },
  { type: "nvl_off" },

  { type: "wait", time: 1000 },

  // ============================================================
  // クライマックス — 記憶と消滅
  // ============================================================
  { type: "label", name: "climax" },
  { type: "chara_mod", id: "yukina", expression: "shy" },
  { type: "dialog", speaker: "雪菜", text: "……恥ずかしいな。改めて聞くと。" },
  { type: "dialog", speaker: "蓮", text: "橘……雪菜。" },
  { type: "dialog", speaker: "", text: "その名前を口にした瞬間、頭の奥で何かが弾けた。" },
  { type: "effect", name: "flash", color: "#ffffff", time: 500 },

  { type: "dialog", speaker: "蓮", text: "——待てよ。思い出した。" },
  { type: "dialog", speaker: "蓮", text: "橘雪菜。一年の時、隣のクラスにいた——" },
  { type: "chara_mod", id: "yukina", expression: "neutral" },
  { type: "dialog", speaker: "蓮", text: "事故に遭って、転校したって聞いた。\nいや……転校じゃなくて——" },
  { type: "chara_mod", id: "yukina", expression: "smile" },
  { type: "dialog", speaker: "雪菜", text: "うん。そういうこと。" },
  { type: "dialog", speaker: "雪菜", text: "手紙を渡す前の日の帰り道、交通事故に遭ったの。" },
  { type: "dialog", speaker: "雪菜", text: "それで——ここに残っちゃった。" },
  { type: "dialog", speaker: "蓮", text: "…………。" },

  { type: "dialog", speaker: "", text: "雪菜の体が、ほんのわずかに透け始めていた。" },
  { type: "dialog", speaker: "蓮", text: "おい、体が——" },
  { type: "chara_mod", id: "yukina", expression: "happy" },
  { type: "dialog", speaker: "雪菜", text: "あはは、やっぱりそうなるんだ。" },
  { type: "dialog", speaker: "雪菜", text: "手紙を届けたから、もうここにいる理由がなくなったんだね。" },
  { type: "dialog", speaker: "蓮", text: "待ってくれ、まだ——" },

  { type: "choice", options: [
    { text: "行くな。もっと話がしたい", jump: "ending_stay" },
    { text: "……ありがとう。手紙。", jump: "ending_accept" },
  ]},

  // ============================================================
  // エンディングA — 引き留める
  // ============================================================
  { type: "label", name: "ending_stay", recollection: true },
  { type: "dialog", speaker: "蓮", text: "行くなよ。まだ話したいことがあるんだ。" },
  { type: "dialog", speaker: "蓮", text: "お前のこと、もっと知りたい。\n好きな本とか、好きな音楽とか——" },
  { type: "chara_mod", id: "yukina", expression: "sad" },
  { type: "dialog", speaker: "雪菜", text: "蓮くん……" },
  { type: "dialog", speaker: "", text: "雪菜の瞳から、光の粒が零れ落ちた。\n涙のように見えたそれは、空気に溶けて消えていく。" },
  { type: "chara_mod", id: "yukina", expression: "smile" },
  { type: "dialog", speaker: "雪菜", text: "ありがとう。\nそう言ってもらえただけで、十分だよ。" },
  { type: "dialog", speaker: "雪菜", text: "ねぇ、一つだけお願いしてもいい？" },
  { type: "dialog", speaker: "蓮", text: "なんだよ、何でも言えよ。" },
  { type: "chara_mod", id: "yukina", expression: "happy" },
  { type: "dialog", speaker: "雪菜", text: "たまにでいいから、この教室に来て。\n窓から見える桜の木、すごく綺麗なんだ。" },
  { type: "dialog", speaker: "雪菜", text: "あなたに見てほしいな。\n私が何年もひとりで見てた景色を。" },
  { type: "dialog", speaker: "蓮", text: "……ああ。約束する。" },

  { type: "effect", name: "flash", color: "#ffffff", time: 800 },
  { type: "dialog", speaker: "雪菜", text: "よかった。" },
  { type: "dialog", speaker: "雪菜", text: "さよなら、蓮くん。\n——大好きだよ。" },

  { type: "effect", name: "whitefade", time: 1500 },
  { type: "chara_hide", id: "yukina" },
  { type: "wait", time: 1000 },

  { type: "dialog", speaker: "", text: "光が収まった時、教室には僕一人だけが残されていた。" },
  { type: "dialog", speaker: "", text: "手の中には、ピンクの封筒だけが確かに残っている。" },
  { type: "dialog", speaker: "蓮", text: "…………ばか。" },
  { type: "dialog", speaker: "蓮", text: "名前くらい、呼ばせてくれよ。" },

  { type: "jump", target: "epilogue_a" },

  // ============================================================
  // エンディングB — 受け入れる
  // ============================================================
  { type: "label", name: "ending_accept", recollection: true },
  { type: "dialog", speaker: "蓮", text: "……ありがとう。手紙、嬉しかった。" },
  { type: "dialog", speaker: "蓮", text: "正直に言うと、一年の時、隣のクラスに気になる子がいたんだ。\n髪が長くて、いつも窓の外を見てる静かな子。" },
  { type: "chara_mod", id: "yukina", expression: "shy" },
  { type: "dialog", speaker: "雪菜", text: "え——" },
  { type: "dialog", speaker: "蓮", text: "名前は知らなかった。話しかける勇気もなかった。\nそしたらいつの間にか、いなくなってた。" },
  { type: "dialog", speaker: "蓮", text: "……それがお前だったんだな、橘。" },
  { type: "chara_mod", id: "yukina", expression: "happy" },
  { type: "dialog", speaker: "雪菜", text: "——うそ。" },
  { type: "dialog", speaker: "雪菜", text: "うそ、うそ。そんなの聞いてない。" },
  { type: "dialog", speaker: "", text: "雪菜が両手で顔を覆った。\nその指の隙間から、確かに笑顔が見えた。" },
  { type: "dialog", speaker: "雪菜", text: "ずるいよ、そんなの……\n消えたくなくなっちゃうじゃん……" },
  { type: "dialog", speaker: "蓮", text: "悪い。でも、嘘は言いたくなかった。" },

  { type: "dialog", speaker: "", text: "雪菜の体がさらに薄くなっていく。\n夕日の光が、彼女の輪郭を溶かしていく。" },

  { type: "chara_mod", id: "yukina", expression: "smile" },
  { type: "dialog", speaker: "雪菜", text: "ねぇ蓮くん。来世があるなら——" },
  { type: "dialog", speaker: "雪菜", text: "今度はちゃんと話しかけるから。\n待っててね。" },
  { type: "dialog", speaker: "蓮", text: "ああ。——待ってる。" },

  { type: "effect", name: "whitefade", time: 2000 },
  { type: "chara_hide", id: "yukina" },
  { type: "wait", time: 1000 },

  { type: "dialog", speaker: "", text: "窓からの風が、空の封筒を揺らした。\n手紙は読まれ、想いは届いた。" },
  { type: "dialog", speaker: "", text: "たったそれだけのことが、\nこんなにも胸を締め付けるなんて知らなかった。" },

  { type: "jump", target: "epilogue_b" },

  // ============================================================
  // エピローグA — 約束の教室
  // ============================================================
  { type: "label", name: "epilogue_a" },
  { type: "effect", name: "fadeout", color: "#000", time: 1500 },
  { type: "bgm_stop", fadeout: 1500 },
  { type: "wait", time: 500 },
  { type: "bg", src: "school_gate", transition: "none" },
  { type: "bgm", name: "ending_theme" },
  { type: "effect", name: "fadein", time: 1500 },

  { type: "nvl_on" },
  { type: "dialog", speaker: "", text: "それから僕は、時々あの教室を訪れるようになった。" },
  { type: "dialog", speaker: "", text: "窓辺に座って、桜の木を眺める。\n春には花が咲き、夏には緑が茂り、秋には葉が色づく。" },
  { type: "dialog", speaker: "", text: "雪菜が何年もひとりで見ていた景色。\n今はそれが、少しだけわかる気がする。" },
  { type: "nvl_clear" },
  { type: "dialog", speaker: "", text: "あの日以来、教室に人影が現れることはなくなった。\n旧校舎の幽霊の噂も、やがて忘れられていった。" },
  { type: "dialog", speaker: "", text: "でも僕のポケットには、\n色褪せたピンクの封筒がいつも入っている。" },
  { type: "dialog", speaker: "", text: "読み返すたびに思う。\n——出会えてよかった、と。" },
  { type: "nvl_off" },

  { type: "jump", target: "fin" },

  // ============================================================
  // エピローグB — 再会の予感
  // ============================================================
  { type: "label", name: "epilogue_b" },
  { type: "effect", name: "fadeout", color: "#000", time: 1500 },
  { type: "bgm_stop", fadeout: 1500 },
  { type: "wait", time: 500 },
  { type: "bg", src: "school_gate", transition: "none" },
  { type: "bgm", name: "ending_theme" },
  { type: "effect", name: "fadein", time: 1500 },

  { type: "nvl_on" },
  { type: "dialog", speaker: "", text: "——三年後。大学の入学式。" },
  { type: "dialog", speaker: "", text: "桜並木の下を歩いていると、\nふいに誰かとぶつかりそうになった。" },
  { type: "nvl_off" },

  { type: "chara", id: "yukina", position: "center", expression: "smile" },
  { type: "dialog", speaker: "？？？", text: "あっ、ごめんなさい！" },
  { type: "dialog", speaker: "", text: "銀色の長い髪。深い藍色の瞳。" },
  { type: "dialog", speaker: "", text: "——見覚えのある、笑顔。" },
  { type: "dialog", speaker: "蓮", text: "…………え？" },
  { type: "dialog", speaker: "？？？", text: "あの……どうかしました？" },
  { type: "dialog", speaker: "蓮", text: "いや……その……" },

  { type: "dialog", speaker: "", text: "彼女の足元には、ちゃんと影があった。" },

  { type: "dialog", speaker: "蓮", text: "……きみ、名前は？" },
  { type: "chara_mod", id: "yukina", expression: "happy" },
  { type: "dialog", speaker: "？？？", text: "橘です。橘雪菜。" },
  { type: "dialog", speaker: "？？？", text: "初めまして……ですよね？\nなのに、なんだか懐かしい気がします。" },

  { type: "dialog", speaker: "", text: "春風が桜の花びらを舞い上げた。\nあの日と同じ、穏やかな午後だった。" },

  { type: "chara_mod", id: "yukina", expression: "smile" },
  { type: "dialog", speaker: "蓮", text: "……ああ、初めまして。一ノ瀬蓮です。" },
  { type: "dialog", speaker: "蓮", text: "よろしくな、橘さん。" },
  { type: "chara_hide", id: "yukina" },

  { type: "nvl_on" },
  { type: "dialog", speaker: "", text: "——今度はちゃんと話しかけるから。" },
  { type: "dialog", speaker: "", text: "あの日の約束を、彼女は果たしに来たのかもしれない。" },
  { type: "nvl_off" },

  // ============================================================
  // FIN
  // ============================================================
  { type: "label", name: "fin" },
  { type: "effect", name: "fadeout", color: "#000", time: 2000 },
  { type: "wait", time: 500 },
  { type: "bg", src: "classroom", transition: "none" },
  { type: "bgm_stop", fadeout: 2000 },
  { type: "effect", name: "fadein", time: 1500 },

  { type: "nvl_on" },
  { type: "dialog", speaker: "", text: "『放課後の幽霊少女』\n\n—— Fin ——" },
  { type: "dialog", speaker: "", text: "お読みいただきありがとうございました。" },
  { type: "nvl_off" },
];

export default SAMPLE_SCENARIO;
