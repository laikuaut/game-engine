import { useState } from "react";

// ゲーム実行中のフラグ / ステートを DEBUG 表示するパネル
export default function DebugPanel({ engineState, script, onJumpTo }) {
  const [expanded, setExpanded] = useState({
    state: true,
    characters: false,
    backlog: false,
    saves: false,
  });

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const st = engineState || {};

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>DEBUG</span>
        <span style={styles.indexBadge}>
          index: {st.scriptIndex ?? "—"} / {(script?.length || 0) - 1}
        </span>
      </div>

      <div style={styles.content}>
        {/* ステート概要 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggle("state")}>
            <span>{expanded.state ? "▼" : "▶"} エンジンステート</span>
          </div>
          {expanded.state && (
            <div style={styles.sectionBody}>
              <Row label="scriptIndex" value={st.scriptIndex} />
              <Row label="isTyping" value={String(st.isTyping ?? false)} />
              <Row label="currentSpeaker" value={st.currentSpeaker || "(empty)"} />
              <Row label="currentBg" value={st.currentBg || "(none)"} />
              <Row label="bgmPlaying" value={st.bgmPlaying || "(none)"} />
              <Row label="autoMode" value={String(st.autoMode ?? false)} />
              <Row label="textSpeed" value={st.textSpeed + "ms"} />
              <Row label="showChoice" value={String(st.showChoice ?? false)} />
            </div>
          )}
        </div>

        {/* キャラクター */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggle("characters")}>
            <span>{expanded.characters ? "▼" : "▶"} キャラクター ({Object.keys(st.characters || {}).length})</span>
          </div>
          {expanded.characters && (
            <div style={styles.sectionBody}>
              {Object.entries(st.characters || {}).map(([id, chara]) => (
                <Row key={id} label={id} value={`${chara.position} / ${chara.expression}`} />
              ))}
              {Object.keys(st.characters || {}).length === 0 && (
                <div style={styles.emptyRow}>表示中のキャラなし</div>
              )}
            </div>
          )}
        </div>

        {/* バックログ */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggle("backlog")}>
            <span>{expanded.backlog ? "▼" : "▶"} バックログ ({(st.backlog || []).length})</span>
          </div>
          {expanded.backlog && (
            <div style={{ ...styles.sectionBody, maxHeight: 150, overflowY: "auto" }}>
              {(st.backlog || []).map((entry, i) => (
                <div key={i} style={styles.logEntry}>
                  {entry.speaker && <span style={styles.logSpeaker}>{entry.speaker}: </span>}
                  <span style={styles.logText}>{entry.text?.substring(0, 40)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* セーブデータ */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggle("saves")}>
            <span>{expanded.saves ? "▼" : "▶"} セーブスロット</span>
          </div>
          {expanded.saves && (
            <div style={styles.sectionBody}>
              {(st.saves || []).map((save, i) => (
                <Row
                  key={i}
                  label={`slot ${i + 1}`}
                  value={save ? `${save.date} idx:${save.scriptIndex}` : "(empty)"}
                />
              ))}
            </div>
          )}
        </div>

        {/* ジャンプ操作 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span>ジャンプ</span>
          </div>
          <div style={{ ...styles.sectionBody, display: "flex", gap: 4, flexWrap: "wrap" }}>
            <JumpInput maxIndex={(script?.length || 1) - 1} onJump={onJumpTo} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={styles.rowValue}>{value ?? "—"}</span>
    </div>
  );
}

function JumpInput({ maxIndex, onJump }) {
  const [val, setVal] = useState(0);
  return (
    <>
      <input
        type="number"
        min={0}
        max={maxIndex}
        value={val}
        onChange={(e) => setVal(Number(e.target.value))}
        style={styles.jumpInput}
      />
      <button
        onClick={() => onJump && onJump(val)}
        style={styles.jumpBtn}
      >
        GO
      </button>
    </>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "rgba(0,0,0,0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    background: "rgba(239,83,80,0.08)",
    borderBottom: "1px solid rgba(239,83,80,0.2)",
    flexShrink: 0,
  },
  title: {
    fontSize: 12,
    color: "#EF5350",
    fontWeight: 700,
    fontFamily: "monospace",
    letterSpacing: 2,
  },
  indexBadge: {
    fontSize: 10,
    color: "#888",
    fontFamily: "monospace",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: 4,
  },
  section: {
    marginBottom: 2,
  },
  sectionHeader: {
    padding: "6px 10px",
    fontSize: 11,
    color: "#C8A870",
    cursor: "pointer",
    userSelect: "none",
    fontFamily: "monospace",
  },
  sectionBody: {
    padding: "0 10px 6px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "2px 0",
    fontSize: 10,
    fontFamily: "monospace",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  rowLabel: {
    color: "#888",
  },
  rowValue: {
    color: "#ccc",
    textAlign: "right",
  },
  emptyRow: {
    fontSize: 10,
    color: "#555",
    fontFamily: "monospace",
    padding: "2px 0",
  },
  logEntry: {
    fontSize: 10,
    padding: "1px 0",
    borderBottom: "1px solid rgba(255,255,255,0.02)",
  },
  logSpeaker: {
    color: "#C8A870",
  },
  logText: {
    color: "#999",
  },
  jumpInput: {
    width: 60,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#E8E4DC",
    padding: "4px 6px",
    borderRadius: 3,
    fontSize: 11,
    fontFamily: "monospace",
    outline: "none",
  },
  jumpBtn: {
    background: "rgba(239,83,80,0.15)",
    border: "1px solid rgba(239,83,80,0.3)",
    color: "#EF5350",
    padding: "4px 10px",
    borderRadius: 3,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "monospace",
    fontWeight: 700,
  },
};
