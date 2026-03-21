import { useState, useMemo } from "react";
import { CMD } from "../engine/constants";

// コマンドタイプ別のバッジ色
const CMD_COLORS = {
  [CMD.BG]: "#29B6F6",
  [CMD.BGM]: "#CE93D8",
  [CMD.SE]: "#F48FB1",
  [CMD.CHARA]: "#FFB74D",
  [CMD.CHARA_MOD]: "#FFB74D",
  [CMD.CHARA_HIDE]: "#FFB74D",
  [CMD.CHOICE]: "#FFF176",
  [CMD.EFFECT]: "#80DEEA",
  [CMD.WAIT]: "#90A4AE",
  [CMD.JUMP]: "#EF5350",
  [CMD.LABEL]: "#A5D6A7",
  [CMD.SCENE]: "#66BB6A",
};

// コマンドの簡易表示
function cmdBrief(cmd) {
  switch (cmd.type) {
    case CMD.BG: return `背景: ${cmd.src || "?"}`;
    case CMD.BGM: return `BGM: ${cmd.name || "?"}`;
    case CMD.SE: return `SE: ${cmd.name || "?"}`;
    case CMD.CHARA: return `${cmd.id || "?"} 登場 [${cmd.position}]`;
    case CMD.CHARA_MOD: return `${cmd.id || "?"} → ${cmd.expression || "?"}`;
    case CMD.CHARA_HIDE: return `${cmd.id || "?"} 退場`;
    case CMD.CHOICE: return `選択肢 (${cmd.options?.length || 0}択)`;
    case CMD.EFFECT: return `効果: ${cmd.name || "?"}`;
    case CMD.WAIT: return `待機 ${cmd.time || 0}ms`;
    case CMD.JUMP: return `→ ${cmd.target}`;
    case CMD.LABEL: return `[${cmd.name || "?"}]`;
    case CMD.SCENE: return `シーン: ${cmd.sceneId || "?"}`;
    default: return cmd.type;
  }
}

// シナリオ内のテキスト編集ビュー（構造コンテキスト付き）
export default function TextEditor({ script, onUpdateScript, storyScenes, onUpdateStoryScenes }) {
  const [filter, setFilter] = useState("");
  const [showStructure, setShowStructure] = useState(true);
  const [expandedScenes, setExpandedScenes] = useState(new Set());

  // シーンID → シーンデータのマップ
  const sceneMap = useMemo(() => {
    const map = {};
    (storyScenes || []).forEach((s) => { map[s.id] = s; });
    return map;
  }, [storyScenes]);

  const toggleScene = (sceneId) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) next.delete(sceneId);
      else next.add(sceneId);
      return next;
    });
  };

  // dialog コマンドだけ抽出（元の index 付き）
  const dialogs = useMemo(() => {
    return script
      .map((cmd, i) => ({ cmd, index: i }))
      .filter(({ cmd }) => cmd.type === CMD.DIALOG);
  }, [script]);

  // シーン内のdialogカウント
  const sceneDialogCount = useMemo(() => {
    const counts = {};
    (storyScenes || []).forEach((s) => {
      counts[s.id] = (s.commands || []).filter((c) => c.type === CMD.DIALOG).length;
    });
    return counts;
  }, [storyScenes]);

  // 全dialogカウント（スクリプト + シーン内）
  const totalDialogs = useMemo(() => {
    let count = dialogs.length;
    (storyScenes || []).forEach((s) => {
      count += (s.commands || []).filter((c) => c.type === CMD.DIALOG).length;
    });
    return count;
  }, [dialogs, storyScenes]);

  // 構造表示用の統合アイテム
  const structuredItems = useMemo(() => {
    if (!showStructure) return null;
    const items = [];
    script.forEach((cmd, i) => {
      items.push({ cmd, index: i, isDialog: cmd.type === CMD.DIALOG, source: "script" });

      // シーンコマンドが展開中なら、シーン内のコマンドも追加
      if (cmd.type === CMD.SCENE && expandedScenes.has(cmd.sceneId)) {
        const scene = sceneMap[cmd.sceneId];
        if (scene) {
          (scene.commands || []).forEach((childCmd, ci) => {
            items.push({
              cmd: childCmd,
              index: ci,
              isDialog: childCmd.type === CMD.DIALOG,
              source: "scene",
              sceneId: cmd.sceneId,
              sceneName: scene.name,
              scriptIndex: i,
            });
          });
        }
      }
    });
    return items;
  }, [script, showStructure, expandedScenes, sceneMap]);

  // フィルター適用
  const filtered = useMemo(() => {
    const items = showStructure ? structuredItems : dialogs.map((d) => ({ ...d, isDialog: true, source: "script" }));
    if (!filter) return items;
    const q = filter.toLowerCase();
    return items.filter(({ cmd, isDialog }) => {
      if (!isDialog) return false;
      return (
        (cmd.speaker || "").toLowerCase().includes(q) ||
        (cmd.text || "").toLowerCase().includes(q)
      );
    });
  }, [dialogs, structuredItems, filter, showStructure]);

  // スクリプトのフィールド更新
  const updateField = (scriptIndex, field, value) => {
    const newScript = [...script];
    newScript[scriptIndex] = { ...newScript[scriptIndex], [field]: value };
    onUpdateScript(newScript);
  };

  // シーン内コマンドのフィールド更新
  const updateSceneField = (sceneId, cmdIndex, field, value) => {
    if (!onUpdateStoryScenes) return;
    const newScenes = storyScenes.map((s) => {
      if (s.id !== sceneId) return s;
      const newCmds = [...s.commands];
      newCmds[cmdIndex] = { ...newCmds[cmdIndex], [field]: value };
      return { ...s, commands: newCmds };
    });
    onUpdateStoryScenes(newScenes);
  };

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <span style={styles.title}>テキスト編集</span>
        <span style={styles.count}>
          {totalDialogs} 件
        </span>
        <button
          onClick={() => setShowStructure(!showStructure)}
          style={{
            ...styles.toggleBtn,
            ...(showStructure ? styles.toggleBtnActive : {}),
          }}
          title="構造表示の切替"
        >
          構造
        </button>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="話者 / テキストで検索..."
          style={styles.search}
        />
      </div>

      {/* テキストリスト */}
      <div style={styles.list}>
        {filtered.map((item, fi) => {
          const { cmd, index, isDialog, source, sceneId, sceneName } = item;
          const isScene = source === "scene";

          // シーンコマンド行（展開トグル付き）
          if (!isDialog && cmd.type === CMD.SCENE) {
            const scene = sceneMap[cmd.sceneId];
            const isExpanded = expandedScenes.has(cmd.sceneId);
            const childDialogs = sceneDialogCount[cmd.sceneId] || 0;
            return (
              <div
                key={`scene-${index}`}
                onClick={() => scene && toggleScene(cmd.sceneId)}
                style={{
                  ...styles.sceneRow,
                  cursor: scene ? "pointer" : "default",
                }}
              >
                <span style={styles.rowIndex}>#{index}</span>
                {scene && (
                  <span style={styles.expandBtn}>{isExpanded ? "▼" : "▶"}</span>
                )}
                <span style={styles.sceneBadge}>
                  {scene ? scene.name : cmd.sceneId || "?"}
                </span>
                <span style={styles.sceneCount}>
                  {childDialogs} 台詞
                </span>
              </div>
            );
          }

          // 構造コマンド（非dialog）
          if (!isDialog) {
            const color = CMD_COLORS[cmd.type] || "#888";
            return (
              <div
                key={`s-${source}-${sceneId || ""}-${index}-${fi}`}
                style={{
                  ...styles.structureRow,
                  ...(isScene ? styles.sceneChildStructure : {}),
                }}
              >
                <span style={styles.rowIndex}>
                  {isScene ? `  ${index}` : `#${index}`}
                </span>
                <span style={{ ...styles.structureBadge, background: color + "22", color }}>
                  {cmdBrief(cmd)}
                </span>
              </div>
            );
          }

          // dialog行
          return (
            <div
              key={`d-${source}-${sceneId || ""}-${index}-${fi}`}
              style={{
                ...styles.row,
                ...(isScene ? styles.sceneChildRow : {}),
              }}
            >
              <div style={styles.rowHeader}>
                <span style={styles.rowIndex}>
                  {isScene ? `  ${index}` : `#${index}`}
                </span>
                {isScene && (
                  <span style={styles.sceneTag}>{sceneName}</span>
                )}
                <input
                  type="text"
                  value={cmd.speaker || ""}
                  onChange={(e) =>
                    isScene
                      ? updateSceneField(sceneId, index, "speaker", e.target.value)
                      : updateField(index, "speaker", e.target.value)
                  }
                  placeholder="話者（空欄でナレーション）"
                  style={styles.speakerInput}
                />
              </div>
              <textarea
                value={cmd.text || ""}
                onChange={(e) =>
                  isScene
                    ? updateSceneField(sceneId, index, "text", e.target.value)
                    : updateField(index, "text", e.target.value)
                }
                placeholder="セリフを入力..."
                style={styles.textArea}
                rows={Math.max(2, (cmd.text || "").split("\n").length)}
              />
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={styles.empty}>
            {filter ? "一致するテキストがありません" : "dialog コマンドがありません"}
          </div>
        )}
      </div>
    </div>
  );
}

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
    flexShrink: 0,
  },
  count: {
    fontSize: 11,
    color: "#666",
    fontFamily: "monospace",
    flexShrink: 0,
  },
  search: {
    flex: 1,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#E8E4DC",
    padding: "5px 10px",
    borderRadius: 3,
    fontSize: 12,
    fontFamily: "inherit",
    outline: "none",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 16px",
  },
  row: {
    marginBottom: 12,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 4,
  },
  sceneChildRow: {
    marginLeft: 20,
    borderLeftWidth: 3,
    borderLeftStyle: "solid",
    borderLeftColor: "rgba(100,200,100,0.2)",
    background: "rgba(100,200,100,0.02)",
  },
  rowHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  rowIndex: {
    fontSize: 10,
    color: "#555",
    fontFamily: "monospace",
    width: 30,
    flexShrink: 0,
  },
  speakerInput: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(200,180,140,0.15)",
    color: "#E8D4B0",
    padding: "4px 8px",
    borderRadius: 3,
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    width: 140,
  },
  textArea: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#E8E4DC",
    padding: "8px 10px",
    borderRadius: 3,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    lineHeight: 1.8,
    resize: "vertical",
    boxSizing: "border-box",
  },
  empty: {
    color: "#555",
    fontSize: 13,
    textAlign: "center",
    marginTop: 40,
  },
  toggleBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#888",
    padding: "3px 10px",
    borderRadius: 3,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  },
  toggleBtnActive: {
    background: "rgba(200,180,140,0.15)",
    borderColor: "rgba(200,180,140,0.3)",
    color: "#E8D4B0",
  },
  structureRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 14px",
    borderLeft: "3px solid rgba(255,255,255,0.06)",
    marginBottom: 2,
  },
  sceneChildStructure: {
    marginLeft: 20,
    borderLeftColor: "rgba(100,200,100,0.15)",
  },
  structureBadge: {
    fontSize: 10,
    padding: "1px 8px",
    borderRadius: 3,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  sceneRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    marginBottom: 4,
    background: "rgba(100,200,100,0.05)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(100,200,100,0.15)",
    borderRadius: 4,
  },
  expandBtn: {
    color: "#66BB6A",
    fontSize: 10,
    flexShrink: 0,
    fontFamily: "monospace",
  },
  sceneBadge: {
    fontSize: 12,
    color: "#66BB6A",
    fontWeight: 600,
  },
  sceneCount: {
    fontSize: 10,
    color: "#888",
    marginLeft: "auto",
  },
  sceneTag: {
    fontSize: 9,
    color: "#66BB6A",
    background: "rgba(100,200,100,0.1)",
    padding: "1px 6px",
    borderRadius: 2,
    flexShrink: 0,
  },
};
