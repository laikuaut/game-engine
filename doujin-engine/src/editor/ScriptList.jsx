import { CMD } from "../engine/constants";
import { useState, useMemo } from "react";

// コマンドタイプ別の表示ラベルと色
const CMD_META = {
  [CMD.DIALOG]:     { label: "台詞",   color: "#8BC34A" },
  [CMD.BG]:         { label: "背景",   color: "#29B6F6" },
  [CMD.BGM]:        { label: "BGM",    color: "#CE93D8" },
  [CMD.BGM_STOP]:   { label: "BGM停",  color: "#CE93D8" },
  [CMD.SE]:         { label: "SE",     color: "#F48FB1" },
  [CMD.CHARA]:      { label: "キャラ", color: "#FFB74D" },
  [CMD.CHARA_MOD]:  { label: "表情",   color: "#FFB74D" },
  [CMD.CHARA_HIDE]: { label: "退場",   color: "#FFB74D" },
  [CMD.CHOICE]:     { label: "選択肢", color: "#FFF176" },
  [CMD.EFFECT]:     { label: "効果",   color: "#80DEEA" },
  [CMD.WAIT]:       { label: "待機",   color: "#90A4AE" },
  [CMD.JUMP]:       { label: "ジャンプ", color: "#EF5350" },
  [CMD.LABEL]:      { label: "ラベル", color: "#A5D6A7" },
  [CMD.SCENE]:      { label: "シーン", color: "#66BB6A" },
  [CMD.CG]:         { label: "CG表示", color: "#F48FB1" },
  [CMD.CG_HIDE]:    { label: "CG非表示", color: "#F48FB1" },
  [CMD.NVL_ON]:     { label: "NVL開始", color: "#A5D6A7" },
  [CMD.NVL_OFF]:    { label: "NVL終了", color: "#A5D6A7" },
  [CMD.NVL_CLEAR]:  { label: "NVLクリア", color: "#A5D6A7" },
  // イベント・フラグ・変数
  [CMD.SET_FLAG]:     { label: "フラグ設定", color: "#7E57C2" },
  [CMD.SET_VARIABLE]: { label: "変数設定", color: "#7E57C2" },
  [CMD.IF_FLAG]:      { label: "フラグ分岐", color: "#AB47BC" },
  [CMD.IF_VARIABLE]:  { label: "変数分岐", color: "#AB47BC" },
  [CMD.ADD_ITEM]:     { label: "アイテム追加", color: "#26A69A" },
  [CMD.REMOVE_ITEM]:  { label: "アイテム削除", color: "#26A69A" },
  [CMD.CHECK_ITEM]:   { label: "アイテム確認", color: "#26A69A" },
  // 拡張
  [CMD.ACTION_STAGE]: { label: "アクション", color: "#FF7043" },
};

// コマンド追加メニューのカテゴリ分類
const CMD_CATEGORIES = [
  { label: "テキスト", types: [CMD.DIALOG, CMD.CHOICE, CMD.NVL_ON, CMD.NVL_OFF, CMD.NVL_CLEAR] },
  { label: "キャラ",   types: [CMD.CHARA, CMD.CHARA_MOD, CMD.CHARA_HIDE] },
  { label: "演出",     types: [CMD.BG, CMD.EFFECT, CMD.CG, CMD.CG_HIDE, CMD.WAIT] },
  { label: "音声",     types: [CMD.BGM, CMD.BGM_STOP, CMD.SE] },
  { label: "制御",     types: [CMD.JUMP, CMD.LABEL, CMD.SCENE] },
  { label: "イベント", types: [CMD.SET_FLAG, CMD.SET_VARIABLE, CMD.IF_FLAG, CMD.IF_VARIABLE, CMD.ADD_ITEM, CMD.REMOVE_ITEM, CMD.CHECK_ITEM] },
  { label: "拡張",     types: [CMD.ACTION_STAGE] },
];

// コマンドの1行サマリー
function commandSummary(cmd) {
  switch (cmd.type) {
    case CMD.DIALOG:
      return cmd.speaker
        ? `【${cmd.speaker}】${cmd.text?.substring(0, 20) || ""}…`
        : (cmd.text?.substring(0, 28) || "") + "…";
    case CMD.BG:        return cmd.src || "(未設定)";
    case CMD.BGM:       return cmd.name || "(未設定)";
    case CMD.BGM_STOP:  return `fade: ${cmd.fadeout || 0}ms`;
    case CMD.SE:        return cmd.name || "(未設定)";
    case CMD.CHARA:     return `${cmd.id || "?"} [${cmd.position}]`;
    case CMD.CHARA_MOD: return `${cmd.id || "?"} → ${cmd.expression || "?"}`;
    case CMD.CHARA_HIDE:return cmd.id || "(未設定)";
    case CMD.CHOICE:    return `${cmd.options?.length || 0}択`;
    case CMD.EFFECT:    return cmd.name || "(未設定)";
    case CMD.WAIT:      return `${cmd.time || 0}ms`;
    case CMD.JUMP:      return `→ ${cmd.target}`;
    case CMD.LABEL:     return cmd.name || "(未設定)";
    case CMD.SCENE:     return cmd.label || cmd.sceneId || "(未設定)";
    case CMD.CG:        return (cmd.id || "(未設定)") + (cmd.variant != null ? ` #${cmd.variant}` : "");
    case CMD.SET_FLAG:    return `${cmd.key || "?"} = ${cmd.value !== false ? "ON" : "OFF"}`;
    case CMD.SET_VARIABLE:return `${cmd.key || "?"} ${cmd.operator || "="} ${cmd.value ?? 0}`;
    case CMD.IF_FLAG:     return `${cmd.key || "?"} ${cmd.operator || "=="} ${cmd.value !== false ? "ON" : "OFF"} → ${cmd.jump || "?"}`;
    case CMD.IF_VARIABLE: return `${cmd.key || "?"} ${cmd.operator || "=="} ${cmd.value ?? 0} → ${cmd.jump || "?"}`;
    case CMD.ADD_ITEM:    return `${cmd.id || "?"} +${cmd.amount || 1}`;
    case CMD.REMOVE_ITEM: return `${cmd.id || "?"} -${cmd.amount || 1}`;
    case CMD.CHECK_ITEM:  return `${cmd.id || "?"} >= ${cmd.amount || 1} → ${cmd.jump || "?"}`;
    case CMD.ACTION_STAGE:return cmd.stageId || "(未設定)";
    default:            return cmd.type;
  }
}

// シーンコマンドの子コマンド行
function SceneChildItem({ cmd, childIndex, sceneName, scriptIndex, isSelected, onSelect }) {
  const meta = CMD_META[cmd.type] || { label: cmd.type, color: "#888" };
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(scriptIndex, childIndex); }}
      style={{
        ...styles.item,
        paddingLeft: 32,
        background: isSelected ? "rgba(100,200,100,0.1)" : "rgba(255,255,255,0.015)",
        borderLeft: isSelected ? "3px solid #66BB6A" : "3px solid transparent",
      }}
    >
      <span style={{ ...styles.index, color: "#444", fontSize: 9 }}>{childIndex}</span>
      <span style={{ ...styles.badge, background: meta.color + "22", color: meta.color }}>
        {meta.label}
      </span>
      <span style={styles.summary}>{commandSummary(cmd)}</span>
    </div>
  );
}

export default function ScriptList({ script, selectedIndex, onSelect, onAdd, onRemove, onMove, onPlayFrom, onToggleDisabled, storyScenes, onSelectSceneChild, selectedSceneChild }) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [expandedScenes, setExpandedScenes] = useState(new Set());
  const [filterType, setFilterType] = useState("");

  const cmdTypes = Object.keys(CMD_META);

  // スクリプト内で実際に使われているコマンドタイプを収集
  const usedTypes = useMemo(() => {
    const types = new Set();
    (script || []).forEach((cmd) => types.add(cmd.type));
    return [...types].filter((t) => CMD_META[t]);
  }, [script]);

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

  return (
    <div style={styles.container}>
      {/* ツールバー */}
      <div style={styles.toolbar}>
        <span style={styles.toolbarLabel}>スクリプト</span>
        <div style={styles.toolbarBtns}>
          <button onClick={() => onMove(selectedIndex, -1)} style={styles.toolBtn} title="上に移動">↑</button>
          <button onClick={() => onMove(selectedIndex, 1)} style={styles.toolBtn} title="下に移動">↓</button>
          <button onClick={() => onRemove(selectedIndex)} style={styles.toolBtn} title="削除">✕</button>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{ ...styles.toolBtn, ...(showAddMenu ? styles.toolBtnActive : {}) }}
            title="追加"
          >
            ＋
          </button>
        </div>
      </div>

      {/* フィルタバー */}
      <div style={styles.filterBar}>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">全て表示</option>
          {usedTypes.map((t) => {
            const m = CMD_META[t];
            return <option key={t} value={t}>{m.label}</option>;
          })}
        </select>
        {filterType && (
          <button onClick={() => setFilterType("")} style={styles.filterClear} title="フィルタ解除">✕</button>
        )}
        {filterType && (
          <span style={styles.filterCount}>
            {script.filter((c) => c.type === filterType).length}件
          </span>
        )}
      </div>

      {/* 追加メニュー（カテゴリ分類） */}
      {showAddMenu && (
        <div style={styles.addMenu}>
          {CMD_CATEGORIES.map((cat) => (
            <div key={cat.label} style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: "#888", padding: "4px 8px", textTransform: "uppercase", letterSpacing: 1 }}>
                {cat.label}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 2, padding: "0 4px" }}>
                {cat.types.map((type) => {
                  const meta = CMD_META[type];
                  if (!meta) return null;
                  return (
                    <button
                      key={type}
                      onClick={() => { onAdd(type, selectedIndex); }}
                      style={styles.addMenuItem}
                    >
                      <span style={{ ...styles.badge, background: meta.color + "33", color: meta.color }}>
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* コマンドリスト */}
      <div style={styles.list} onClick={() => setContextMenu(null)}>
        {script.map((cmd, i) => {
          if (filterType && cmd.type !== filterType) return null;
          const meta = CMD_META[cmd.type] || { label: cmd.type, color: "#888" };
          const selected = i === selectedIndex;
          const isScene = cmd.type === CMD.SCENE;
          const scene = isScene ? sceneMap[cmd.sceneId] : null;
          const isExpanded = isScene && expandedScenes.has(cmd.sceneId);
          const childCount = scene?.commands?.length || 0;

          return (
            <div key={i}>
              {/* メイン行 */}
              <div
                onClick={() => onSelect(i)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, index: i });
                }}
                style={{
                  ...styles.item,
                  background: selected ? "rgba(200,180,140,0.1)" : "transparent",
                  borderLeft: selected ? "3px solid #E8D4B0" : "3px solid transparent",
                  opacity: cmd.disabled ? 0.35 : 1,
                  textDecoration: cmd.disabled ? "line-through" : "none",
                }}
              >
                <span style={styles.index}>{i}</span>
                {/* シーンの場合は展開ボタン */}
                {isScene && scene && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleScene(cmd.sceneId); }}
                    style={styles.expandBtn}
                    title={isExpanded ? "閉じる" : "展開"}
                  >
                    {isExpanded ? "▼" : "▶"}
                  </button>
                )}
                <span style={{ ...styles.badge, background: meta.color + "22", color: meta.color }}>
                  {meta.label}
                </span>
                <span style={styles.summary}>
                  {isScene && scene
                    ? `${scene.name} (${childCount}件)`
                    : commandSummary(cmd)}
                </span>
              </div>

              {/* シーン展開時: 子コマンド表示 */}
              {isExpanded && scene && (
                <div style={styles.sceneChildren}>
                  {scene.commands.map((childCmd, ci) => (
                    <SceneChildItem
                      key={ci}
                      cmd={childCmd}
                      childIndex={ci}
                      sceneName={scene.name}
                      scriptIndex={i}
                      isSelected={selectedSceneChild?.sceneId === cmd.sceneId && selectedSceneChild?.childIndex === ci}
                      onSelect={(si, ci2) => {
                        if (onSelectSceneChild) onSelectSceneChild(cmd.sceneId, ci2, i);
                      }}
                    />
                  ))}
                  {childCount === 0 && (
                    <div style={styles.emptyScene}>シーンにコマンドがありません</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 右クリックコンテキストメニュー */}
      {contextMenu && (
        <div
          style={{
            ...styles.contextMenu,
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onPlayFrom && (
            <button
              style={styles.contextMenuItem}
              onClick={() => { onPlayFrom(contextMenu.index); setContextMenu(null); }}
            >
              ▶ この行から再生
            </button>
          )}
          <button
            style={styles.contextMenuItem}
            onClick={() => { onSelect(contextMenu.index); setContextMenu(null); }}
          >
            編集
          </button>
          {onToggleDisabled && (
            <button
              style={styles.contextMenuItem}
              onClick={() => { onToggleDisabled(contextMenu.index); setContextMenu(null); }}
            >
              {script[contextMenu.index]?.disabled ? "有効にする" : "無効にする"}
            </button>
          )}
          <button
            style={styles.contextMenuItem}
            onClick={() => { onRemove(contextMenu.index); setContextMenu(null); }}
          >
            削除
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  toolbarLabel: {
    fontSize: 12,
    color: "#C8A870",
    letterSpacing: 1,
  },
  toolbarBtns: {
    display: "flex",
    gap: 2,
  },
  toolBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#aaa",
    width: 26,
    height: 26,
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
  },
  toolBtnActive: {
    background: "rgba(90,180,255,0.2)",
    borderColor: "rgba(90,180,255,0.4)",
    color: "#5BF",
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  filterSelect: {
    flex: 1,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#ccc",
    borderRadius: 3,
    padding: "3px 6px",
    fontSize: 11,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  filterClear: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#aaa",
    width: 22,
    height: 22,
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontFamily: "inherit",
  },
  filterCount: {
    fontSize: 10,
    color: "#888",
    flexShrink: 0,
  },
  addMenu: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.2)",
  },
  addMenuItem: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 3,
    padding: "3px 6px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  list: {
    flex: 1,
    overflowY: "auto",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px",
    cursor: "pointer",
    transition: "background 0.15s",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  index: {
    fontSize: 10,
    color: "#555",
    fontFamily: "monospace",
    width: 20,
    textAlign: "right",
    flexShrink: 0,
  },
  badge: {
    fontSize: 10,
    padding: "1px 6px",
    borderRadius: 3,
    fontWeight: 600,
    flexShrink: 0,
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: 12,
    color: "#999",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  expandBtn: {
    background: "none",
    border: "none",
    color: "#66BB6A",
    cursor: "pointer",
    fontSize: 10,
    padding: "0 2px",
    flexShrink: 0,
    fontFamily: "monospace",
  },
  sceneChildren: {
    borderLeft: "2px solid rgba(100,200,100,0.15)",
    marginLeft: 20,
    background: "rgba(100,200,100,0.02)",
    maxHeight: 300,
    overflowY: "auto",
  },
  emptyScene: {
    padding: "8px 32px",
    fontSize: 10,
    color: "#555",
  },
  contextMenu: {
    position: "fixed",
    zIndex: 1000,
    background: "#1e1e30",
    border: "1px solid rgba(200,180,140,0.3)",
    borderRadius: 4,
    padding: 4,
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    minWidth: 160,
  },
  contextMenuItem: {
    display: "block",
    width: "100%",
    background: "transparent",
    border: "none",
    color: "#ccc",
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    borderRadius: 3,
    transition: "background 0.15s",
  },
};
