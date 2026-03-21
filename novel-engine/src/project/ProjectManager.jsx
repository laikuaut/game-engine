import { useState, useEffect } from "react";
import {
  getProjects,
  createProject,
  deleteProject,
  duplicateProject,
  ensureDemoProject,
} from "./ProjectStore";

export default function ProjectManager({ onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  // 初期化 & プロジェクト一覧読み込み
  useEffect(() => {
    ensureDemoProject();
    setProjects(getProjects());
  }, []);

  const refresh = () => setProjects(getProjects());

  const handleCreate = () => {
    if (!newName.trim()) return;
    const project = createProject(newName.trim(), newDesc.trim());
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
    refresh();
    onSelectProject(project.id);
  };

  const handleDuplicate = (id) => {
    duplicateProject(id);
    refresh();
  };

  const handleDelete = (id) => {
    deleteProject(id);
    setConfirmDelete(null);
    refresh();
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgOverlay} />

      {/* ヘッダー */}
      <div style={styles.header}>
        <h1 style={styles.title}>Doujin Engine</h1>
        <p style={styles.subtitle}>プロジェクト管理</p>
      </div>

      {/* プロジェクト一覧 */}
      <div style={styles.listArea}>
        {projects.length === 0 ? (
          <p style={styles.empty}>プロジェクトがありません</p>
        ) : (
          projects.map((p) => (
            <div key={p.id} style={styles.card}>
              {/* カード本体（クリックで選択） */}
              <div style={styles.cardMain} onClick={() => onSelectProject(p.id)}>
                <div style={styles.cardName}>{p.name}</div>
                {p.description && <div style={styles.cardDesc}>{p.description}</div>}
                <div style={styles.cardMeta}>
                  <span>{p.script?.length || 0} コマンド</span>
                  <span>更新: {new Date(p.updatedAt).toLocaleDateString("ja-JP")}</span>
                </div>
              </div>
              {/* カード操作ボタン */}
              <div style={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleDuplicate(p.id)}
                  style={styles.actionBtn}
                  title="複製"
                >
                  複製
                </button>
                {confirmDelete === p.id ? (
                  <div style={styles.confirmRow}>
                    <button onClick={() => handleDelete(p.id)} style={styles.deleteConfirmBtn}>
                      削除する
                    </button>
                    <button onClick={() => setConfirmDelete(null)} style={styles.cancelBtn}>
                      戻る
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(p.id)}
                    style={styles.deleteBtn}
                    title="削除"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 新規作成ボタン / フォーム */}
      <div style={styles.bottomArea}>
        {showCreate ? (
          <div style={styles.createForm}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="プロジェクト名"
              style={styles.input}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="説明（任意）"
              style={styles.input}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div style={styles.formBtns}>
              <button onClick={handleCreate} style={styles.createBtn}>
                作成
              </button>
              <button onClick={() => setShowCreate(false)} style={styles.cancelFormBtn}>
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCreate(true)} style={styles.newBtn}>
            ＋ 新規プロジェクト
          </button>
        )}
      </div>

      {/* フッター */}
      <div style={styles.footer}>Doujin Engine v0.1.0</div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    maxWidth: 960,
    aspectRatio: "16/9",
    position: "relative",
    overflow: "hidden",
    borderRadius: 4,
    boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
    fontFamily: "'Noto Serif JP', 'Yu Mincho', 'HGS明朝E', serif",
    userSelect: "none",
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(170deg, #0a0a14 0%, #1a1a2e 40%, #16213e 100%)",
  },
  bgOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse at 30% 20%, rgba(200,180,140,0.06) 0%, transparent 60%)," +
      "radial-gradient(ellipse at 70% 80%, rgba(100,120,180,0.05) 0%, transparent 60%)",
    pointerEvents: "none",
  },
  header: {
    textAlign: "center",
    padding: "28px 0 16px",
    zIndex: 1,
    flexShrink: 0,
  },
  title: {
    fontSize: 32,
    color: "#E8D4B0",
    fontWeight: 600,
    letterSpacing: 4,
    margin: 0,
    textShadow: "0 2px 20px rgba(200,180,140,0.3)",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(200,180,140,0.5)",
    letterSpacing: 3,
    marginTop: 8,
  },
  listArea: {
    flex: 1,
    overflowY: "auto",
    padding: "0 48px",
    zIndex: 1,
  },
  empty: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(200,180,140,0.15)",
    borderRadius: 4,
    marginBottom: 8,
    transition: "all 0.2s",
    overflow: "hidden",
  },
  cardMain: {
    padding: "14px 20px 10px",
    cursor: "pointer",
  },
  cardName: {
    fontSize: 16,
    color: "#E8D4B0",
    fontWeight: 600,
    letterSpacing: 1,
  },
  cardDesc: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  cardMeta: {
    display: "flex",
    gap: 16,
    fontSize: 10,
    color: "#666",
    fontFamily: "monospace",
    marginTop: 8,
    letterSpacing: 0.5,
  },
  cardActions: {
    display: "flex",
    gap: 4,
    padding: "0 20px 10px",
  },
  actionBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#aaa",
    padding: "3px 12px",
    borderRadius: 3,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  deleteBtn: {
    background: "rgba(239,83,80,0.08)",
    border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350",
    padding: "3px 12px",
    borderRadius: 3,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  confirmRow: {
    display: "flex",
    gap: 4,
  },
  deleteConfirmBtn: {
    background: "rgba(239,83,80,0.2)",
    border: "1px solid rgba(239,83,80,0.5)",
    color: "#EF5350",
    padding: "3px 12px",
    borderRadius: 3,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 600,
  },
  cancelBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#aaa",
    padding: "3px 12px",
    borderRadius: 3,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  bottomArea: {
    padding: "12px 48px 16px",
    zIndex: 1,
    flexShrink: 0,
  },
  newBtn: {
    width: "100%",
    background: "transparent",
    border: "1px dashed rgba(200,180,140,0.3)",
    color: "#C8A870",
    padding: "12px",
    borderRadius: 4,
    fontSize: 14,
    cursor: "pointer",
    letterSpacing: 2,
    fontFamily: "inherit",
    transition: "all 0.2s",
  },
  createForm: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  input: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(200,180,140,0.2)",
    color: "#E8E4DC",
    padding: "10px 14px",
    borderRadius: 4,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  },
  formBtns: {
    display: "flex",
    gap: 8,
  },
  createBtn: {
    flex: 1,
    background: "rgba(200,180,140,0.15)",
    border: "1px solid rgba(200,180,140,0.4)",
    color: "#E8D4B0",
    padding: "8px",
    borderRadius: 3,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: 2,
  },
  cancelFormBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#aaa",
    padding: "8px 20px",
    borderRadius: 3,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  footer: {
    position: "absolute",
    bottom: 12,
    right: 20,
    fontSize: 10,
    color: "rgba(255,255,255,0.2)",
    fontFamily: "monospace",
    letterSpacing: 1,
  },
};
