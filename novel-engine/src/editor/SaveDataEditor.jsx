import { useState, useEffect } from "react";
import { getProject, updateProject } from "../project/ProjectStore";

// プロジェクトのセーブデータを直接編集するエディタ
export default function SaveDataEditor({ projectId }) {
  const [saves, setSaves] = useState([null, null, null]);
  const [editSlot, setEditSlot] = useState(null);
  const [editJson, setEditJson] = useState("");
  const [error, setError] = useState(null);

  // 読み込み
  useEffect(() => {
    if (!projectId) return;
    const project = getProject(projectId);
    if (project) setSaves(project.saves || [null, null, null]);
  }, [projectId]);

  // JSON 編集開始
  const startEdit = (slot) => {
    setEditSlot(slot);
    setEditJson(saves[slot] ? JSON.stringify(saves[slot], null, 2) : "null");
    setError(null);
  };

  // 保存
  const saveEdit = () => {
    try {
      const parsed = JSON.parse(editJson);
      const newSaves = [...saves];
      newSaves[editSlot] = parsed;
      setSaves(newSaves);
      if (projectId) {
        updateProject(projectId, { saves: newSaves });
      }
      setEditSlot(null);
      setError(null);
    } catch (e) {
      setError("JSON パースエラー: " + e.message);
    }
  };

  // スロット削除
  const clearSlot = (slot) => {
    const newSaves = [...saves];
    newSaves[slot] = null;
    setSaves(newSaves);
    if (projectId) {
      updateProject(projectId, { saves: newSaves });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>セーブデータエディット</span>
        {projectId && <span style={styles.projId}>project: {projectId}</span>}
      </div>

      <div style={styles.content}>
        {saves.map((save, i) => (
          <div key={i} style={styles.slot}>
            <div style={styles.slotHeader}>
              <span style={styles.slotName}>スロット {i + 1}</span>
              <div style={styles.slotActions}>
                <button onClick={() => startEdit(i)} style={styles.editBtn}>
                  編集
                </button>
                {save && (
                  <button onClick={() => clearSlot(i)} style={styles.clearBtn}>
                    クリア
                  </button>
                )}
              </div>
            </div>
            {save ? (
              <div style={styles.slotBody}>
                <Row label="scriptIndex" value={save.scriptIndex} />
                <Row label="currentBg" value={save.currentBg} />
                <Row label="speaker" value={save.speaker || "(empty)"} />
                <Row label="text" value={save.text?.substring(0, 40) + "…"} />
                <Row label="bgmPlaying" value={save.bgmPlaying || "(none)"} />
                <Row label="characters" value={Object.keys(save.characters || {}).join(", ") || "(none)"} />
                <Row label="backlog" value={`${(save.backlog || []).length} entries`} />
                <Row label="date" value={save.date} />
              </div>
            ) : (
              <div style={styles.emptySlot}>— Empty —</div>
            )}
          </div>
        ))}

        {/* JSON 編集モーダル */}
        {editSlot !== null && (
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>スロット {editSlot + 1} — JSON 編集</span>
              <button onClick={() => setEditSlot(null)} style={styles.closeBtn}>✕</button>
            </div>
            {error && <div style={styles.error}>{error}</div>}
            <textarea
              value={editJson}
              onChange={(e) => setEditJson(e.target.value)}
              style={styles.jsonEditor}
              spellCheck={false}
            />
            <div style={styles.modalActions}>
              <button onClick={saveEdit} style={styles.saveBtn}>保存</button>
              <button onClick={() => setEditSlot(null)} style={styles.cancelBtn}>キャンセル</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={rowStyles.row}>
      <span style={rowStyles.label}>{label}</span>
      <span style={rowStyles.value}>{value ?? "—"}</span>
    </div>
  );
}

const rowStyles = {
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "2px 0",
    fontSize: 11,
    fontFamily: "monospace",
  },
  label: { color: "#888" },
  value: { color: "#ccc", textAlign: "right", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 16px",
    borderBottom: "1px solid rgba(200,180,140,0.1)",
    flexShrink: 0,
  },
  title: {
    fontSize: 13,
    color: "#C8A870",
    letterSpacing: 1,
  },
  projId: {
    fontSize: 10,
    color: "#555",
    fontFamily: "monospace",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px",
    position: "relative",
  },
  slot: {
    marginBottom: 12,
    border: "1px solid rgba(200,180,140,0.15)",
    borderRadius: 4,
    overflow: "hidden",
  },
  slotHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    background: "rgba(200,180,140,0.06)",
  },
  slotName: {
    fontSize: 13,
    color: "#E8D4B0",
    fontWeight: 600,
  },
  slotActions: {
    display: "flex",
    gap: 4,
  },
  editBtn: {
    background: "rgba(90,180,255,0.1)",
    border: "1px solid rgba(90,180,255,0.3)",
    color: "#5BF",
    padding: "2px 10px",
    borderRadius: 3,
    fontSize: 10,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  clearBtn: {
    background: "rgba(239,83,80,0.08)",
    border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350",
    padding: "2px 10px",
    borderRadius: 3,
    fontSize: 10,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  slotBody: {
    padding: "8px 12px",
  },
  emptySlot: {
    padding: "12px",
    color: "#555",
    fontSize: 12,
    textAlign: "center",
  },
  modal: {
    position: "absolute",
    inset: 0,
    background: "rgba(10,10,20,0.98)",
    display: "flex",
    flexDirection: "column",
    padding: 16,
    zIndex: 10,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 13,
    color: "#E8D4B0",
  },
  closeBtn: {
    background: "none",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#aaa",
    width: 24,
    height: 24,
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 12,
  },
  error: {
    background: "rgba(239,83,80,0.15)",
    border: "1px solid rgba(239,83,80,0.3)",
    color: "#EF5350",
    padding: "6px 10px",
    borderRadius: 3,
    fontSize: 11,
    marginBottom: 8,
  },
  jsonEditor: {
    flex: 1,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#E8E4DC",
    padding: 12,
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "monospace",
    outline: "none",
    lineHeight: 1.6,
    resize: "none",
  },
  modalActions: {
    display: "flex",
    gap: 8,
    marginTop: 8,
  },
  saveBtn: {
    flex: 1,
    background: "rgba(200,180,140,0.15)",
    border: "1px solid rgba(200,180,140,0.4)",
    color: "#E8D4B0",
    padding: "8px",
    borderRadius: 3,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  cancelBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#aaa",
    padding: "8px 20px",
    borderRadius: 3,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};
