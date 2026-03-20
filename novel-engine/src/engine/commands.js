import { CMD, ACTION } from "./constants";

// dialog / choice 以外のコマンドを連続処理し、次の dialog/choice の index を返す
export function processCommand(script, index, dispatch) {
  let i = index;
  while (i < script.length) {
    const cmd = script[i];
    if (!cmd) break;
    if (cmd.type === CMD.DIALOG || cmd.type === CMD.CHOICE) break;

    switch (cmd.type) {
      case CMD.BG:
        dispatch({ type: ACTION.SET_BG, payload: cmd.src });
        break;
      case CMD.BGM:
        dispatch({ type: ACTION.SET_BGM, payload: cmd.name });
        break;
      case CMD.SE:
        dispatch({ type: ACTION.SET_SE, payload: cmd.name });
        break;
      case CMD.CHARA:
        dispatch({
          type: ACTION.SET_CHARA,
          payload: { id: cmd.id, position: cmd.position, expression: cmd.expression },
        });
        break;
      case CMD.CHARA_MOD:
        dispatch({
          type: ACTION.MOD_CHARA,
          payload: { id: cmd.id, expression: cmd.expression },
        });
        break;
      case CMD.CHARA_HIDE:
        dispatch({ type: ACTION.REMOVE_CHARA, payload: cmd.id });
        break;
    }
    i++;
  }
  return i;
}
