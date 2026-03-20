export default function ChoiceOverlay({ options, onChoice }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onChoice(opt)}
          style={{
            background: "rgba(20,20,35,0.9)",
            border: "1px solid rgba(200,180,140,0.4)",
            color: "#E8D4B0",
            padding: "14px 48px",
            borderRadius: 4,
            fontSize: 16,
            cursor: "pointer",
            minWidth: 280,
            transition: "all 0.25s",
            letterSpacing: 2,
            fontFamily: "'Noto Serif JP', serif",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(200,180,140,0.2)";
            e.target.style.borderColor = "#E8D4B0";
            e.target.style.transform = "scale(1.03)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "rgba(20,20,35,0.9)";
            e.target.style.borderColor = "rgba(200,180,140,0.4)";
            e.target.style.transform = "scale(1)";
          }}
        >
          {opt.text}
        </button>
      ))}
    </div>
  );
}
