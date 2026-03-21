import { useMemo, useState, useCallback } from "react";
import { CMD } from "../engine/constants";
import { expandScenes } from "../engine/commands";

// スクリプト内の choice / jump / label を解析し、分岐フローを可視化する
export default function FlowGraph({ script, storyScenes }) {
  // シーン参照を展開してからフロー解析
  const expandedScript = useMemo(() => expandScenes(script, storyScenes), [script, storyScenes]);

  // シーン境界マップ: 展開後のindex → シーン名
  const sceneBoundaries = useMemo(() => {
    const sceneMap = {};
    (storyScenes || []).forEach((s) => { sceneMap[s.id] = s; });
    const boundaries = []; // [{ startIndex, sceneName }]
    let idx = 0;
    for (const cmd of (script || [])) {
      if (cmd.type === CMD.SCENE) {
        const scene = sceneMap[cmd.sceneId];
        if (scene) {
          boundaries.push({ startIndex: idx, sceneName: scene.name, sceneId: cmd.sceneId });
          idx += 1 + (scene.commands?.length || 0); // label + commands
        }
      } else {
        idx += 1;
      }
    }
    return boundaries;
  }, [script, storyScenes]);

  // index → 所属シーン名
  const getSceneName = (index) => {
    for (let i = sceneBoundaries.length - 1; i >= 0; i--) {
      if (index >= sceneBoundaries[i].startIndex) return sceneBoundaries[i].sceneName;
    }
    return null;
  };

  // ノードとエッジの抽出
  const { nodes, edges } = useMemo(() => {
    const nodes = [];
    const edges = [];
    const labels = {};

    // 1pass: label を収集
    expandedScript.forEach((cmd, i) => {
      if (cmd.type === CMD.LABEL) {
        labels[cmd.name] = i;
      }
    });

    // 2pass: ノードとエッジを構築
    let blockStart = 0;
    let blockDialogCount = 0;
    let blockSpeakers = new Set();
    let currentSceneName = null;

    const flushBlock = (endIndex) => {
      if (blockDialogCount > 0 || blockStart < endIndex) {
        nodes.push({
          type: "block",
          index: blockStart,
          endIndex: endIndex - 1,
          dialogCount: blockDialogCount,
          speakers: [...blockSpeakers],
          sceneName: currentSceneName,
        });
      }
      blockDialogCount = 0;
      blockSpeakers = new Set();
    };

    expandedScript.forEach((cmd, i) => {
      // シーン境界の検出
      const sn = getSceneName(i);
      if (sn !== currentSceneName) {
        flushBlock(i);
        blockStart = i;
        currentSceneName = sn;
      }

      switch (cmd.type) {
        case CMD.LABEL:
          flushBlock(i);
          nodes.push({ type: "label", index: i, name: cmd.name, sceneName: currentSceneName });
          blockStart = i + 1;
          break;

        case CMD.CHOICE:
          flushBlock(i);
          nodes.push({ type: "choice", index: i, options: cmd.options || [], sceneName: currentSceneName });
          (cmd.options || []).forEach((opt, oi) => {
            edges.push({
              from: i,
              to: opt.jump,
              label: opt.text,
              optionIndex: oi,
            });
          });
          blockStart = i + 1;
          break;

        case CMD.JUMP: {
          flushBlock(i);
          const target = typeof cmd.target === "string" ? labels[cmd.target] : cmd.target;
          nodes.push({ type: "jump", index: i, target, sceneName: currentSceneName });
          if (target !== undefined) {
            edges.push({ from: i, to: target, label: "jump" });
          }
          blockStart = i + 1;
          break;
        }

        case CMD.DIALOG:
          blockDialogCount++;
          if (cmd.speaker) blockSpeakers.add(cmd.speaker);
          break;
      }
    });
    // 最後のブロック
    flushBlock(expandedScript.length);

    return { nodes, edges };
  }, [expandedScript, sceneBoundaries]);

  // 展開中ノードの管理
  const [expanded, setExpanded] = useState(new Set());
  const toggleExpand = useCallback((nodeIndex) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeIndex)) next.delete(nodeIndex);
      else next.add(nodeIndex);
      return next;
    });
  }, []);

  // コマンドの簡易表示
  const cmdSummary = (cmd, i) => {
    switch (cmd.type) {
      case CMD.DIALOG:   return { icon: "💬", label: cmd.speaker || "ナレーション", detail: (cmd.text || "").substring(0, 40), color: "#ccc" };
      case CMD.BG:       return { icon: "🖼", label: "背景", detail: cmd.src, color: "#81D4FA" };
      case CMD.BGM:      return { icon: "♪", label: "BGM", detail: cmd.name, color: "#CE93D8" };
      case CMD.BGM_STOP: return { icon: "♪", label: "BGM停止", detail: cmd.fadeout ? `${cmd.fadeout}ms` : "", color: "#CE93D8" };
      case CMD.SE:       return { icon: "🔊", label: "SE", detail: cmd.name, color: "#FFB74D" };
      case CMD.CHARA:    return { icon: "👤", label: "キャラ", detail: `${cmd.id} [${cmd.position}] ${cmd.expression || ""}`, color: "#80CBC4" };
      case CMD.CHARA_MOD:return { icon: "👤", label: "表情", detail: `${cmd.id} → ${cmd.expression}`, color: "#80CBC4" };
      case CMD.CHARA_HIDE:return { icon: "👤", label: "退場", detail: cmd.id, color: "#80CBC4" };
      case CMD.EFFECT:   return { icon: "✨", label: "効果", detail: cmd.name, color: "#FFAB91" };
      case CMD.WAIT:     return { icon: "⏳", label: "待機", detail: `${cmd.time || 0}ms`, color: "#B0BEC5" };
      case CMD.NVL_ON:   return { icon: "📖", label: "NVL ON", detail: "", color: "#A5D6A7" };
      case CMD.NVL_OFF:  return { icon: "📖", label: "NVL OFF", detail: "", color: "#A5D6A7" };
      case CMD.NVL_CLEAR:return { icon: "📖", label: "NVL CLR", detail: "", color: "#A5D6A7" };
      case CMD.CG:       return { icon: "🖼", label: "CG", detail: cmd.id, color: "#F48FB1" };
      default:           return { icon: "?", label: cmd.type, detail: "", color: "#888" };
    }
  };

  // ノードの色
  const nodeColor = (type) => {
    switch (type) {
      case "label":  return "#A5D6A7";
      case "choice": return "#FFF176";
      case "jump":   return "#EF5350";
      case "block":  return "#90A4AE";
      default:       return "#888";
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>フラグ遷移グラフ</span>
        <span style={styles.stats}>
          {nodes.length} ノード / {edges.length} エッジ
        </span>
      </div>

      <div style={styles.graph}>
        {nodes.map((node, ni) => {
          const isExpanded = expanded.has(node.index);
          const isClickable = node.type === "block" && node.dialogCount > 0;

          // シーン境界の検出: 前のノードと違うシーンならヘッダー表示
          const prevSceneName = ni > 0 ? nodes[ni - 1].sceneName : null;
          const showSceneHeader = node.sceneName && node.sceneName !== prevSceneName;

          return (
            <div key={ni} style={styles.nodeRow}>
              {/* シーン境界ヘッダー */}
              {showSceneHeader && (
                <div style={styles.sceneHeader}>
                  <span style={styles.sceneHeaderIcon}>■</span>
                  <span style={styles.sceneHeaderName}>{node.sceneName}</span>
                </div>
              )}
              {/* ノード */}
              <div
                onClick={isClickable ? () => toggleExpand(node.index) : undefined}
                style={{
                  ...styles.node,
                  borderColor: nodeColor(node.type) + "66",
                  background: isExpanded
                    ? nodeColor(node.type) + "22"
                    : nodeColor(node.type) + "11",
                  cursor: isClickable ? "pointer" : "default",
                }}
              >
                <span style={{ ...styles.nodeType, color: nodeColor(node.type) }}>
                  {node.type === "block" ? "BLOCK" : node.type.toUpperCase()}
                </span>
                <span style={styles.nodeIndex}>#{node.index}</span>

                {node.type === "label" && (
                  <span style={styles.nodeDetail}>🏷 {node.name}</span>
                )}
                {node.type === "block" && (
                  <span style={styles.nodeDetail}>
                    {isExpanded ? "▼" : "▶"} {node.dialogCount} 台詞
                    {node.speakers.length > 0 && ` (${node.speakers.join(", ")})`}
                    <span style={{ color: "#555", fontSize: 10, marginLeft: 6 }}>
                      #{node.index}–{node.endIndex}
                    </span>
                  </span>
                )}
                {node.type === "choice" && (
                  <div style={styles.optionList}>
                    {node.options.map((opt, oi) => (
                      <div key={oi} style={styles.optionItem}>
                        <span style={styles.optionArrow}>→ #{opt.jump}</span>
                        <span style={styles.optionText}>{opt.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {node.type === "jump" && (
                  <span style={styles.nodeDetail}>→ #{node.target ?? "?"}</span>
                )}
              </div>

              {/* 展開中のコマンド一覧 */}
              {isExpanded && node.type === "block" && (
                <div style={styles.expandedBlock}>
                  {expandedScript.slice(node.index, node.endIndex + 1).map((cmd, ci) => {
                    const s = cmdSummary(cmd, node.index + ci);
                    return (
                      <div key={ci} style={styles.expandedCmd}>
                        <span style={styles.expandedIndex}>#{node.index + ci}</span>
                        <span style={{ fontSize: 12, flexShrink: 0 }}>{s.icon}</span>
                        <span style={{ ...styles.expandedLabel, color: s.color }}>{s.label}</span>
                        <span style={styles.expandedDetail}>{s.detail}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* エッジ（この node から出るもの） */}
              {edges
                .filter((e) => e.from === node.index)
                .map((edge, ei) => (
                  <div key={ei} style={styles.edge}>
                    <span style={styles.edgeArrow}>↘</span>
                    <span style={styles.edgeTarget}>→ #{edge.to}</span>
                    <span style={styles.edgeLabel}>{edge.label}</span>
                  </div>
                ))}
            </div>
          );
        })}

        {nodes.length === 0 && (
          <div style={styles.empty}>
            分岐・ラベル・ジャンプがありません
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
  },
  stats: {
    fontSize: 11,
    color: "#666",
    fontFamily: "monospace",
  },
  graph: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px",
  },
  nodeRow: {
    marginBottom: 4,
  },
  node: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    border: "1px solid",
    borderRadius: 4,
    marginBottom: 2,
  },
  nodeType: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "monospace",
    letterSpacing: 1,
    flexShrink: 0,
  },
  nodeIndex: {
    fontSize: 10,
    color: "#666",
    fontFamily: "monospace",
    flexShrink: 0,
  },
  nodeDetail: {
    fontSize: 12,
    color: "#ccc",
  },
  optionList: {
    width: "100%",
    marginTop: 4,
  },
  optionItem: {
    display: "flex",
    gap: 8,
    fontSize: 12,
    padding: "2px 0",
  },
  optionArrow: {
    color: "#FFF176",
    fontFamily: "monospace",
    fontSize: 11,
    flexShrink: 0,
  },
  optionText: {
    color: "#ccc",
  },
  edge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 0 2px 20px",
    fontSize: 11,
  },
  edgeArrow: {
    color: "#EF5350",
  },
  edgeTarget: {
    color: "#888",
    fontFamily: "monospace",
  },
  edgeLabel: {
    color: "#666",
    fontStyle: "italic",
  },
  expandedBlock: {
    marginLeft: 16,
    marginBottom: 4,
    borderLeft: "2px solid rgba(144,164,174,0.25)",
    paddingLeft: 8,
  },
  expandedCmd: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 8px",
    fontSize: 12,
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  expandedIndex: {
    fontSize: 10,
    color: "#555",
    fontFamily: "monospace",
    width: 32,
    flexShrink: 0,
  },
  expandedLabel: {
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
    minWidth: 50,
  },
  expandedDetail: {
    fontSize: 12,
    color: "#999",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sceneHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px 4px",
    marginTop: 12,
    marginBottom: 2,
    borderTop: "1px solid rgba(100,200,100,0.15)",
  },
  sceneHeaderIcon: {
    color: "#66BB6A",
    fontSize: 8,
  },
  sceneHeaderName: {
    color: "#66BB6A",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 1,
  },
  empty: {
    color: "#555",
    fontSize: 13,
    textAlign: "center",
    marginTop: 40,
  },
};
