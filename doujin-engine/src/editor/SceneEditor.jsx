import { useState, useCallback, useMemo } from "react";
import { CMD } from "../engine/constants";
import ScriptList from "./ScriptList";
import CommandEditor from "./CommandEditor";

// シーン（スクリプト部品）を管理するエディタ
// scenes: [{ id, name, description, commands: [...] }]
// sceneOrder: [sceneId, ...]（再生順）

export default function SceneEditor({
  scenes, onUpdateScenes,
  sceneOrder, onUpdateSceneOrder,
  script, onUpdateScript,
  characters,
}) {
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);
  const [newSceneName, setNewSceneName] = useState("");
  const [dragIdx, setDragIdx] = useState(null);

  const allScenes = scenes || [];
  const order = sceneOrder || [];
  const currentScene = allScenes.find((s) => s.id === selectedSceneId);

  // シーン追加
  const addScene = useCallback(() => {
    const name = newSceneName.trim() || `シーン ${allScenes.length + 1}`;
    const id = `scene_${Date.now().toString(36)}`;
    const scene = {
      id,
      name,
      description: "",
      commands: [
        { type: CMD.DIALOG, speaker: "", text: "ここにテキストを入力…" },
      ],
    };
    onUpdateScenes([...allScenes, scene]);
    onUpdateSceneOrder([...order, id]);
    setSelectedSceneId(id);
    setNewSceneName("");
  }, [allScenes, order, newSceneName, onUpdateScenes, onUpdateSceneOrder]);

  // 既存スクリプトからシーンを自動生成（labelで分割）
  const importFromScript = useCallback(() => {
    if (!script || script.length === 0) return;
    const newScenes = [];
    let current = { commands: [] };
    let sceneName = "オープニング";

    for (const cmd of script) {
      if (cmd.type === CMD.LABEL) {
        // 前のブロックをシーンとして確定
        if (current.commands.length > 0) {
          const id = `scene_${Date.now().toString(36)}_${newScenes.length}`;
          newScenes.push({ id, name: sceneName, description: "", commands: current.commands });
        }
        sceneName = cmd.name || `シーン ${newScenes.length + 1}`;
        current = { commands: [] };
      } else {
        current.commands.push(cmd);
      }
    }
    // 最後のブロック
    if (current.commands.length > 0) {
      const id = `scene_${Date.now().toString(36)}_${newScenes.length}`;
      newScenes.push({ id, name: sceneName, description: "", commands: current.commands });
    }

    if (newScenes.length === 0) return;
    onUpdateScenes([...allScenes, ...newScenes]);
    onUpdateSceneOrder([...order, ...newScenes.map((s) => s.id)]);
    setSelectedSceneId(newScenes[0].id);
  }, [script, allScenes, order, onUpdateScenes, onUpdateSceneOrder]);

  // シーン削除
  const removeScene = useCallback((id) => {
    onUpdateScenes(allScenes.filter((s) => s.id !== id));
    onUpdateSceneOrder(order.filter((sid) => sid !== id));
    if (selectedSceneId === id) setSelectedSceneId(null);
  }, [allScenes, order, selectedSceneId, onUpdateScenes, onUpdateSceneOrder]);

  // シーン複製
  const duplicateScene = useCallback((id) => {
    const src = allScenes.find((s) => s.id === id);
    if (!src) return;
    const newId = `scene_${Date.now().toString(36)}`;
    const copy = {
      ...JSON.parse(JSON.stringify(src)),
      id: newId,
      name: src.name + "（コピー）",
    };
    onUpdateScenes([...allScenes, copy]);
    onUpdateSceneOrder([...order, newId]);
    setSelectedSceneId(newId);
  }, [allScenes, order, onUpdateScenes, onUpdateSceneOrder]);

  // シーンメタ更新
  const updateSceneMeta = useCallback((field, value) => {
    if (!selectedSceneId) return;
    onUpdateScenes(allScenes.map((s) =>
      s.id === selectedSceneId ? { ...s, [field]: value } : s
    ));
  }, [selectedSceneId, allScenes, onUpdateScenes]);

  // シーン内コマンド更新
  const updateSceneCommands = useCallback((newCommands) => {
    if (!selectedSceneId) return;
    onUpdateScenes(allScenes.map((s) =>
      s.id === selectedSceneId ? { ...s, commands: newCommands } : s
    ));
  }, [selectedSceneId, allScenes, onUpdateScenes]);

  const updateCommand = useCallback((index, updated) => {
    if (!currentScene) return;
    const cmds = [...currentScene.commands];
    cmds[index] = { ...cmds[index], ...updated };
    updateSceneCommands(cmds);
  }, [currentScene, updateSceneCommands]);

  const addCommand = useCallback((type, afterIndex) => {
    if (!currentScene) return;
    const templates = {
      [CMD.DIALOG]: { type: CMD.DIALOG, speaker: "", text: "" },
      [CMD.BG]: { type: CMD.BG, src: "", transition: "fade" },
      [CMD.CHARA]: { type: CMD.CHARA, id: "", position: "center", expression: "neutral" },
      [CMD.CHARA_MOD]: { type: CMD.CHARA_MOD, id: "", expression: "" },
      [CMD.CHARA_HIDE]: { type: CMD.CHARA_HIDE, id: "" },
      [CMD.CHOICE]: { type: CMD.CHOICE, options: [{ text: "選択肢1", jump: 0 }, { text: "選択肢2", jump: 0 }] },
      [CMD.BGM]: { type: CMD.BGM, name: "", loop: true },
      [CMD.BGM_STOP]: { type: CMD.BGM_STOP, fadeout: 1000 },
      [CMD.SE]: { type: CMD.SE, name: "" },
      [CMD.EFFECT]: { type: CMD.EFFECT, name: "fade", color: "#000", time: 1000 },
      [CMD.WAIT]: { type: CMD.WAIT, time: 1000 },
      [CMD.JUMP]: { type: CMD.JUMP, target: 0 },
      [CMD.LABEL]: { type: CMD.LABEL, name: "" },
    };
    const newCmd = templates[type] || { type: CMD.DIALOG, speaker: "", text: "" };
    const cmds = [...currentScene.commands];
    cmds.splice(afterIndex + 1, 0, newCmd);
    updateSceneCommands(cmds);
    setSelectedCmdIndex(afterIndex + 1);
  }, [currentScene, updateSceneCommands]);

  const removeCommand = useCallback((index) => {
    if (!currentScene || currentScene.commands.length <= 1) return;
    const cmds = [...currentScene.commands];
    cmds.splice(index, 1);
    updateSceneCommands(cmds);
    setSelectedCmdIndex(Math.max(0, index - 1));
  }, [currentScene, updateSceneCommands]);

  const moveCommand = useCallback((index, direction) => {
    if (!currentScene) return;
    const target = index + direction;
    if (target < 0 || target >= currentScene.commands.length) return;
    const cmds = [...currentScene.commands];
    [cmds[index], cmds[target]] = [cmds[target], cmds[index]];
    updateSceneCommands(cmds);
    setSelectedCmdIndex(target);
  }, [currentScene, updateSceneCommands]);

  // シーン順序のドラッグ並べ替え
  const moveOrder = useCallback((from, to) => {
    if (from === to) return;
    const newOrder = [...order];
    const [moved] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, moved);
    onUpdateSceneOrder(newOrder);
  }, [order, onUpdateSceneOrder]);

  // 結合スクリプトを生成してメインスクリプトに反映
  const buildScript = useCallback(() => {
    const result = [];
    for (const id of order) {
      const scene = allScenes.find((s) => s.id === id);
      if (!scene) continue;
      // シーンの先頭にラベルを挿入
      result.push({ type: CMD.LABEL, name: scene.name });
      result.push(...scene.commands);
    }
    onUpdateScript(result);
  }, [order, allScenes, onUpdateScript]);

  // 統計
  const totalCommands = useMemo(() =>
    allScenes.reduce((sum, s) => sum + (s.commands?.length || 0), 0),
    [allScenes]
  );

  return (
    <div style={styles.container}>
      {/* 左: シーン一覧 + 再生順 */}
      <div style={styles.sidebar}>
        <div style={styles.sideHeader}>
          <span style={styles.sideTitle}>シーン一覧</span>
          <span style={styles.stats}>{allScenes.length}シーン / {totalCommands}コマンド</span>
        </div>

        {/* シーンリスト */}
        <div style={styles.sceneList}>
          {order.map((id, idx) => {
            const scene = allScenes.find((s) => s.id === id);
            if (!scene) return null;
            return (
              <div
                key={id}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => { if (dragIdx !== null) moveOrder(dragIdx, idx); setDragIdx(null); }}
                onClick={() => { setSelectedSceneId(id); setSelectedCmdIndex(0); }}
                style={{
                  ...styles.sceneItem,
                  background: selectedSceneId === id ? "rgba(200,180,140,0.15)" : "transparent",
                  borderColor: selectedSceneId === id ? "rgba(200,180,140,0.4)" : "rgba(255,255,255,0.06)",
                }}
              >
                <div style={styles.sceneOrder}>{idx + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.sceneName}>{scene.name}</div>
                  <div style={styles.sceneMeta}>
                    {scene.commands?.length || 0} コマンド
                    {scene.description ? ` — ${scene.description}` : ""}
                  </div>
                </div>
                <div style={styles.sceneActions}>
                  <button onClick={(e) => { e.stopPropagation(); duplicateScene(id); }} style={styles.iconBtn} title="複製">⧉</button>
                  <button onClick={(e) => { e.stopPropagation(); removeScene(id); }} style={styles.iconBtnDanger} title="削除">✕</button>
                </div>
              </div>
            );
          })}
          {/* 未配置のシーン */}
          {allScenes.filter((s) => !order.includes(s.id)).map((scene) => (
            <div
              key={scene.id}
              onClick={() => { setSelectedSceneId(scene.id); setSelectedCmdIndex(0); }}
              style={{
                ...styles.sceneItem,
                opacity: 0.5,
                background: selectedSceneId === scene.id ? "rgba(200,180,140,0.15)" : "transparent",
                borderColor: "rgba(255,100,100,0.2)",
              }}
            >
              <div style={{ ...styles.sceneOrder, color: "#EF5350" }}>—</div>
              <div style={{ flex: 1 }}>
                <div style={styles.sceneName}>{scene.name}</div>
                <div style={{ ...styles.sceneMeta, color: "#EF5350" }}>未配置</div>
              </div>
            </div>
          ))}
        </div>

        {/* 追加 */}
        <div style={styles.addArea}>
          <div style={styles.addRow}>
            <input
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              placeholder="シーン名"
              style={styles.input}
              onKeyDown={(e) => e.key === "Enter" && addScene()}
            />
            <button onClick={addScene} style={styles.addBtn}>追加</button>
          </div>
          {script && script.length > 0 && allScenes.length === 0 && (
            <button onClick={importFromScript} style={styles.importBtn}>
              既存スクリプトからインポート
            </button>
          )}
          <button onClick={buildScript} style={styles.buildBtn}>
            スクリプトに結合・反映
          </button>
        </div>
      </div>

      {/* 中央: コマンドリスト */}
      {currentScene ? (
        <>
          <div style={styles.cmdList}>
            <div style={styles.cmdListHeader}>
              <input
                value={currentScene.name}
                onChange={(e) => updateSceneMeta("name", e.target.value)}
                style={styles.sceneNameInput}
              />
              <input
                value={currentScene.description || ""}
                onChange={(e) => updateSceneMeta("description", e.target.value)}
                style={styles.sceneDescInput}
                placeholder="説明（メモ）"
              />
            </div>
            <ScriptList
              script={currentScene.commands}
              selectedIndex={selectedCmdIndex}
              onSelect={setSelectedCmdIndex}
              onAdd={addCommand}
              onRemove={removeCommand}
              onMove={moveCommand}
            />
          </div>

          {/* 右: コマンド編集 */}
          <div style={styles.cmdEditor}>
            {currentScene.commands[selectedCmdIndex] ? (
              <CommandEditor
                command={currentScene.commands[selectedCmdIndex]}
                index={selectedCmdIndex}
                onChange={(updated) => updateCommand(selectedCmdIndex, updated)}
                characters={characters}
                script={currentScene.commands}
              />
            ) : (
              <div style={styles.empty}>コマンドを選択してください</div>
            )}
          </div>
        </>
      ) : (
        <div style={{ ...styles.cmdEditor, flex: 2 }}>
          <div style={styles.empty}>
            左のリストからシーンを選択、または新規追加してください
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex", height: "100%", overflow: "hidden",
  },
  sidebar: {
    width: 260, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex", flexDirection: "column", overflow: "hidden",
  },
  sideHeader: {
    padding: "10px 12px", borderBottom: "1px solid rgba(200,180,140,0.15)", flexShrink: 0,
  },
  sideTitle: {
    color: "#C8A870", fontSize: 13, letterSpacing: 2, display: "block",
  },
  stats: {
    color: "#666", fontSize: 10, fontFamily: "monospace",
  },
  sceneList: {
    flex: 1, overflowY: "auto", padding: "8px 8px",
  },
  sceneItem: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px", borderRadius: 4, marginBottom: 4, cursor: "pointer",
    borderWidth: 1, borderStyle: "solid", borderColor: "rgba(255,255,255,0.06)",
    transition: "all 0.2s",
  },
  sceneOrder: {
    width: 22, height: 22, borderRadius: "50%",
    background: "rgba(200,180,140,0.1)", color: "#C8A870",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 10, fontWeight: 700, flexShrink: 0,
  },
  sceneName: { color: "#E8D4B0", fontSize: 13 },
  sceneMeta: {
    color: "#666", fontSize: 10, overflow: "hidden",
    textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  sceneActions: {
    display: "flex", gap: 2, flexShrink: 0,
  },
  iconBtn: {
    background: "none", border: "none", color: "#888",
    cursor: "pointer", fontSize: 14, padding: "2px 4px",
  },
  iconBtnDanger: {
    background: "none", border: "none", color: "#EF5350",
    cursor: "pointer", fontSize: 12, padding: "2px 4px", opacity: 0.6,
  },
  addArea: {
    padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
  },
  addRow: {
    display: "flex", gap: 6, marginBottom: 6,
  },
  input: {
    flex: 1,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)",
    color: "#E8E4DC", padding: "5px 8px", borderRadius: 3, fontSize: 12,
    fontFamily: "inherit", outline: "none",
  },
  addBtn: {
    background: "rgba(200,180,140,0.12)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#C8A870", padding: "5px 12px", borderRadius: 3, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
  },
  importBtn: {
    background: "rgba(90,180,255,0.1)", border: "1px solid rgba(90,180,255,0.3)",
    color: "#5BF", padding: "6px 0", borderRadius: 4, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit", width: "100%", marginBottom: 4,
  },
  buildBtn: {
    background: "rgba(100,200,100,0.1)", border: "1px solid rgba(100,200,100,0.3)",
    color: "#8C4", padding: "6px 0", borderRadius: 4, fontSize: 11,
    cursor: "pointer", fontFamily: "inherit", width: "100%", fontWeight: 600,
  },
  cmdList: {
    width: 280, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex", flexDirection: "column", overflow: "hidden",
  },
  cmdListHeader: {
    padding: "8px 12px", borderBottom: "1px solid rgba(200,180,140,0.1)",
    display: "flex", flexDirection: "column", gap: 4, flexShrink: 0,
  },
  sceneNameInput: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,180,140,0.2)",
    color: "#E8D4B0", padding: "4px 8px", borderRadius: 3, fontSize: 14,
    fontFamily: "inherit", outline: "none",
  },
  sceneDescInput: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#888", padding: "3px 8px", borderRadius: 3, fontSize: 11,
    fontFamily: "inherit", outline: "none",
  },
  cmdEditor: {
    flex: 1, overflowY: "auto", padding: 20,
  },
  empty: {
    color: "#555", fontSize: 13, textAlign: "center", marginTop: 40,
  },
};
