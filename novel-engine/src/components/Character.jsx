import DEFAULT_CHARA_DATA from "../data/characters";

const POS_MAP = { left: "20%", center: "50%", right: "80%" };

export default function Character({ id, position, expression, charaData }) {
  const allData = charaData || DEFAULT_CHARA_DATA;
  const data = allData[id];
  if (!data) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "22%",
        left: POS_MAP[position] || "50%",
        transform: "translateX(-50%)",
        zIndex: 5,
        textAlign: "center",
        animation: "fadeInUp 0.5s ease-out",
      }}
    >
      <div
        style={{
          width: 120,
          height: 200,
          borderRadius: "60px 60px 20px 20px",
          background: `linear-gradient(180deg, ${data.color}88, ${data.color}44)`,
          border: `2px solid ${data.color}99`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          backdropFilter: "blur(4px)",
          boxShadow: `0 8px 24px ${data.color}33`,
        }}
      >
        <span style={{ fontSize: 48 }}>
          {data.expressions[expression] || "🙂"}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#fff",
            marginTop: 8,
            background: "rgba(0,0,0,0.4)",
            padding: "2px 10px",
            borderRadius: 10,
          }}
        >
          {data.name}
        </span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
          {expression}
        </span>
      </div>
    </div>
  );
}
