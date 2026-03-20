import NovelEngine from "./engine/NovelEngine";

function App() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111",
      }}
    >
      <NovelEngine />
    </div>
  );
}

export default App;
