import { useState, useCallback, useEffect, useMemo } from "react";
import ConfigView from "./components/ConfigView";
import ProjectManager from "./project/ProjectManager";
import TitleScreen from "./components/TitleScreen";
import NovelEngine from "./engine/NovelEngine";
import EditorScreen from "./editor/EditorScreen";
import CGGallery from "./components/CGGallery";
import SceneRecollection from "./components/SceneRecollection";
import RPGEngine from "./rpg/RPGEngine";
import MinigameRunner from "./minigame/MinigameRunner";
import { getProject, setActiveProjectId } from "./project/ProjectStore";
import { GAME_CONTAINER_STYLE, COLORS, loadPersistedConfig, persistConfig, SCREEN_PRESETS } from "./data/config";

// ゲームモード判定（ビルド済みゲームかどうか）
const GAME_MODE_FILE = "./game-data.json";

function App() {
  const [screen, setScreen] = useState("loading"); // loading → projects or title
  const [project, setProject] = useState(null);
  const [gameMode, setGameMode] = useState(false); // ゲーム専用ビルドかどうか
  const [startLabel, setStartLabel] = useState(null);
  const [showTitleConfig, setShowTitleConfig] = useState(false);
  const [rpgReturnState, setRpgReturnState] = useState(null);
  const [fadeClass, setFadeClass] = useState("fade-in");

  // 設定値（localStorage から復元）
  const [config, setConfig] = useState(() => {
    const saved = loadPersistedConfig();
    return saved || { textSpeed: 30, volumeMaster: 1.0, volumeBGM: 0.8, volumeSE: 1.0, screenSize: "1280×720" };
  });

  // 設定変更時に永続化
  useEffect(() => {
    persistConfig(config);
  }, [config]);

  // 起動時: game-data.json があればゲームモードで直接タイトルへ
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(GAME_MODE_FILE);
        if (res.ok) {
          const data = await res.json();
          if (data && data.script) {
            setProject({ ...data, id: "__game__" });
            setGameMode(true);
            setScreen("title");
            return;
          }
        }
      } catch {}
      // 通常モード（エディタ付き）
      setScreen("projects");
    })();
  }, []);

  // 画面サイズに応じたコンテナスタイル + Electronウィンドウリサイズ
  const gameContainerStyle = useMemo(() => {
    const preset = SCREEN_PRESETS.find((p) => p.label === config.screenSize);
    const maxW = preset ? preset.width : 1280;
    // Electron環境ならウィンドウサイズも変更
    if (preset && window.electronAPI?.resizeWindow) {
      window.electronAPI.resizeWindow(preset.width, preset.height);
    }
    return { ...GAME_CONTAINER_STYLE, maxWidth: maxW };
  }, [config.screenSize]);

  // 画面遷移（フェード付き）
  const navigateTo = useCallback((nextScreen) => {
    setFadeClass("fade-out");
    setTimeout(() => {
      setScreen(nextScreen);
      setFadeClass("fade-in");
    }, 200);
  }, []);

  // プロジェクト選択
  const handleSelectProject = useCallback(async (id) => {
    const p = await getProject(id);
    if (!p) return;
    setActiveProjectId(id);
    setProject(p);
    navigateTo("title");
  }, [navigateTo]);

  // プロジェクト一覧へ戻る（ゲームモードではアプリ終了）
  const backToProjects = useCallback(() => {
    if (gameMode) {
      handleExit();
      return;
    }
    setProject(null);
    navigateTo("projects");
  }, [navigateTo, gameMode]);

  // プロジェクト編集（プロジェクト管理画面から直接エディタへ）
  const handleEditProject = useCallback(async (id) => {
    const p = await getProject(id);
    if (!p) return;
    setActiveProjectId(id);
    setProject(p);
    navigateTo("editor");
  }, [navigateTo]);

  // アプリ終了
  const handleExit = useCallback(() => {
    if (window.electronAPI?.quitApp) {
      window.electronAPI.quitApp();
    } else {
      window.close();
    }
  }, []);

  const containerStyle = {
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#111",
  };

  // ローディング画面
  if (screen === "loading") {
    return (
      <div style={{ ...containerStyle, color: "#E8D4B0", fontSize: 14, fontFamily: "'Noto Serif JP', serif" }}>
        読み込み中...
      </div>
    );
  }

  // エディタ画面（ゲームモードでは非表示）
  if (screen === "editor" && project && !gameMode) {
    return (
      <EditorScreen
        onBack={() => navigateTo("projects")}
        initialScript={project.script}
        projectId={project.id}
        projectName={project.name}
        gameType={project.gameType}
      />
    );
  }

  return (
    <div style={containerStyle}>
      <div className={fadeClass} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* プロジェクト管理画面（ゲームモードでは非表示） */}
        {screen === "projects" && !gameMode && (
          <div style={{ width: "100%", height: "100vh" }}>
            <ProjectManager
              onSelectProject={handleSelectProject}
              onEditProject={handleEditProject}
              onExit={handleExit}
              onConfig={() => setShowTitleConfig(true)}
            />
          </div>
        )}

        {/* タイトル画面 */}
        {screen === "title" && project && (
          <div style={gameContainerStyle}>
            <TitleScreen
              title={project.name}
              onNewGame={() => {
                const gt = project.gameType || "novel";
                setStartLabel(null);
                navigateTo(gt === "rpg" ? "rpg" : gt === "minigame" ? "minigame" : "game");
              }}
              onContinue={() => {
                const gt = project.gameType || "novel";
                setStartLabel("__continue__");
                navigateTo(gt === "rpg" ? "rpg" : gt === "minigame" ? "minigame" : "game");
              }}
              onConfig={() => setShowTitleConfig(true)}
              onExit={backToProjects}
              onCGGallery={() => navigateTo("cg_gallery")}
              onSceneRecollection={() => navigateTo("scene_recollection")}
              hasSaveData={project.saves?.some((s) => s !== null)}
            />
          </div>
        )}

        {/* ゲーム画面 */}
        {screen === "game" && project && (
          <div style={gameContainerStyle}>
            <NovelEngine
              script={project.script}
              characters={project.characters}
              bgStyles={project.bgStyles}
              projectId={project.id}
              startLabel={startLabel}
              initialConfig={config}
              onConfigChange={(changes) => setConfig((prev) => ({ ...prev, ...changes }))}
              onBack={() => {
                setStartLabel(null);
                if (rpgReturnState) {
                  setScreen("rpg");
                } else {
                  navigateTo("title");
                }
              }}
            />
          </div>
        )}

        {/* RPG 画面 */}
        {screen === "rpg" && project && (
          <div style={gameContainerStyle}>
            <RPGEngine
              maps={project.maps || []}
              battleData={project.battleData || {}}
              customTiles={project.customTiles || []}
              projectId={project.id}
              initialState={rpgReturnState}
              onBack={() => { setRpgReturnState(null); navigateTo("title"); }}
              onScriptEvent={(label, rpgState) => {
                setRpgReturnState(rpgState);
                setStartLabel(label);
                setScreen("game");
              }}
            />
          </div>
        )}

        {/* ミニゲーム画面 */}
        {screen === "minigame" && project && (
          <div style={gameContainerStyle}>
            <MinigameRunner
              type={project.minigames?.[0]?.type || "quiz"}
              config={project.minigames?.[0] || {}}
              onResult={() => navigateTo("title")}
              onBack={() => navigateTo("title")}
            />
          </div>
        )}

        {/* CG ギャラリー */}
        {screen === "cg_gallery" && project && (
          <div style={gameContainerStyle}>
            <CGGallery
              catalog={project.cgCatalog || []}
              onBack={() => navigateTo("title")}
            />
          </div>
        )}

        {/* シーン回想 */}
        {screen === "scene_recollection" && project && (
          <div style={gameContainerStyle}>
            <SceneRecollection
              catalog={project.sceneCatalog || []}
              onPlayScene={(label) => {
                setStartLabel(label);
                navigateTo("game");
              }}
              onBack={() => navigateTo("title")}
            />
          </div>
        )}
      </div>

      {/* 設定オーバーレイ（fadeClass の外に配置 — CSSアニメーション内だと position:fixed が壊れる） */}
      {showTitleConfig && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.5)",
        }}
          onClick={() => setShowTitleConfig(false)}
        >
          <div style={{
            width: "100%", maxWidth: 600,
            background: COLORS.bgOverlay,
            border: `1px solid ${COLORS.goldBorder}`,
            borderRadius: 6,
            padding: "24px 32px",
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <ConfigView
              textSpeed={config.textSpeed}
              volumeMaster={config.volumeMaster}
              volumeBGM={config.volumeBGM}
              volumeSE={config.volumeSE}
              screenSize={config.screenSize}
              dispatch={(action) => {
                if (action.type === "TOGGLE_CONFIG") {
                  setShowTitleConfig(false);
                  return;
                }
                if (action.type === "SET_SCREEN_SIZE") {
                  setConfig((prev) => ({ ...prev, screenSize: action.payload }));
                  return;
                }
                const map = {
                  SET_TEXT_SPEED: "textSpeed",
                  SET_VOLUME_MASTER: "volumeMaster",
                  SET_VOLUME_BGM: "volumeBGM",
                  SET_VOLUME_SE: "volumeSE",
                };
                const key = map[action.type];
                if (key) setConfig((prev) => ({ ...prev, [key]: action.payload }));
              }}
            />
          </div>
        </div>
      )}

      {/* 画面遷移アニメーション CSS */}
      <style>{`
        .fade-in { animation: appFadeIn 0.3s ease-out; }
        .fade-out { opacity: 0; transition: opacity 0.2s ease-in; }
        @keyframes appFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

export default App;
