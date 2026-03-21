import { lazy, Suspense } from "react";
import DEFAULT_CHARA_DATA from "../data/characters";

const Live2DCharacter = lazy(() => import("./Live2DCharacter"));

const POS_MAP = { left: "20%", center: "50%", right: "80%" };

const ANIM_STYLES = {
  entering: { animation: "charaEnter 500ms ease-out forwards" },
  idle: {},
  exiting: { animation: "charaExit 400ms ease-in forwards" },
  expression_change: { animation: "charaReact 300ms ease-out" },
};

export default function Character({ id, position, expression, animState, charaData }) {
  const allData = charaData || DEFAULT_CHARA_DATA;
  const data = allData[id];
  if (!data) return null;

  // Live2D モデルがある場合
  if (data.live2dModel) {
    return (
      <Suspense fallback={null}>
        <Live2DCharacter
          modelPath={`./assets/chara/${data.live2dModel}`}
          position={position}
          expression={expression}
          scale={data.live2dScale || 0.25}
          animState={animState}
        />
      </Suspense>
    );
  }

  // 通常の絵文字ベースキャラクター
  const anim = ANIM_STYLES[animState] || {};

  return (
    <div
      style={{
        position: "absolute",
        bottom: "22%",
        left: POS_MAP[position] || "50%",
        transform: "translateX(-50%)",
        zIndex: 5,
        textAlign: "center",
        ...anim,
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
        {/* 立ち絵画像がある場合 */}
        {data.sprites?.[expression] ? (
          <img
            src={`./assets/chara/${data.sprites[expression]}`}
            alt={data.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <>
            <span style={{ fontSize: 48 }}>
              {data.expressions[expression] || "🙂"}
            </span>
            <span
              style={{
                fontSize: 11, color: "#fff", marginTop: 8,
                background: "rgba(0,0,0,0.4)", padding: "2px 10px", borderRadius: 10,
              }}
            >
              {data.name}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
              {expression}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
