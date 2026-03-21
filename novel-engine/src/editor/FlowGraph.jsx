import { useMemo } from "react";
import { CMD } from "../engine/constants";

// スクリプト内の choice / jump / label を解析し、分岐フローを可視化する
export default function FlowGraph({ script }) {
  // ノードとエッジの抽出
  const { nodes, edges } = useMemo(() => {
    const nodes = [];
    const edges = [];
    const labels = {};

    // 1pass: label を収集
    script.forEach((cmd, i) => {
      if (cmd.type === CMD.LABEL) {
        labels[cmd.name] = i;
      }
    });

    // 2pass: ノードとエッジを構築
    let blockStart = 0;
    let blockDialogCount = 0;
    let blockSpeakers = new Set();

    const flushBlock = (endIndex) => {
      if (blockDialogCount > 0 || blockStart < endIndex) {
        nodes.push({
          type: "block",
          index: blockStart,
          endIndex: endIndex - 1,
          dialogCount: blockDialogCount,
          speakers: [...blockSpeakers],
        });
      }
      blockDialogCount = 0;
      blockSpeakers = new Set();
    };

    script.forEach((cmd, i) => {
      switch (cmd.type) {
        case CMD.LABEL:
          flushBlock(i);
          nodes.push({ type: "label", index: i, name: cmd.name });
          blockStart = i + 1;
          break;

        case CMD.CHOICE:
          flushBlock(i);
          nodes.push({ type: "choice", index: i, options: cmd.options || [] });
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
          nodes.push({ type: "jump", index: i, target });
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
    flushBlock(script.length);

    return { nodes, edges };
  }, [script]);

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
        {nodes.map((node, ni) => (
          <div key={ni} style={styles.nodeRow}>
            {/* ノード */}
            <div
              style={{
                ...styles.node,
                borderColor: nodeColor(node.type) + "66",
                background: nodeColor(node.type) + "11",
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
                  {node.dialogCount} 台詞
                  {node.speakers.length > 0 && ` (${node.speakers.join(", ")})`}
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
        ))}

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
  empty: {
    color: "#555",
    fontSize: 13,
    textAlign: "center",
    marginTop: 40,
  },
};
