import { useState, useCallback, useEffect } from "react";
import { CMD } from "../engine/constants";
import { updateProject, getProject } from "../project/ProjectStore";
import ScriptList from "./ScriptList";
import CommandEditor from "./CommandEditor";
import PreviewPanel from "./PreviewPanel";
import TextEditor from "./TextEditor";
import FlowGraph from "./FlowGraph";
import DebugPanel from "./DebugPanel";
import SaveDataEditor from "./SaveDataEditor";
import MapEditor from "./rpg/MapEditor";
import BattleEditor from "./rpg/BattleEditor";
import MinigameEditor from "./minigame/MinigameEditor";
import DeployPanel from "./DeployPanel";

// 編集用の初期スクリプト（空テンプレート）
const DEFAULT_SCRIPT = [
  { type: "bg", src: "school_gate", transition: "fade" },
  { type: "dialog", speaker: "", text: "ここにテキストを入力…" },
];

// タブ定義
const TABS = [
  { id: "script",   label: "スクリプト", group: "novel" },
  { id: "text",     label: "テキスト",   group: "novel" },
  { id: "flow",     label: "フロー",     group: "novel" },
  { id: "map",      label: "マップ",     group: "rpg" },
  { id: "battle",   label: "バトル",     group: "rpg" },
  { id: "minigame", label: "ミニゲーム", group: "extra" },
  { id: "preview",  label: "プレビュー", group: "tool" },
  { id: "debug",    label: "DEBUG",      group: "tool" },
  { id: "save",     label: "セーブ",     group: "tool" },
  { id: "deploy",   label: "Deploy",     group: "tool" },
];

export default function EditorScreen({ onBack, initialScript, projectId, projectName }) {
  const [script, setScript] = useState(initialScript || DEFAULT_SCRIPT);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("script");
  const [maps, setMaps] = useState([]);
  const [battleData, setBattleData] = useState({ enemies: [], skills: [], battles: [] });
  const [minigames, setMinigames] = useState([]);

  // プロジェクトから追加データを非同期ロード
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const proj = await getProject(projectId);
      if (proj) {
        setMaps(proj.maps || []);
        setBattleData(proj.battleData || { enemies: [], skills: [], battles: [] });
        setMinigames(proj.minigames || []);
      }
    })();
  }, [projectId]);

  // スクリプト更新（ProjectStore にも自動保存）
  const persistScript = useCallback((newScript) => {
    setScript(newScript);
    if (projectId) {
      updateProject(projectId, { script: newScript });
    }
  }, [projectId]);

  // コマンド更新
  const updateCommand = useCallback((index, updated) => {
    setScript((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updated };
      if (projectId) updateProject(projectId, { script: next });
      return next;
    });
  }, [projectId]);

  // コマンド追加
  const addCommand = useCallback((type, afterIndex) => {
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
    setScript((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newCmd);
      if (projectId) updateProject(projectId, { script: next });
      return next;
    });
    setSelectedIndex(afterIndex + 1);
  }, [projectId]);

  // コマンド削除
  const removeCommand = useCallback((index) => {
    setScript((prev) => {
      if (prev.length <= 1) return prev;
      const next = [...prev];
      next.splice(index, 1);
      if (projectId) updateProject(projectId, { script: next });
      return next;
    });
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  }, [projectId]);

  // コマンド並べ替え
  const moveCommand = useCallback((index, direction) => {
    setScript((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      if (projectId) updateProject(projectId, { script: next });
      return next;
    });
    setSelectedIndex((prev) => {
      const target = prev + direction;
      return Math.max(0, Math.min(script.length - 1, target));
    });
  }, [script.length, projectId]);

  // JSON エクスポート
  const exportScript = useCallback(() => {
    const json = JSON.stringify(script, null, 2);
    const blob = new Blob([`const SCRIPT = ${json};\n\nexport default SCRIPT;\n`], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "script.js";
    a.click();
    URL.revokeObjectURL(url);
  }, [script]);

  // 中央パネルの表示内容
  const renderCenter = () => {
    switch (activeTab) {
      case "text":
        return <TextEditor script={script} onUpdateScript={persistScript} />;
      case "flow":
        return <FlowGraph script={script} />;
      case "preview":
        return (
          <div style={{ padding: 16, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PreviewPanel script={script} startIndex={0} />
          </div>
        );
      case "debug":
        return <DebugPanel engineState={{}} script={script} />;
      case "save":
        return <SaveDataEditor projectId={projectId} />;
      case "map":
        return (
          <MapEditor
            maps={maps}
            onUpdateMaps={(m) => { setMaps(m); if (projectId) updateProject(projectId, { maps: m }); }}
          />
        );
      case "battle":
        return (
          <BattleEditor
            battleData={battleData}
            onUpdateBattleData={(d) => { setBattleData(d); if (projectId) updateProject(projectId, { battleData: d }); }}
          />
        );
      case "minigame":
        return (
          <MinigameEditor
            minigames={minigames}
            onUpdateMinigames={(m) => { setMinigames(m); if (projectId) updateProject(projectId, { minigames: m }); }}
          />
        );
      case "deploy":
        return <DeployPanel projectId={projectId} projectName={projectName} />;
      case "script":
      default:
        return script[selectedIndex] ? (
          <div style={{ padding: 20 }}>
            <CommandEditor
              command={script[selectedIndex]}
              index={selectedIndex}
              onChange={(updated) => updateCommand(selectedIndex, updated)}
            />
          </div>
        ) : (
          <div style={styles.emptyState}>コマンドを選択してください</div>
        );
    }
  };

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onBack} style={styles.headerBtn}>← 戻る</button>
          {projectName && <span style={styles.projectName}>{projectName}</span>}
        </div>
        <div style={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={styles.headerRight}>
          <span style={styles.cmdCount}>{script.length} cmd</span>
          <button onClick={exportScript} style={styles.headerBtn}>エクスポート</button>
        </div>
      </div>

      {/* メインエリア */}
      <div style={styles.main}>
        {/* 左: スクリプトリスト（ノベル系タブのみ表示） */}
        {["script", "text", "flow", "preview", "debug", "save", "deploy"].includes(activeTab) && (
          <div style={styles.leftPanel}>
            <ScriptList
              script={script}
              selectedIndex={selectedIndex}
              onSelect={(i) => { setSelectedIndex(i); setActiveTab("script"); }}
              onAdd={addCommand}
              onRemove={removeCommand}
              onMove={moveCommand}
            />
          </div>
        )}

        {/* 中央: タブごとの内容 */}
        <div style={styles.centerPanel}>
          {renderCenter()}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#1a1a2e",
    color: "#E8E4DC",
    fontFamily: "'Noto Serif JP', 'Yu Mincho', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 12px",
    background: "#0f0f1a",
    borderBottom: "1px solid rgba(200,180,140,0.15)",
    flexShrink: 0,
    gap: 8,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  projectName: {
    fontSize: 13,
    color: "#E8D4B0",
    letterSpacing: 1,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  headerBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#ccc",
    padding: "4px 12px",
    borderRadius: 3,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s",
  },
  tabs: {
    display: "flex",
    gap: 2,
    flex: 1,
    justifyContent: "center",
  },
  tabBtn: {
    background: "transparent",
    border: "1px solid transparent",
    color: "#888",
    padding: "4px 14px",
    borderRadius: 3,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: 1,
    transition: "all 0.2s",
  },
  tabBtnActive: {
    background: "rgba(200,180,140,0.1)",
    borderColor: "rgba(200,180,140,0.3)",
    color: "#E8D4B0",
  },
  cmdCount: {
    fontSize: 10,
    color: "#666",
    fontFamily: "monospace",
  },
  main: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  leftPanel: {
    width: 260,
    flexShrink: 0,
    borderRight: "1px solid rgba(200,180,140,0.1)",
    overflowY: "auto",
    background: "#12121f",
  },
  centerPanel: {
    flex: 1,
    overflowY: "auto",
  },
  emptyState: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    marginTop: 80,
  },
};
