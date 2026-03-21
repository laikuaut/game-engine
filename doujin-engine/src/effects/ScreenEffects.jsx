import { useEffect, useState, useRef } from "react";

const DEFAULT_TIMES = {
  shake: 500,
  flash: 300,
  fadeout: 1000,
  fadein: 1000,
  whitefade: 1000,
};

export default function ScreenEffects({ effect, screenOverlay, onEffectEnd, containerRef }) {
  const [overlayStyle, setOverlayStyle] = useState({});
  const timerRef = useRef(null);
  const rafRef = useRef(null);

  // エフェクト実行
  useEffect(() => {
    if (!effect) return;

    const time = effect.time || DEFAULT_TIMES[effect.name] || 500;

    const cleanup = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    switch (effect.name) {
      case "shake":
        runShake(containerRef, effect.intensity || 8, time, () => {
          onEffectEnd();
        });
        break;

      case "flash": {
        const color = effect.color || "#fff";
        setOverlayStyle({
          background: color,
          opacity: 1,
          transition: `opacity ${time}ms ease-out`,
        });
        // 次フレームで opacity を 0 に（CSS transition が走る）
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setOverlayStyle((prev) => ({ ...prev, opacity: 0 }));
          });
        });
        timerRef.current = setTimeout(() => {
          setOverlayStyle({});
          onEffectEnd();
        }, time + 50);
        break;
      }

      case "fadeout": {
        const color = effect.color || "#000";
        setOverlayStyle({
          background: color,
          opacity: 0,
          transition: `opacity ${time}ms ease-in`,
        });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setOverlayStyle((prev) => ({ ...prev, opacity: 1 }));
          });
        });
        timerRef.current = setTimeout(() => {
          onEffectEnd();
        }, time + 50);
        break;
      }

      case "fadein": {
        setOverlayStyle({
          background: "#000",
          opacity: 1,
          transition: `opacity ${time}ms ease-out`,
        });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setOverlayStyle((prev) => ({ ...prev, opacity: 0 }));
          });
        });
        timerRef.current = setTimeout(() => {
          setOverlayStyle({});
          onEffectEnd();
        }, time + 50);
        break;
      }

      case "whitefade": {
        setOverlayStyle({
          background: "#fff",
          opacity: 0,
          transition: `opacity ${time}ms ease-in`,
        });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setOverlayStyle((prev) => ({ ...prev, opacity: 1 }));
          });
        });
        timerRef.current = setTimeout(() => {
          onEffectEnd();
        }, time + 50);
        break;
      }

      default:
        // 未対応エフェクトはスキップ
        onEffectEnd();
        break;
    }

    return cleanup;
  }, [effect]);

  // shake 実装
  function runShake(ref, intensity, duration, onEnd) {
    const el = ref?.current;
    if (!el) { onEnd(); return; }
    const start = performance.now();

    function frame(now) {
      const elapsed = now - start;
      if (elapsed >= duration) {
        el.style.transform = "";
        onEnd();
        return;
      }
      const progress = 1 - elapsed / duration;
      const x = (Math.random() - 0.5) * 2 * intensity * progress;
      const y = (Math.random() - 0.5) * 2 * intensity * progress;
      el.style.transform = `translate(${x}px, ${y}px)`;
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
  }

  // screenOverlay（fadeout 後の持続オーバーレイ）
  const persistentOverlay = screenOverlay && !effect ? {
    background: screenOverlay.color,
    opacity: screenOverlay.opacity,
  } : null;

  const showOverlay = effect || persistentOverlay;

  if (!showOverlay) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        pointerEvents: "none",
        ...(persistentOverlay || overlayStyle),
      }}
    />
  );
}
