import { useState, useCallback, useEffect, useRef } from "react";
import { CMD } from "../engine/constants";
import { updateProject, getProject, getAssetUrl } from "../project/ProjectStore";
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
import CharacterEditor from "./CharacterEditor";
import BackgroundEditor from "./BackgroundEditor";
import ItemEditor from "./ItemEditor";
import EventEditor from "./EventEditor";
import CGCatalogEditor from "./CGCatalogEditor";
import SceneCatalogEditor from "./SceneCatalogEditor";
import AudioCatalogEditor from "./AudioCatalogEditor";
import SceneEditor from "./SceneEditor";
import HelpModal, { HelpButton } from "../components/HelpModal";
import { EDITOR_HELP, MAP_EDITOR_HELP } from "../data/helpContent";

// 編集用の初期スクリプト（空テンプレート）
const DEFAULT_SCRIPT = [
  { type: "bg", src: "school_gate", transition: "fade" },
  { type: "dialog", speaker: "", text: "ここにテキストを入力…" },
];

// タブ定義
const TABS = [
  { id: "script",   label: "スクリプト", group: "novel" },
  { id: "scenes",   label: "シーン編集", group: "novel" },
  { id: "text",     label: "テキスト",   group: "novel" },
  { id: "chara",    label: "キャラ",     group: "novel" },
  { id: "bg",       label: "背景",       group: "novel" },
  { id: "bgm",     label: "BGM",       group: "novel" },
  { id: "se",      label: "SE",        group: "novel" },
  { id: "item",     label: "アイテム",   group: "rpg" },
  { id: "cg",       label: "CG",         group: "novel" },
  { id: "scene",    label: "シーン",     group: "novel" },
  { id: "event",    label: "イベント",   group: "novel" },
  { id: "flow",     label: "フロー",     group: "novel" },
  { id: "map",      label: "マップ",     group: "rpg" },
  { id: "battle",   label: "バトル",     group: "rpg" },
  { id: "minigame", label: "ミニゲーム", group: "extra" },
  { id: "preview",  label: "プレビュー", group: "tool" },
  { id: "debug",    label: "DEBUG",      group: "tool" },
  { id: "save",     label: "セーブ",     group: "tool" },
  { id: "deploy",   label: "Deploy",     group: "tool" },
];

// gameType に応じたタブフィルタ
const TAB_GROUPS = {
  novel: ["novel", "tool"],
  rpg: ["novel", "rpg", "tool"],
  minigame: ["novel", "extra", "tool"],
};

export default function EditorScreen({ onBack, initialScript, projectId, projectName, gameType }) {
  const visibleTabs = TABS.filter((tab) => {
    const groups = TAB_GROUPS[gameType] || TAB_GROUPS.novel;
    return groups.includes(tab.group);
  });
  const [script, setScript] = useState(initialScript || DEFAULT_SCRIPT);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSceneChild, setSelectedSceneChild] = useState(null); // { sceneId, childIndex }
  const [activeTab, setActiveTab] = useState("script");
  const [characters, setCharacters] = useState({});
  const [bgStyles, setBgStyles] = useState({});
  const [items, setItems] = useState([]);
  const [gameEvents, setGameEvents] = useState([]);
  const [maps, setMaps] = useState([]);
  const [customTiles, setCustomTiles] = useState([]);
  const [battleData, setBattleData] = useState({ enemies: [], skills: [], battles: [] });
  const [minigames, setMinigames] = useState([]);
  const [cgCatalog, setCgCatalog] = useState([]);
  const [sceneCatalog, setSceneCatalog] = useState([]);
  const [bgmCatalog, setBgmCatalog] = useState([]);
  const [seCatalog, setSeCatalog] = useState([]);
  const [storyScenes, setStoryScenes] = useState([]);
  const [sceneOrder, setSceneOrder] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved"
  const [previewStartIndex, setPreviewStartIndex] = useState({ index: 0, seq: 0 });
  const [showSplitPreview, setShowSplitPreview] = useState(false);
  const previewSeq = useRef(0);
  const setPreviewIndex = useCallback((i) => {
    previewSeq.current += 1;
    setPreviewStartIndex({ index: i, seq: previewSeq.current });
  }, []);
  // Undo/Redo 履歴
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const MAX_UNDO = 50;
  const saveTimerRef = useRef(null);

  // Undo/Redo 用のスクリプト更新（履歴を記録）
  const pushUndo = useCallback((prevScript) => {
    setUndoStack((stack) => {
      const next = [...stack, prevScript];
      return next.length > MAX_UNDO ? next.slice(-MAX_UNDO) : next;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setRedoStack((redo) => [...redo, script]);
      setScript(prev);
      return stack.slice(0, -1);
    });
  }, [script]);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const next = stack[stack.length - 1];
      setUndoStack((undo) => [...undo, script]);
      setScript(next);
      return stack.slice(0, -1);
    });
  }, [script]);

  // 「この行から再生」ハンドラ
  const handlePlayFrom = useCallback((index) => {
    setPreviewIndex(index);
    setShowSplitPreview(true);
  }, [setPreviewIndex]);

  // プロジェクトから追加データを非同期ロード
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const proj = await getProject(projectId);
      if (proj) {
        setCharacters(proj.characters || {});
        // bgStyles: imageFile がある場合は毎回 background URL を再解決
        const rawBg = proj.bgStyles || {};
        const resolvedBg = {};
        for (const [key, style] of Object.entries(rawBg)) {
          if (style.imageFile) {
            const url = getAssetUrl(projectId, "bg", style.imageFile);
            resolvedBg[key] = { ...style, background: `url(${url}) center/cover no-repeat` };
          } else {
            resolvedBg[key] = style;
          }
        }
        setBgStyles(resolvedBg);
        setItems(proj.items || []);
        setGameEvents(proj.gameEvents || []);
        setMaps(proj.maps || []);
        setCustomTiles(proj.customTiles || []);
        setBattleData(proj.battleData || { enemies: [], skills: [], battles: [] });
        setMinigames(proj.minigames || []);
        setCgCatalog(proj.cgCatalog || []);
        setSceneCatalog(proj.sceneCatalog || []);
        setBgmCatalog(proj.bgmCatalog || []);
        setSeCatalog(proj.seCatalog || []);
        setStoryScenes(proj.storyScenes || []);
        setSceneOrder(proj.sceneOrder || []);
      }
    })();
  }, [projectId]);

  // プロジェクト全体を保存
  const saveProject = useCallback(async () => {
    if (!projectId) return;
    setSaveStatus("saving");
    await updateProject(projectId, { script, characters, bgStyles, items, gameEvents, maps, customTiles, battleData, minigames, cgCatalog, sceneCatalog, bgmCatalog, seCatalog, storyScenes, sceneOrder });
    setDirty(false);
    setSaveStatus("saved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus(null), 2000);
  }, [projectId, script, characters, bgStyles, items, gameEvents, maps, customTiles, battleData, minigames, cgCatalog, sceneCatalog, bgmCatalog, seCatalog, storyScenes, sceneOrder]);

  // Ctrl+S: 保存、Ctrl+Z: Undo、Ctrl+Y/Ctrl+Shift+Z: Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveProject();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveProject, undo, redo]);

  // 変更マーク用ヘルパー
  const markDirty = useCallback(() => {
    setDirty(true);
    setSaveStatus(null);
  }, []);

  // スクリプト更新（ローカルステートのみ、保存はボタンで）
  const persistScript = useCallback((newScript) => {
    pushUndo(script);
    setScript(newScript);
    markDirty();
  }, [markDirty, pushUndo, script]);

  // コマンド更新
  const updateCommand = useCallback((index, updated) => {
    pushUndo(script);
    setScript((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updated };
      return next;
    });
    markDirty();
  }, [markDirty, pushUndo, script]);

  // コマンド追加
  const addCommand = useCallback((type, afterIndex) => {
    const templates = {
      [CMD.DIALOG]: { type: CMD.DIALOG, speaker: "", text: "" },
      [CMD.BG]: { type: CMD.BG, src: "", transition: "fade" },
      [CMD.CHARA]: { type: CMD.CHARA, id: "", position: "center", expression: "neutral" },
      [CMD.CHARA_MOD]: { type: CMD.CHARA_MOD, id: "", expression: "" },
      [CMD.CHARA_HIDE]: { type: CMD.CHARA_HIDE, id: "" },
      [CMD.CHOICE]: { type: CMD.CHOICE, options: [{ text: "選択肢1", jump: "" }, { text: "選択肢2", jump: "" }] },
      [CMD.BGM]: { type: CMD.BGM, name: "", loop: true },
      [CMD.BGM_STOP]: { type: CMD.BGM_STOP, fadeout: 1000 },
      [CMD.SE]: { type: CMD.SE, name: "" },
      [CMD.EFFECT]: { type: CMD.EFFECT, name: "fade", color: "#000", time: 1000 },
      [CMD.WAIT]: { type: CMD.WAIT, time: 1000 },
      [CMD.JUMP]: { type: CMD.JUMP, target: "" },
      [CMD.LABEL]: { type: CMD.LABEL, name: "" },
      [CMD.SCENE]: { type: CMD.SCENE, sceneId: "", label: "" },
    };
    const newCmd = templates[type] || { type: CMD.DIALOG, speaker: "", text: "" };
    pushUndo(script);
    setScript((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newCmd);
      return next;
    });
    setSelectedIndex(afterIndex + 1);
    markDirty();
  }, [markDirty, pushUndo, script]);

  // コマンド削除
  const removeCommand = useCallback((index) => {
    pushUndo(script);
    setScript((prev) => {
      if (prev.length <= 1) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setSelectedIndex((prev) => Math.max(0, prev - 1));
    markDirty();
  }, [markDirty, pushUndo, script]);

  // コマンド並べ替え
  const moveCommand = useCallback((index, direction) => {
    pushUndo(script);
    setScript((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSelectedIndex((prev) => {
      const target = prev + direction;
      return Math.max(0, Math.min(script.length - 1, target));
    });
    markDirty();
  }, [script.length, markDirty, pushUndo, script]);

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
      case "scenes":
        return (
          <SceneEditor
            scenes={storyScenes}
            onUpdateScenes={(s) => { setStoryScenes(s); markDirty(); }}
            sceneOrder={sceneOrder}
            onUpdateSceneOrder={(o) => { setSceneOrder(o); markDirty(); }}
            script={script}
            onUpdateScript={persistScript}
            characters={characters}
            bgStyles={bgStyles}
            projectId={projectId}
            bgmCatalog={bgmCatalog}
            seCatalog={seCatalog}
          />
        );
      case "text":
        return (
          <TextEditor
            script={script}
            onUpdateScript={persistScript}
            storyScenes={storyScenes}
            onUpdateStoryScenes={(s) => { setStoryScenes(s); markDirty(); }}
          />
        );
      case "chara":
        return (
          <CharacterEditor
            characters={characters}
            onUpdateCharacters={(c) => { setCharacters(c); markDirty(); }}
            projectId={projectId}
          />
        );
      case "bg":
        return (
          <BackgroundEditor
            bgStyles={bgStyles}
            onUpdateBgStyles={(s) => { setBgStyles(s); markDirty(); }}
            projectId={projectId}
          />
        );
      case "bgm":
        return (
          <AudioCatalogEditor
            catalog={bgmCatalog}
            onUpdateCatalog={(c) => { setBgmCatalog(c); markDirty(); }}
            projectId={projectId}
            mode="bgm"
          />
        );
      case "se":
        return (
          <AudioCatalogEditor
            catalog={seCatalog}
            onUpdateCatalog={(c) => { setSeCatalog(c); markDirty(); }}
            projectId={projectId}
            mode="se"
          />
        );
      case "item":
        return (
          <ItemEditor
            items={items}
            onUpdateItems={(i) => { setItems(i); markDirty(); }}
          />
        );
      case "cg":
        return (
          <CGCatalogEditor
            catalog={cgCatalog}
            onUpdateCatalog={(c) => { setCgCatalog(c); markDirty(); }}
            script={script}
            projectId={projectId}
          />
        );
      case "scene":
        return (
          <SceneCatalogEditor
            catalog={sceneCatalog}
            onUpdateCatalog={(c) => { setSceneCatalog(c); markDirty(); }}
            script={script}
            storyScenes={storyScenes}
            projectId={projectId}
          />
        );
      case "event":
        return (
          <EventEditor
            events={gameEvents}
            onUpdateEvents={(e) => { setGameEvents(e); markDirty(); }}
            script={script}
            items={items}
            bgStyles={bgStyles}
            bgmCatalog={bgmCatalog}
            seCatalog={seCatalog}
            cgCatalog={cgCatalog}
            sceneCatalog={sceneCatalog}
            storyScenes={storyScenes}
          />
        );
      case "flow":
        return <FlowGraph script={script} storyScenes={storyScenes} />;
      case "preview":
        return (
          <div style={{ padding: 16, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PreviewPanel script={script} startIndex={previewStartIndex} storyScenes={storyScenes} characters={characters} bgStyles={bgStyles} projectId={projectId} />
          </div>
        );
      case "debug":
        return <DebugPanel script={script} characters={characters} />;
      case "save":
        return <SaveDataEditor projectId={projectId} />;
      case "map":
        return (
          <MapEditor
            maps={maps}
            onUpdateMaps={(m) => { setMaps(m); markDirty(); }}
            projectId={projectId}
            customTiles={customTiles}
            onUpdateCustomTiles={(t) => { setCustomTiles(t); markDirty(); }}
          />
        );
      case "battle":
        return (
          <BattleEditor
            battleData={battleData}
            onUpdateBattleData={(d) => { setBattleData(d); markDirty(); }}
          />
        );
      case "minigame":
        return (
          <MinigameEditor
            minigames={minigames}
            onUpdateMinigames={(m) => { setMinigames(m); markDirty(); }}
          />
        );
      case "deploy":
        return <DeployPanel projectId={projectId} projectName={projectName} />;
      case "script":
      default: {
        // シーン子コマンドの解決
        const sceneChildCmd = (() => {
          if (!selectedSceneChild) return null;
          const scene = storyScenes.find((s) => s.id === selectedSceneChild.sceneId);
          return scene?.commands?.[selectedSceneChild.childIndex] || null;
        })();
        const sceneChildScene = selectedSceneChild
          ? storyScenes.find((s) => s.id === selectedSceneChild.sceneId)
          : null;

        const updateSceneChildCmd = (updated) => {
          if (!selectedSceneChild) return;
          const newScenes = storyScenes.map((s) => {
            if (s.id !== selectedSceneChild.sceneId) return s;
            const newCmds = [...s.commands];
            newCmds[selectedSceneChild.childIndex] = updated;
            return { ...s, commands: newCmds };
          });
          setStoryScenes(newScenes);
          markDirty();
        };

        return (
          <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
            {/* エディタ部分 */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {sceneChildCmd ? (
                <>
                  <div style={{ fontSize: 11, color: "#66BB6A", marginBottom: 8, padding: "4px 8px", background: "rgba(100,200,100,0.08)", borderRadius: 3, display: "inline-block" }}>
                    {sceneChildScene?.name} #{selectedSceneChild.childIndex}
                  </div>
                  <CommandEditor
                    command={sceneChildCmd}
                    index={selectedSceneChild.childIndex}
                    onChange={updateSceneChildCmd}
                    characters={characters}
                    script={sceneChildScene?.commands || []}
                    storyScenes={storyScenes}
                    projectId={projectId}
                    bgmCatalog={bgmCatalog}
                    seCatalog={seCatalog}
                    bgStyles={bgStyles}
                  />
                </>
              ) : script[selectedIndex] ? (
                <CommandEditor
                  command={script[selectedIndex]}
                  index={selectedIndex}
                  onChange={(updated) => updateCommand(selectedIndex, updated)}
                  characters={characters}
                  script={script}
                  storyScenes={storyScenes}
                  projectId={projectId}
                  bgmCatalog={bgmCatalog}
                  seCatalog={seCatalog}
                  bgStyles={bgStyles}
                />
              ) : (
                <div style={styles.emptyState}>コマンドを選択してください</div>
              )}
            </div>
            {/* 分割プレビュー */}
            {showSplitPreview && (
              <div style={styles.splitPreview}>
                <div style={styles.splitPreviewHeader}>
                  <span style={{ fontSize: 11, color: "#C8A870" }}>プレビュー</span>
                  <button
                    onClick={() => setShowSplitPreview(false)}
                    style={styles.splitPreviewClose}
                  >
                    ✕
                  </button>
                </div>
                <PreviewPanel script={script} startIndex={previewStartIndex} storyScenes={storyScenes} characters={characters} bgStyles={bgStyles} projectId={projectId} />
              </div>
            )}
          </div>
        );
      }
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
          {visibleTabs.map((tab) => (
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
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            style={{ ...styles.headerBtn, opacity: undoStack.length === 0 ? 0.3 : 1 }}
            title="元に戻す (Ctrl+Z)"
          >
            ↩
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            style={{ ...styles.headerBtn, opacity: redoStack.length === 0 ? 0.3 : 1 }}
            title="やり直し (Ctrl+Y)"
          >
            ↪
          </button>
          <button
            onClick={() => { setShowSplitPreview(!showSplitPreview); setPreviewIndex(selectedIndex); }}
            style={{
              ...styles.headerBtn,
              ...(showSplitPreview ? { background: "rgba(200,180,140,0.15)", color: "#E8D4B0" } : {}),
            }}
            title="分割プレビュー"
          >
            ▶
          </button>
          <span style={styles.cmdCount}>{script.length} cmd</span>
          {saveStatus === "saved" && <span style={styles.savedLabel}>保存しました</span>}
          {saveStatus === "saving" && <span style={styles.savingLabel}>保存中...</span>}
          {dirty && saveStatus !== "saving" && <span style={styles.dirtyLabel}>未保存</span>}
          <button
            onClick={saveProject}
            style={{
              ...styles.headerBtn,
              ...styles.saveBtn,
              ...(dirty ? styles.saveBtnDirty : {}),
            }}
          >
            保存
          </button>
          <button onClick={exportScript} style={styles.headerBtn}>エクスポート</button>
          <HelpButton onClick={() => setShowHelp(true)} />
        </div>
      </div>

      {/* メインエリア */}
      <div style={styles.main}>
        {/* 左: スクリプトリスト（ノベル系タブのみ表示） */}
        {["script", "preview", "debug"].includes(activeTab) && (
          <div style={styles.leftPanel}>
            <ScriptList
              script={script}
              selectedIndex={selectedIndex}
              onSelect={(i) => { setSelectedIndex(i); setSelectedSceneChild(null); if (showSplitPreview || activeTab === "preview") setPreviewIndex(i); else setActiveTab("script"); }}
              onAdd={addCommand}
              onRemove={removeCommand}
              onMove={moveCommand}
              onPlayFrom={handlePlayFrom}
              storyScenes={storyScenes}
              selectedSceneChild={selectedSceneChild}
              onSelectSceneChild={(sceneId, childIndex) => {
                setSelectedSceneChild({ sceneId, childIndex });
              }}
            />
          </div>
        )}

        {/* 中央: タブごとの内容 */}
        <div style={styles.centerPanel}>
          {renderCenter()}
        </div>
      </div>
      {showHelp && (
        <HelpModal
          {...(activeTab === "map" ? MAP_EDITOR_HELP : EDITOR_HELP)}
          onClose={() => setShowHelp(false)}
        />
      )}
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
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
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
    minHeight: 0,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
  },
  emptyState: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    marginTop: 80,
  },
  saveBtn: {
    fontWeight: "bold",
  },
  saveBtnDirty: {
    background: "rgba(200,180,140,0.15)",
    borderColor: "rgba(200,180,140,0.5)",
    color: "#E8D4B0",
  },
  dirtyLabel: {
    fontSize: 10,
    color: "#FFB74D",
  },
  savedLabel: {
    fontSize: 10,
    color: "#8BC34A",
  },
  savingLabel: {
    fontSize: 10,
    color: "#C8A870",
  },
  splitPreview: {
    width: 400,
    flexShrink: 0,
    borderLeft: "1px solid rgba(200,180,140,0.15)",
    background: "#0f0f1a",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  splitPreviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 12px",
    borderBottom: "1px solid rgba(200,180,140,0.1)",
    flexShrink: 0,
  },
  splitPreviewClose: {
    background: "none",
    border: "none",
    color: "#888",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};
