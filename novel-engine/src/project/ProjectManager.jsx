import { useState, useEffect, useRef } from "react";
import { GAME_CONTAINER_STYLE } from "../data/config";
import {
  getProjects,
  createProject,
  deleteProject,
  duplicateProject,
  exportProject,
  importProject,
  ensureDemoProject,
  GAME_TYPE_LABELS,
} from "./ProjectStore";

const BADGE_COLORS = {
  novel: { bg: "rgba(200,180,140,0.12)", text: "#C8A870", border: "rgba(200,180,140,0.3)" },
  rpg: { bg: "rgba(100,180,255,0.12)", text: "#64B4FF", border: "rgba(100,180,255,0.3)" },
  minigame: { bg: "rgba(140,220,140,0.12)", text: "#8CDC8C", border: "rgba(140,220,140,0.3)" },
};

export default function ProjectManager({ onSelectProject, onEditProject, onExit }) {
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newGameType, setNewGameType] = useState("novel");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [importError, setImportError] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const fileInputRef = useRef(null);

  // 初期化 & プロジェクト一覧読み込み
  useEffect(() => {
    (async () => {
      await ensureDemoProject();
      setProjects(await getProjects());
    })();
  }, []);

  const refresh = async () => setProjects(await getProjects());

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const project = await createProject(newName.trim(), newDesc.trim(), newGameType);
    setNewName("");
    setNewDesc("");
    setNewGameType("novel");
    setShowCreate(false);
    await refresh();
    onSelectProject(project.id);
  };

  const handleDuplicate = async (id) => {
    await duplicateProject(id);
    await refresh();
  };

  const handleDelete = async (id) => {
    await deleteProject(id);
    setConfirmDelete(null);
    await refresh();
  };

  const handleExport = async (id) => {
    const json = await exportProject(id);
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const project = projects.find((p) => p.id === id);
    a.href = url;
    a.download = `${project?.name || "project"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = await importProject(ev.target.result);
      if (result) {
        setImportError(null);
        await refresh();
      } else {
        setImportError("インポートに失敗しました。ファイル形式を確認してください。");
      }
    };
    reader.readAsText(file);
    // 同じファイルを再選択できるようにリセット
    e.target.value = "";
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgOverlay} />

      {/* 閉じるボタン（右上固定） */}
      {onExit && (
        <button onClick={onExit} style={styles.exitBtn}>
          ✕ 閉じる
        </button>
      )}

      {/* ヘッダー */}
      <div style={styles.header}>
        <h1 style={styles.title}>Doujin Engine</h1>
        <p style={styles.subtitle}>プロジェクト管理</p>
      </div>

      {/* 新規作成エリア */}
      <div style={styles.topArea}>
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
            <div style={styles.gameTypeRow}>
              <span style={styles.gameTypeLabel}>ゲーム種別:</span>
              {Object.entries(GAME_TYPE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setNewGameType(key)}
                  style={{
                    ...styles.gameTypeBtn,
                    ...(newGameType === key ? styles.gameTypeBtnActive : {}),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
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
          <div style={styles.topBtns}>
            <button onClick={() => setShowCreate(true)} style={styles.newBtn}>
              ＋ 新規プロジェクト
            </button>
            <button onClick={handleImportClick} style={styles.importBtn}>
              インポート
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleImportFile}
        />
        {importError && (
          <div style={styles.errorMsg}>{importError}</div>
        )}
      </div>

      {/* プロジェクト一覧 */}
      <div style={styles.listArea}>
        {projects.length === 0 ? (
          <p style={styles.empty}>プロジェクトがありません</p>
        ) : (
          projects.map((p) => (
            <div
              key={p.id}
              style={{
                ...styles.card,
                ...(hoveredCard === p.id ? {
                  background: "rgba(200,180,140,0.08)",
                  borderColor: "rgba(200,180,140,0.3)",
                } : {}),
              }}
              onMouseEnter={() => setHoveredCard(p.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* カード本体（クリックで選択） */}
              <div style={styles.cardMain} onClick={() => onSelectProject(p.id)}>
                <div style={styles.cardNameRow}>
                  <div style={styles.cardName}>{p.name}</div>
                  <span style={{
                    ...styles.gameTypeBadge,
                    background: BADGE_COLORS[p.gameType]?.bg || "rgba(255,255,255,0.08)",
                    color: BADGE_COLORS[p.gameType]?.text || "#aaa",
                    border: `1px solid ${BADGE_COLORS[p.gameType]?.border || "rgba(255,255,255,0.15)"}`,
                  }}>
                    {GAME_TYPE_LABELS[p.gameType] || "ノベル"}
                  </span>
                </div>
                {p.description && <div style={styles.cardDesc}>{p.description}</div>}
                <div style={styles.cardMeta}>
                  <span>{p.script?.length || 0} コマンド</span>
                  {p.maps?.length > 0 && <span>{p.maps.length} マップ</span>}
                  {p.minigames?.length > 0 && <span>{p.minigames.length} ミニゲーム</span>}
                  <span>更新: {new Date(p.updatedAt).toLocaleDateString("ja-JP")}</span>
                </div>
              </div>
              {/* カード操作ボタン */}
              <div style={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onEditProject(p.id)}
                  style={styles.editBtn}
                  title="編集"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDuplicate(p.id)}
                  style={styles.actionBtn}
                  title="複製"
                >
                  複製
                </button>
                <button
                  onClick={() => handleExport(p.id)}
                  style={styles.actionBtn}
                  title="エクスポート"
                >
                  出力
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

      {/* フッター */}
      <div style={styles.footer}>Doujin Engine v0.1.0</div>
    </div>
  );
}

const styles = {
  container: {
    ...GAME_CONTAINER_STYLE,
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
  topArea: {
    padding: "0 48px 12px",
    zIndex: 1,
    flexShrink: 0,
  },
  topBtns: {
    display: "flex",
    gap: 8,
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
  cardNameRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  cardName: {
    fontSize: 16,
    color: "#E8D4B0",
    fontWeight: 600,
    letterSpacing: 1,
  },
  gameTypeBadge: {
    fontSize: 10,
    padding: "2px 8px",
    borderRadius: 3,
    letterSpacing: 1,
    fontFamily: "monospace",
    flexShrink: 0,
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
  newBtn: {
    flex: 1,
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
  importBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#aaa",
    padding: "12px 20px",
    borderRadius: 4,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: 1,
    transition: "all 0.2s",
  },
  errorMsg: {
    color: "#EF5350",
    fontSize: 12,
    marginTop: 8,
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
  gameTypeRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  gameTypeLabel: {
    color: "#888",
    fontSize: 13,
    marginRight: 4,
  },
  gameTypeBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#888",
    padding: "6px 16px",
    borderRadius: 3,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s",
  },
  gameTypeBtnActive: {
    background: "rgba(200,180,140,0.15)",
    borderColor: "rgba(200,180,140,0.5)",
    color: "#E8D4B0",
  },
  editBtn: {
    background: "rgba(200,180,140,0.12)",
    border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870",
    padding: "3px 12px",
    borderRadius: 3,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  exitBtn: {
    position: "absolute",
    top: 16,
    right: 20,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#aaa",
    padding: "6px 16px",
    borderRadius: 3,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: 1,
    zIndex: 2,
    transition: "all 0.2s",
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
