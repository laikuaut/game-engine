import { useState, useEffect } from "react";
import { BG_STYLES as DEFAULT_BG_STYLES } from "../data/config";

export default function Background({ currentBg, prevBg, bgTransition, bgTransitionType, bgTransitionTime, bgStyles }) {
  const styles = bgStyles || DEFAULT_BG_STYLES;
  const currentStyle = styles[currentBg] || Object.values(styles)[0] || {};
  const prevStyle = prevBg ? (styles[prevBg] || {}) : null;
  const time = bgTransitionTime || 800;
  const type = bgTransitionType || "fade";

  // wipe / slide 用のアニメーション状態
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    if (!bgTransition) { setAnimProgress(0); return; }
    if (type === "wipe_left" || type === "wipe_right" || type === "slide_left" || type === "slide_right") {
      // requestAnimationFrame ベースのアニメーション
      const start = performance.now();
      let raf;
      const frame = (now) => {
        const p = Math.min(1, (now - start) / time);
        setAnimProgress(p);
        if (p < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    }
  }, [bgTransition, type, time]);

  // none: 即座に切替
  if (type === "none" || !bgTransition) {
    return (
      <div style={{ ...currentStyle, position: "absolute", inset: 0, zIndex: 0 }}>
        <BgLabel name={currentBg} />
      </div>
    );
  }

  // crossfade: 2枚重ね
  if (type === "crossfade" || type === "fade") {
    return (
      <>
        {prevStyle && (
          <div style={{
            ...prevStyle, position: "absolute", inset: 0, zIndex: 0,
            transition: `opacity ${time}ms ease`,
            opacity: bgTransition ? 1 : 0,
          }} />
        )}
        <div style={{
          ...currentStyle, position: "absolute", inset: 0, zIndex: 1,
          transition: `opacity ${time}ms ease`,
          opacity: bgTransition ? 0 : 1,
        }}>
          <BgLabel name={currentBg} />
        </div>
      </>
    );
  }

  // wipe_left / wipe_right
  if (type === "wipe_left" || type === "wipe_right") {
    const clipNew = type === "wipe_left"
      ? `inset(0 ${100 - animProgress * 100}% 0 0)`
      : `inset(0 0 0 ${100 - animProgress * 100}%)`;
    return (
      <>
        {prevStyle && (
          <div style={{ ...prevStyle, position: "absolute", inset: 0, zIndex: 0 }} />
        )}
        <div style={{
          ...currentStyle, position: "absolute", inset: 0, zIndex: 1,
          clipPath: clipNew,
        }}>
          <BgLabel name={currentBg} />
        </div>
      </>
    );
  }

  // slide_left / slide_right
  if (type === "slide_left" || type === "slide_right") {
    const dir = type === "slide_left" ? -1 : 1;
    const prevOffset = dir * animProgress * 100;
    const newOffset = dir * (animProgress - 1) * 100;
    return (
      <>
        {prevStyle && (
          <div style={{
            ...prevStyle, position: "absolute", inset: 0, zIndex: 0,
            transform: `translateX(${prevOffset}%)`,
          }} />
        )}
        <div style={{
          ...currentStyle, position: "absolute", inset: 0, zIndex: 1,
          transform: `translateX(${newOffset}%)`,
        }}>
          <BgLabel name={currentBg} />
        </div>
      </>
    );
  }

  // fallback: 基本フェード
  return (
    <div style={{
      ...currentStyle, position: "absolute", inset: 0, zIndex: 0,
      transition: `all ${time}ms ease-in-out`,
      opacity: bgTransition ? 0.3 : 1,
    }}>
      <BgLabel name={currentBg} />
    </div>
  );
}

function BgLabel({ name }) {
  return (
    <div style={{
      position: "absolute", bottom: 12, left: 16,
      fontSize: 11, color: "rgba(255,255,255,0.35)",
      fontFamily: "monospace", letterSpacing: 1,
    }}>
      BG: {name}
    </div>
  );
}
