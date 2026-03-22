import { useState, useMemo } from "react";
import { CMD } from "../engine/constants";

// フラグ・変数・アイテムの定義管理エディタ
// スクリプト内で使われているキーを自動収集し、説明・初期値を管理する
export default function EventEditor({
  events, onUpdateEvents,
  script, storyScenes,
}) {
  const [activeTab, setActiveTab] = useState("flags"); // flags | variables | items

  // gameEvents を定義ストアとして利用: { flagDefs: {}, variableDefs: {}, itemDefs: {} }
  const defs = events?.[0] || { flagDefs: {}, variableDefs: {}, itemDefs: {} };
  const flagDefs = defs.flagDefs || {};
  const variableDefs = defs.variableDefs || {};
  const itemDefs = defs.itemDefs || {};

  const updateDefs = (updates) => {
    const updated = { ...defs, ...updates };
    onUpdateEvents([updated]);
  };

  // スクリプト（シーン展開含む）から使用中のキーを自動収集
  const allCommands = useMemo(() => {
    const cmds = [...(script || [])];
    const sceneMap = {};
    (storyScenes || []).forEach((s) => { sceneMap[s.id] = s; });
    for (const cmd of (script || [])) {
      if (cmd.type === CMD.SCENE && sceneMap[cmd.sceneId]) {
        cmds.push(...(sceneMap[cmd.sceneId].commands || []));
      }
    }
    return cmds;
  }, [script, storyScenes]);

  const usedFlags = useMemo(() => {
    const flags = new Set();
    for (const cmd of allCommands) {
      if ((cmd.type === CMD.SET_FLAG || cmd.type === CMD.IF_FLAG) && cmd.key) {
        flags.add(cmd.key);
      }
    }
    return [...flags].sort();
  }, [allCommands]);

  const usedVariables = useMemo(() => {
    const vars = new Set();
    for (const cmd of allCommands) {
      if ((cmd.type === CMD.SET_VARIABLE || cmd.type === CMD.IF_VARIABLE) && cmd.key) {
        vars.add(cmd.key);
      }
    }
    return [...vars].sort();
  }, [allCommands]);

  const usedItems = useMemo(() => {
    const items = new Set();
    for (const cmd of allCommands) {
      if ((cmd.type === CMD.ADD_ITEM || cmd.type === CMD.REMOVE_ITEM || cmd.type === CMD.CHECK_ITEM) && cmd.id) {
        items.add(cmd.id);
      }
    }
    return [...items].sort();
  }, [allCommands]);

  // 手動追加されたキー（スクリプトに未登場）
  const manualFlags = Object.keys(flagDefs).filter((k) => !usedFlags.includes(k)).sort();
  const manualVariables = Object.keys(variableDefs).filter((k) => !usedVariables.includes(k)).sort();
  const manualItems = Object.keys(itemDefs).filter((k) => !usedItems.includes(k)).sort();

  const allFlags = [...usedFlags, ...manualFlags];
  const allVariables = [...usedVariables, ...manualVariables];
  const allItems = [...usedItems, ...manualItems];

  // 定義の更新
  const updateFlagDef = (key, field, value) => {
    const updated = { ...flagDefs, [key]: { ...(flagDefs[key] || {}), [field]: value } };
    updateDefs({ flagDefs: updated });
  };
  const updateVariableDef = (key, field, value) => {
    const updated = { ...variableDefs, [key]: { ...(variableDefs[key] || {}), [field]: value } };
    updateDefs({ variableDefs: updated });
  };
  const updateItemDef = (key, field, value) => {
    const updated = { ...itemDefs, [key]: { ...(itemDefs[key] || {}), [field]: value } };
    updateDefs({ itemDefs: updated });
  };

  // 手動追加
  const [newKey, setNewKey] = useState("");
  const addManualKey = () => {
    if (!newKey.trim()) return;
    if (activeTab === "flags") updateFlagDef(newKey.trim(), "description", "");
    else if (activeTab === "variables") updateVariableDef(newKey.trim(), "description", "");
    else updateItemDef(newKey.trim(), "description", "");
    setNewKey("");
  };

  // 手動定義の削除（スクリプト使用分は削除不可）
  const removeManualKey = (key) => {
    if (activeTab === "flags") {
      const updated = { ...flagDefs };
      delete updated[key];
      updateDefs({ flagDefs: updated });
    } else if (activeTab === "variables") {
      const updated = { ...variableDefs };
      delete updated[key];
      updateDefs({ variableDefs: updated });
    } else {
      const updated = { ...itemDefs };
      delete updated[key];
      updateDefs({ itemDefs: updated });
    }
  };

  const tabs = [
    { id: "flags", label: "フラグ", count: allFlags.length },
    { id: "variables", label: "変数", count: allVariables.length },
    { id: "items", label: "アイテム", count: allItems.length },
  ];

  const currentKeys = activeTab === "flags" ? allFlags : activeTab === "variables" ? allVariables : allItems;
  const currentUsed = activeTab === "flags" ? usedFlags : activeTab === "variables" ? usedVariables : usedItems;
  const currentDefs = activeTab === "flags" ? flagDefs : activeTab === "variables" ? variableDefs : itemDefs;

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <span style={styles.title}>フラグ・変数・アイテム管理</span>
        <span style={styles.hint}>スクリプトで使用中のキーを自動収集 + 手動定義</span>
      </div>

      {/* タブ */}
      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* 一覧テーブル */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>キー名</th>
              <th style={styles.th}>説明</th>
              {activeTab === "variables" && <th style={{ ...styles.th, width: 80 }}>初期値</th>}
              {activeTab === "items" && <th style={{ ...styles.th, width: 80 }}>表示名</th>}
              <th style={{ ...styles.th, width: 60 }}>状態</th>
              <th style={{ ...styles.th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {currentKeys.map((key) => {
              const def = currentDefs[key] || {};
              const isUsed = currentUsed.includes(key);
              return (
                <tr key={key} style={styles.tr}>
                  <td style={styles.td}>
                    <code style={styles.keyCode}>{key}</code>
                  </td>
                  <td style={styles.td}>
                    <input
                      value={def.description || ""}
                      onChange={(e) => {
                        if (activeTab === "flags") updateFlagDef(key, "description", e.target.value);
                        else if (activeTab === "variables") updateVariableDef(key, "description", e.target.value);
                        else updateItemDef(key, "description", e.target.value);
                      }}
                      style={styles.input}
                      placeholder="説明を入力…"
                    />
                  </td>
                  {activeTab === "variables" && (
                    <td style={styles.td}>
                      <input
                        type="number"
                        value={def.initialValue ?? 0}
                        onChange={(e) => updateVariableDef(key, "initialValue", Number(e.target.value))}
                        style={{ ...styles.input, width: 60, textAlign: "right" }}
                      />
                    </td>
                  )}
                  {activeTab === "items" && (
                    <td style={styles.td}>
                      <input
                        value={def.displayName || ""}
                        onChange={(e) => updateItemDef(key, "displayName", e.target.value)}
                        style={{ ...styles.input, width: 70 }}
                        placeholder="名前"
                      />
                    </td>
                  )}
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      background: isUsed ? "rgba(102,187,106,0.15)" : "rgba(255,183,77,0.15)",
                      color: isUsed ? "#66BB6A" : "#FFB74D",
                    }}>
                      {isUsed ? "使用中" : "未使用"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {!isUsed && (
                      <button
                        onClick={() => removeManualKey(key)}
                        style={styles.removeBtn}
                        title="削除"
                      >
                        x
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {currentKeys.length === 0 && (
              <tr>
                <td colSpan={activeTab === "flags" ? 4 : 5} style={{ ...styles.td, textAlign: "center", color: "#555" }}>
                  {activeTab === "flags" ? "フラグ" : activeTab === "variables" ? "変数" : "アイテム"}がまだ定義されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 手動追加 */}
      <div style={styles.addRow}>
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addManualKey()}
          style={{ ...styles.input, flex: 1 }}
          placeholder={`新しい${activeTab === "flags" ? "フラグ" : activeTab === "variables" ? "変数" : "アイテム"}のキー名`}
        />
        <button onClick={addManualKey} style={styles.addBtn}>追加</button>
      </div>

      {/* 使い方ヒント */}
      <div style={styles.helpBox}>
        {activeTab === "flags" && (
          <>
            <div style={styles.helpTitle}>フラグの使い方</div>
            <div style={styles.helpText}>
              スクリプトで <code style={styles.code}>set_flag</code> でON/OFF設定、<code style={styles.code}>if_flag</code> で条件分岐に使用。
            </div>
          </>
        )}
        {activeTab === "variables" && (
          <>
            <div style={styles.helpTitle}>変数の使い方</div>
            <div style={styles.helpText}>
              スクリプトで <code style={styles.code}>set_variable</code> で数値設定（=, +=, -=, *=）、<code style={styles.code}>if_variable</code> で条件分岐（==, !=, &gt;, &lt;, &gt;=, &lt;=）に使用。
            </div>
          </>
        )}
        {activeTab === "items" && (
          <>
            <div style={styles.helpTitle}>アイテムの使い方</div>
            <div style={styles.helpText}>
              スクリプトで <code style={styles.code}>add_item</code> で追加、<code style={styles.code}>remove_item</code> で削除、<code style={styles.code}>check_item</code> で所持確認に使用。
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", padding: 16 },
  header: { marginBottom: 12 },
  title: { color: "#C8A870", fontSize: 15, letterSpacing: 2 },
  hint: { color: "#666", fontSize: 11, marginLeft: 12, fontStyle: "italic" },
  tabs: { display: "flex", gap: 4, marginBottom: 12 },
  tab: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#888", padding: "6px 16px", borderRadius: 4, fontSize: 12,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
  },
  tabActive: {
    background: "rgba(200,180,140,0.12)", borderColor: "rgba(200,180,140,0.3)", color: "#C8A870",
  },
  tableWrap: { flex: 1, overflowY: "auto", minHeight: 0 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left", color: "#888", fontSize: 10, letterSpacing: 1, padding: "6px 8px",
    borderBottom: "1px solid rgba(200,180,140,0.15)", textTransform: "uppercase",
  },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.04)" },
  td: { padding: "6px 8px", verticalAlign: "middle" },
  keyCode: {
    background: "rgba(126,87,194,0.15)", color: "#B39DDB", padding: "2px 6px",
    borderRadius: 3, fontSize: 12, fontFamily: "monospace",
  },
  input: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#E8E4DC", padding: "4px 8px", borderRadius: 3, fontSize: 12,
    fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
  },
  statusBadge: {
    padding: "2px 6px", borderRadius: 3, fontSize: 10, fontFamily: "monospace",
  },
  removeBtn: {
    background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.2)",
    color: "#EF5350", width: 20, height: 20, borderRadius: 3, fontSize: 11,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0,
  },
  addRow: { display: "flex", gap: 8, marginTop: 12, alignItems: "center" },
  addBtn: {
    background: "rgba(200,180,140,0.12)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870", padding: "6px 16px", borderRadius: 4, fontSize: 12,
    cursor: "pointer", fontFamily: "inherit",
  },
  helpBox: {
    marginTop: 12, padding: 12, background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4,
  },
  helpTitle: { color: "#888", fontSize: 11, marginBottom: 4, letterSpacing: 1 },
  helpText: { color: "#666", fontSize: 12, lineHeight: 1.6 },
  code: {
    background: "rgba(126,87,194,0.15)", color: "#B39DDB", padding: "1px 4px",
    borderRadius: 2, fontSize: 11, fontFamily: "monospace",
  },
};
