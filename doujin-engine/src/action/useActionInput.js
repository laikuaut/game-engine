import { useEffect, useRef } from "react";

// アクションゲーム用の入力管理フック
export function useActionInput() {
  const inputRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    attack: false,
  });

  useEffect(() => {
    const keyMap = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
      " ": "jump",
      z: "attack",
      Z: "attack",
    };

    const onKeyDown = (e) => {
      if (e.repeat) return;
      const action = keyMap[e.key];
      if (action) {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current[action] = true;
      }
    };

    const onKeyUp = (e) => {
      const action = keyMap[e.key];
      if (action) {
        e.stopPropagation();
        inputRef.current[action] = false;
      }
    };

    // captureフェーズでNovelEngineより先にイベントを処理
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);

    // ゲームパッド対応（ポーリング）
    let gamepadRaf;
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads?.() || [];
      const gp = gamepads[0];
      if (gp) {
        const deadzone = 0.3;
        inputRef.current.left = gp.axes[0] < -deadzone || gp.buttons[14]?.pressed;
        inputRef.current.right = gp.axes[0] > deadzone || gp.buttons[15]?.pressed;
        inputRef.current.up = gp.axes[1] < -deadzone || gp.buttons[12]?.pressed;
        inputRef.current.down = gp.axes[1] > deadzone || gp.buttons[13]?.pressed;
        inputRef.current.jump = gp.buttons[0]?.pressed || gp.buttons[1]?.pressed;
        inputRef.current.attack = gp.buttons[2]?.pressed || gp.buttons[3]?.pressed;
      }
      gamepadRaf = requestAnimationFrame(pollGamepad);
    };
    gamepadRaf = requestAnimationFrame(pollGamepad);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      cancelAnimationFrame(gamepadRaf);
    };
  }, []);

  return inputRef;
}
