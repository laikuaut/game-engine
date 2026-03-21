import { useState, useCallback } from "react";
import ProjectManager from "./project/ProjectManager";
import TitleScreen from "./components/TitleScreen";
import NovelEngine from "./engine/NovelEngine";
import EditorScreen from "./editor/EditorScreen";
import CGGallery from "./components/CGGallery";
import SceneRecollection from "./components/SceneRecollection";
import RPGEngine from "./rpg/RPGEngine";
import MinigameRunner from "./minigame/MinigameRunner";
import { getProject, setActiveProjectId } from "./project/ProjectStore";

// 画面状態
function App() {
  const [screen, setScreen] = useState("projects");
  const [project, setProject] = useState(null);

  // プロジェクト選択
  const handleSelectProject = useCallback(async (id) => {
    const p = await getProject(id);
    if (!p) return;
    setActiveProjectId(id);
    setProject(p);
    setScreen("title");
  }, []);

  // プロジェクト一覧へ戻る
  const backToProjects = useCallback(() => {
    setProject(null);
    setScreen("projects");
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
        onBack={() => setScreen("title")}
        initialScript={project.script}
        projectId={project.id}
        projectName={project.name}
      />
    );
  }

  return (
    <div style={containerStyle}>
      {/* プロジェクト管理画面 */}
      {screen === "projects" && (
        <ProjectManager onSelectProject={handleSelectProject} />
      )}

      {/* タイトル画面 */}
      {screen === "title" && project && (
        <TitleScreen
          title={project.name}
          onNewGame={() => {
            const gt = project.gameType || "novel";
            setScreen(gt === "rpg" ? "rpg" : gt === "minigame" ? "minigame" : "game");
          }}
          onContinue={() => {
            const gt = project.gameType || "novel";
            setScreen(gt === "rpg" ? "rpg" : gt === "minigame" ? "minigame" : "game");
          }}
          onEditor={() => setScreen("editor")}
          onBack={backToProjects}
          onCGGallery={() => setScreen("cg_gallery")}
          onSceneRecollection={() => setScreen("scene_recollection")}
          hasSaveData={project.saves?.some((s) => s !== null)}
        />
      )}

      {/* ゲーム画面 */}
      {screen === "game" && project && (
        <NovelEngine
          script={project.script}
          characters={project.characters}
          bgStyles={project.bgStyles}
          projectId={project.id}
          onBack={() => setScreen("title")}
        />
      )}

      {/* RPG 画面 */}
      {screen === "rpg" && project && (
        <div style={{ ...containerStyle, position: "relative" }}>
          <div style={{
            width: "100%", maxWidth: 1920, aspectRatio: "16/9",
            position: "relative", overflow: "hidden", borderRadius: 4,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}>
            <RPGEngine
              maps={project.maps || []}
              battleData={project.battleData || {}}
              onBack={() => setScreen("title")}
            />
          </div>
        </div>
      )}

      {/* ミニゲーム画面 */}
      {screen === "minigame" && project && (
        <div style={{ ...containerStyle, position: "relative" }}>
          <div style={{
            width: "100%", maxWidth: 1920, aspectRatio: "16/9",
            position: "relative", overflow: "hidden", borderRadius: 4,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}>
            <MinigameRunner
              type={project.minigames?.[0]?.type || "quiz"}
              config={project.minigames?.[0] || {}}
              onResult={(result) => {
                console.log("ミニゲーム結果:", result);
                setScreen("title");
              }}
              onBack={() => setScreen("title")}
            />
          </div>
        </div>
      )}

      {/* CG ギャラリー */}
      {screen === "cg_gallery" && project && (
        <div style={{ ...containerStyle, position: "relative" }}>
          <div style={{
            width: "100%", maxWidth: 1920, aspectRatio: "16/9",
            position: "relative", overflow: "hidden", borderRadius: 4,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}>
            <CGGallery
              catalog={project.cgCatalog || []}
              onBack={() => setScreen("title")}
            />
          </div>
        </div>
      )}

      {/* シーン回想 */}
      {screen === "scene_recollection" && project && (
        <div style={{ ...containerStyle, position: "relative" }}>
          <div style={{
            width: "100%", maxWidth: 1920, aspectRatio: "16/9",
            position: "relative", overflow: "hidden", borderRadius: 4,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}>
            <SceneRecollection
              catalog={project.sceneCatalog || []}
              onPlayScene={(label) => {
                // TODO: ラベルから開始するゲームモード
                setScreen("game");
              }}
              onBack={() => setScreen("title")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
