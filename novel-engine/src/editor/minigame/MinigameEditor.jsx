import { useState, useCallback } from "react";

// ミニゲームテンプレート定義
const MINIGAME_TEMPLATES = [
  {
    type: "quiz",
    label: "クイズ",
    icon: "?",
    color: "#42A5F5",
    description: "選択式クイズ。正答でスコア加算、制限時間付き。",
    defaults: {
      title: "クイズゲーム",
      timeLimit: 30,
      questions: [
        {
          text: "問題文をここに入力",
          choices: ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
          answer: 0,
          points: 10,
        },
      ],
      passingScore: 50,
      onPass: { type: "jump", target: 0 },
      onFail: { type: "jump", target: 0 },
    },
  },
  {
    type: "janken",
    label: "じゃんけん",
    icon: "✊",
    color: "#FF7043",
    description: "じゃんけん勝負。勝敗でシナリオ分岐。",
    defaults: {
      title: "じゃんけん勝負",
      rounds: 3,
      difficulty: "normal",
      onWin: { type: "jump", target: 0 },
      onLose: { type: "jump", target: 0 },
      onDraw: { type: "jump", target: 0 },
    },
  },
  {
    type: "number",
    label: "数当て",
    icon: "#",
    color: "#66BB6A",
    description: "1〜100のランダム数を当てる。ヒント付き。",
    defaults: {
      title: "数当てゲーム",
      min: 1,
      max: 100,
      maxGuesses: 7,
      onWin: { type: "jump", target: 0 },
      onLose: { type: "jump", target: 0 },
    },
  },
  {
    type: "memory",
    label: "神経衰弱",
    icon: "🃏",
    color: "#AB47BC",
    description: "カードの神経衰弱。ペア数と制限時間を設定。",
    defaults: {
      title: "神経衰弱",
      pairs: 6,
      timeLimit: 60,
      onComplete: { type: "jump", target: 0 },
    },
  },
  {
    type: "timing",
    label: "タイミング",
    icon: "⏱",
    color: "#FFA726",
    description: "タイミングよくボタンを押す。アクション系ミニゲーム。",
    defaults: {
      title: "タイミングゲーム",
      targetZone: { start: 0.4, end: 0.6 },
      speed: 2,
      rounds: 5,
      requiredSuccess: 3,
      onWin: { type: "jump", target: 0 },
      onLose: { type: "jump", target: 0 },
    },
  },
  {
    type: "slot",
    label: "スロット",
    icon: "🎰",
    color: "#EC407A",
    description: "簡易スロットマシン。リール停止でアイテム獲得。",
    defaults: {
      title: "スロット",
      reels: 3,
      symbols: ["7", "BAR", "Cherry", "Bell", "Lemon"],
      rewards: [
        { pattern: ["7", "7", "7"], reward: "jackpot", label: "大当たり！" },
        { pattern: ["BAR", "BAR", "BAR"], reward: "medium", label: "当たり！" },
      ],
      onComplete: { type: "jump", target: 0 },
    },
  },
  {
    type: "custom",
    label: "カスタム",
    icon: "⚙",
    color: "#78909C",
    description: "自由形式。独自ロジックを JavaScript で記述。",
    defaults: {
      title: "カスタムミニゲーム",
      code: "// ここにゲームロジックを記述\n// ctx.win() で勝利、ctx.lose() で敗北\n",
      onWin: { type: "jump", target: 0 },
      onLose: { type: "jump", target: 0 },
    },
  },
];

const TEMPLATE_MAP = Object.fromEntries(MINIGAME_TEMPLATES.map((t) => [t.type, t]));

export default function MinigameEditor({ minigames: initial, onUpdateMinigames }) {
  const [games, setGames] = useState(initial || []);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showNewMenu, setShowNewMenu] = useState(false);

  const currentGame = games[selectedIndex] || null;

  const update = useCallback((newGames) => {
    setGames(newGames);
    onUpdateMinigames?.(newGames);
  }, [onUpdateMinigames]);

  // 新規追加
  const addGame = (type) => {
    const tmpl = TEMPLATE_MAP[type];
    if (!tmpl) return;
    const newGame = {
      id: Date.now().toString(36),
      type: tmpl.type,
      ...JSON.parse(JSON.stringify(tmpl.defaults)),
    };
    const next = [...games, newGame];
    update(next);
    setSelectedIndex(next.length - 1);
    setShowNewMenu(false);
  };

  // 削除
  const removeGame = (index) => {
    const next = games.filter((_, i) => i !== index);
    update(next);
    setSelectedIndex(Math.max(0, selectedIndex - 1));
  };

  // 更新
  const updateGame = (index, updates) => {
    const next = [...games];
    next[index] = { ...next[index], ...updates };
    update(next);
  };

  return (
    <div style={styles.container}>
      {/* 左: ゲーム一覧 */}
      <div style={styles.sidebar}>
        <div style={styles.sideHeader}>
          <span>ミニゲーム</span>
          <button onClick={() => setShowNewMenu(!showNewMenu)} style={styles.addBtnSmall}>＋</button>
        </div>

        {/* テンプレート選択メニュー */}
        {showNewMenu && (
          <div style={styles.newMenu}>
            {MINIGAME_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.type}
                onClick={() => addGame(tmpl.type)}
                style={styles.newMenuItem}
              >
                <span style={{ ...styles.newMenuIcon, background: tmpl.color + "22", color: tmpl.color }}>
                  {tmpl.icon}
                </span>
                <div>
                  <div style={styles.newMenuLabel}>{tmpl.label}</div>
                  <div style={styles.newMenuDesc}>{tmpl.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* リスト */}
        <div style={styles.list}>
          {games.map((game, i) => {
            const tmpl = TEMPLATE_MAP[game.type];
            return (
              <div
                key={game.id || i}
                onClick={() => setSelectedIndex(i)}
                style={{
                  ...styles.listItem,
                  background: i === selectedIndex ? "rgba(200,180,140,0.12)" : "transparent",
                  borderLeft: i === selectedIndex ? "3px solid #E8D4B0" : "3px solid transparent",
                }}
              >
                <span style={{ ...styles.listIcon, color: tmpl?.color || "#888" }}>
                  {tmpl?.icon || "?"}
                </span>
                <div>
                  <div style={styles.listName}>{game.title || game.type}</div>
                  <div style={styles.listType}>{tmpl?.label || game.type}</div>
                </div>
              </div>
            );
          })}
          {games.length === 0 && !showNewMenu && (
            <div style={styles.emptyMsg}>
              「＋」からミニゲームを追加
            </div>
          )}
        </div>
      </div>

      {/* 右: 詳細編集 */}
      <div style={styles.editor}>
        {currentGame ? (
          <>
            {/* ヘッダー */}
            <div style={styles.editorHeader}>
              <span style={{ ...styles.typeBadge, background: (TEMPLATE_MAP[currentGame.type]?.color || "#888") + "22", color: TEMPLATE_MAP[currentGame.type]?.color }}>
                {TEMPLATE_MAP[currentGame.type]?.label || currentGame.type}
              </span>
              <button onClick={() => removeGame(selectedIndex)} style={styles.deleteBtn}>削除</button>
            </div>

            {/* 共通フィールド */}
            <div style={styles.form}>
              <FieldGroup label="タイトル">
                <input type="text" value={currentGame.title || ""} onChange={(e) => updateGame(selectedIndex, { title: e.target.value })} style={styles.input} />
              </FieldGroup>

              {/* タイプ別フォーム */}
              {currentGame.type === "quiz" && <QuizForm game={currentGame} onChange={(u) => updateGame(selectedIndex, u)} />}
              {currentGame.type === "janken" && <JankenForm game={currentGame} onChange={(u) => updateGame(selectedIndex, u)} />}
              {currentGame.type === "number" && <NumberForm game={currentGame} onChange={(u) => updateGame(selectedIndex, u)} />}
              {currentGame.type === "memory" && <MemoryForm game={currentGame} onChange={(u) => updateGame(selectedIndex, u)} />}
              {currentGame.type === "timing" && <TimingForm game={currentGame} onChange={(u) => updateGame(selectedIndex, u)} />}
              {currentGame.type === "slot" && <SlotForm game={currentGame} onChange={(u) => updateGame(selectedIndex, u)} />}
              {currentGame.type === "custom" && <CustomForm game={currentGame} onChange={(u) => updateGame(selectedIndex, u)} />}

              {/* RAW JSON */}
              <div style={styles.rawSection}>
                <div style={styles.rawLabel}>RAW JSON</div>
                <pre style={styles.rawPre}>{JSON.stringify(currentGame, null, 2)}</pre>
              </div>
            </div>
          </>
        ) : (
          <div style={styles.emptyEditor}>
            左のリストからミニゲームを選択、または「＋」で新規追加
          </div>
        )}
      </div>
    </div>
  );
}

// タイプ別フォーム
function QuizForm({ game, onChange }) {
  const questions = game.questions || [];
  const addQ = () => onChange({ questions: [...questions, { text: "", choices: ["", "", "", ""], answer: 0, points: 10 }] });
  const updateQ = (i, u) => { const qs = [...questions]; qs[i] = { ...qs[i], ...u }; onChange({ questions: qs }); };
  const removeQ = (i) => onChange({ questions: questions.filter((_, j) => j !== i) });

  return (
    <>
      <FieldGroup label="制限時間 (秒)">
        <input type="number" value={game.timeLimit ?? 30} onChange={(e) => onChange({ timeLimit: Number(e.target.value) })} style={{ ...styles.input, width: 100 }} />
      </FieldGroup>
      <FieldGroup label="合格スコア">
        <input type="number" value={game.passingScore ?? 50} onChange={(e) => onChange({ passingScore: Number(e.target.value) })} style={{ ...styles.input, width: 100 }} />
      </FieldGroup>
      <div style={styles.subLabel}>問題 ({questions.length})</div>
      {questions.map((q, i) => (
        <div key={i} style={styles.questionCard}>
          <div style={styles.qHeader}>
            <span style={styles.qIndex}>Q{i + 1}</span>
            <button onClick={() => removeQ(i)} style={styles.qDelBtn}>✕</button>
          </div>
          <input type="text" value={q.text} onChange={(e) => updateQ(i, { text: e.target.value })} placeholder="問題文" style={styles.input} />
          {(q.choices || []).map((c, ci) => (
            <div key={ci} style={styles.choiceRow}>
              <input type="radio" name={`q${i}ans`} checked={q.answer === ci} onChange={() => updateQ(i, { answer: ci })} style={{ accentColor: "#66BB6A" }} />
              <input type="text" value={c} onChange={(e) => { const cs = [...q.choices]; cs[ci] = e.target.value; updateQ(i, { choices: cs }); }} style={{ ...styles.input, flex: 1 }} placeholder={`選択肢 ${ci + 1}`} />
            </div>
          ))}
        </div>
      ))}
      <button onClick={addQ} style={styles.addQBtn}>＋ 問題を追加</button>
    </>
  );
}

function JankenForm({ game, onChange }) {
  return (
    <>
      <FieldGroup label="ラウンド数">
        <input type="number" value={game.rounds ?? 3} min={1} onChange={(e) => onChange({ rounds: Number(e.target.value) })} style={{ ...styles.input, width: 100 }} />
      </FieldGroup>
      <FieldGroup label="難易度">
        <select value={game.difficulty || "normal"} onChange={(e) => onChange({ difficulty: e.target.value })} style={styles.input}>
          <option value="easy">easy</option>
          <option value="normal">normal</option>
          <option value="hard">hard</option>
        </select>
      </FieldGroup>
    </>
  );
}

function NumberForm({ game, onChange }) {
  return (
    <>
      <FieldGroup label="数値範囲">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" value={game.min ?? 1} onChange={(e) => onChange({ min: Number(e.target.value) })} style={{ ...styles.input, width: 80 }} />
          <span style={{ color: "#666" }}>〜</span>
          <input type="number" value={game.max ?? 100} onChange={(e) => onChange({ max: Number(e.target.value) })} style={{ ...styles.input, width: 80 }} />
        </div>
      </FieldGroup>
      <FieldGroup label="最大回答数">
        <input type="number" value={game.maxGuesses ?? 7} min={1} onChange={(e) => onChange({ maxGuesses: Number(e.target.value) })} style={{ ...styles.input, width: 100 }} />
      </FieldGroup>
    </>
  );
}

function MemoryForm({ game, onChange }) {
  return (
    <>
      <FieldGroup label="ペア数">
        <input type="number" value={game.pairs ?? 6} min={2} max={20} onChange={(e) => onChange({ pairs: Number(e.target.value) })} style={{ ...styles.input, width: 100 }} />
      </FieldGroup>
      <FieldGroup label="制限時間 (秒)">
        <input type="number" value={game.timeLimit ?? 60} onChange={(e) => onChange({ timeLimit: Number(e.target.value) })} style={{ ...styles.input, width: 100 }} />
      </FieldGroup>
    </>
  );
}

function TimingForm({ game, onChange }) {
  return (
    <>
      <FieldGroup label="スピード">
        <input type="number" value={game.speed ?? 2} min={0.5} max={10} step={0.5} onChange={(e) => onChange({ speed: Number(e.target.value) })} style={{ ...styles.input, width: 100 }} />
      </FieldGroup>
      <FieldGroup label="ラウンド数">
        <input type="number" value={game.rounds ?? 5} min={1} onChange={(e) => onChange({ rounds: Number(e.target.value) })} style={{ ...styles.input, width: 100 }} />
      </FieldGroup>
      <FieldGroup label="必要成功数">
        <input type="number" value={game.requiredSuccess ?? 3} min={1} onChange={(e) => onChange({ requiredSuccess: Number(e.target.value) })} style={{ ...styles.input, width: 100 }} />
      </FieldGroup>
    </>
  );
}

function SlotForm({ game, onChange }) {
  return (
    <>
      <FieldGroup label="リール数">
        <input type="number" value={game.reels ?? 3} min={2} max={5} onChange={(e) => onChange({ reels: Number(e.target.value) })} style={{ ...styles.input, width: 100 }} />
      </FieldGroup>
      <FieldGroup label="シンボル (カンマ区切り)">
        <input type="text" value={(game.symbols || []).join(", ")} onChange={(e) => onChange({ symbols: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} style={styles.input} />
      </FieldGroup>
    </>
  );
}

function CustomForm({ game, onChange }) {
  return (
    <FieldGroup label="カスタムコード">
      <textarea value={game.code || ""} onChange={(e) => onChange({ code: e.target.value })} style={{ ...styles.input, minHeight: 200, fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, resize: "vertical" }} spellCheck={false} />
    </FieldGroup>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100%", overflow: "hidden" },
  sidebar: {
    width: 240, flexShrink: 0, background: "#12121f",
    borderRight: "1px solid rgba(200,180,140,0.1)",
    display: "flex", flexDirection: "column",
  },
  sideHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 12px 6px", fontSize: 12, color: "#C8A870", letterSpacing: 1, flexShrink: 0,
  },
  addBtnSmall: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#aaa", width: 24, height: 24, borderRadius: 3, cursor: "pointer", fontSize: 13,
  },
  newMenu: {
    padding: "6px 8px", background: "rgba(0,0,0,0.3)",
    borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, maxHeight: 300, overflowY: "auto",
  },
  newMenuItem: {
    display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", cursor: "pointer",
    borderRadius: 3, transition: "background 0.15s",
  },
  newMenuIcon: {
    width: 28, height: 28, borderRadius: 4, display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 14, flexShrink: 0,
  },
  newMenuLabel: { fontSize: 12, color: "#ccc" },
  newMenuDesc: { fontSize: 10, color: "#666", marginTop: 2 },
  list: { flex: 1, overflowY: "auto" },
  listItem: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px", cursor: "pointer", transition: "background 0.15s",
  },
  listIcon: { fontSize: 16, width: 24, textAlign: "center", flexShrink: 0 },
  listName: { fontSize: 12, color: "#ccc" },
  listType: { fontSize: 10, color: "#666" },
  emptyMsg: { color: "#555", fontSize: 11, padding: "12px" },
  editor: { flex: 1, overflowY: "auto", padding: 20 },
  editorHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid rgba(200,180,140,0.1)",
  },
  typeBadge: {
    padding: "3px 12px", borderRadius: 3, fontSize: 13, fontWeight: 600, letterSpacing: 1,
  },
  deleteBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", padding: "3px 10px", borderRadius: 3, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
  },
  emptyEditor: { color: "#555", fontSize: 14, textAlign: "center", marginTop: 80 },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4 },
  fieldLabel: { fontSize: 11, color: "#C8A870", letterSpacing: 0.5 },
  input: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#E8E4DC", padding: "6px 10px", borderRadius: 3, fontSize: 13,
    fontFamily: "inherit", outline: "none",
  },
  subLabel: { fontSize: 12, color: "#C8A870", marginTop: 4 },
  questionCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 4, padding: 12, display: "flex", flexDirection: "column", gap: 6,
  },
  qHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  qIndex: { fontSize: 11, color: "#5BF", fontWeight: 700, fontFamily: "monospace" },
  qDelBtn: { background: "none", border: "none", color: "#EF5350", cursor: "pointer", fontSize: 12 },
  choiceRow: { display: "flex", alignItems: "center", gap: 6 },
  addQBtn: {
    background: "transparent", border: "1px dashed rgba(200,180,140,0.2)", color: "#C8A870",
    padding: "6px", borderRadius: 3, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
  },
  rawSection: { marginTop: 20, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" },
  rawLabel: { fontSize: 10, color: "#555", fontFamily: "monospace", marginBottom: 6 },
  rawPre: {
    fontSize: 10, color: "#666", fontFamily: "monospace", background: "rgba(0,0,0,0.2)",
    padding: 10, borderRadius: 4, overflow: "auto", lineHeight: 1.5, maxHeight: 200,
  },
};
