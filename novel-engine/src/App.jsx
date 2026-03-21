import { useState, useCallback, useEffect } from "react";
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
import { GAME_CONTAINER_STYLE, COLORS, loadPersistedConfig, persistConfig } from "./data/config";

// 画面状態
function App() {
  const [screen, setScreen] = useState("projects");
  const [project, setProject] = useState(null);
  const [startLabel, setStartLabel] = useState(null);
  const [showTitleConfig, setShowTitleConfig] = useState(false);
  const [rpgReturnState, setRpgReturnState] = useState(null); // RPG に戻るためのステート
  const [fadeClass, setFadeClass] = useState("fade-in");

  // 設定値（localStorage から復元）
  const [config, setConfig] = useState(() => {
    const saved = loadPersistedConfig();
    return saved || { textSpeed: 30, volumeMaster: 1.0, volumeBGM: 0.8, volumeSE: 1.0 };
  });

  // 設定変更時に永続化
  useEffect(() => {
    persistConfig(config);
  }, [config]);

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

  // プロジェクト一覧へ戻る
  const backToProjects = useCallback(() => {
    setProject(null);
    navigateTo("projects");
  }, [navigateTo]);

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

  // エディタ画面（フルスクリーン）
  if (screen === "editor" && project) {
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
        {/* プロジェクト管理画面 */}
        {screen === "projects" && (
          <ProjectManager
            onSelectProject={handleSelectProject}
            onEditProject={handleEditProject}
            onExit={handleExit}
          />
        )}

        {/* タイトル画面 */}
        {screen === "title" && project && (
          <>
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
            {/* タイトル画面上の設定オーバーレイ */}
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
                  position: "relative",
                }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ConfigView
                    textSpeed={config.textSpeed}
                    volumeMaster={config.volumeMaster}
                    volumeBGM={config.volumeBGM}
                    volumeSE={config.volumeSE}
                    dispatch={(action) => {
                      if (action.type === "TOGGLE_CONFIG") {
                        setShowTitleConfig(false);
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
          </>
        )}

        {/* ゲーム画面 */}
        {screen === "game" && project && (
          <NovelEngine
            script={project.script}
            characters={project.characters}
            bgStyles={project.bgStyles}
            projectId={project.id}
            startLabel={startLabel}
            initialConfig={config}
            onBack={() => {
            setStartLabel(null);
            if (rpgReturnState) {
              // ノベルシーン終了 → RPG マップに戻る
              setScreen("rpg");
            } else {
              navigateTo("title");
            }
          }}
          />
        )}

        {/* RPG 画面 */}
        {screen === "rpg" && project && (
          <div style={{ ...containerStyle, position: "relative" }}>
            <div style={GAME_CONTAINER_STYLE}>
              <RPGEngine
                maps={project.maps || []}
                battleData={project.battleData || {}}
                initialState={rpgReturnState}
                onBack={() => { setRpgReturnState(null); navigateTo("title"); }}
                onScriptEvent={(label, rpgState) => {
                  // RPG ステートを保持してノベルモードへ
                  setRpgReturnState(rpgState);
                  setStartLabel(label);
                  setScreen("game");
                }}
              />
            </div>
          </div>
        )}

        {/* ミニゲーム画面 */}
        {screen === "minigame" && project && (
          <div style={{ ...containerStyle, position: "relative" }}>
            <div style={GAME_CONTAINER_STYLE}>
              <MinigameRunner
                type={project.minigames?.[0]?.type || "quiz"}
                config={project.minigames?.[0] || {}}
                onResult={() => navigateTo("title")}
                onBack={() => navigateTo("title")}
              />
            </div>
          </div>
        )}

        {/* CG ギャラリー */}
        {screen === "cg_gallery" && project && (
          <div style={{ ...containerStyle, position: "relative" }}>
            <div style={GAME_CONTAINER_STYLE}>
              <CGGallery
                catalog={project.cgCatalog || []}
                onBack={() => navigateTo("title")}
              />
            </div>
          </div>
        )}

        {/* シーン回想 */}
        {screen === "scene_recollection" && project && (
          <div style={{ ...containerStyle, position: "relative" }}>
            <div style={GAME_CONTAINER_STYLE}>
              <SceneRecollection
                catalog={project.sceneCatalog || []}
                onPlayScene={(label) => {
                  setStartLabel(label);
                  navigateTo("game");
                }}
                onBack={() => navigateTo("title")}
              />
            </div>
          </div>
        )}
      </div>

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
