import { ACTION } from "./constants";
import { resolveTarget } from "./commands";

// 単一条件を評価
export function evaluateCondition(condition, gameState, unlockStore) {
  switch (condition.type) {
    case "flag": {
      const val = !!gameState.flags[condition.key];
      const expected = condition.value !== false;
      return condition.operator === "!=" ? val !== expected : val === expected;
    }
    case "variable": {
      const val = gameState.variables[condition.key] || 0;
      const cmp = Number(condition.value) || 0;
      switch (condition.operator) {
        case "==": return val === cmp;
        case "!=": return val !== cmp;
        case ">":  return val > cmp;
        case "<":  return val < cmp;
        case ">=": return val >= cmp;
        case "<=": return val <= cmp;
        default:   return val === cmp;
      }
    }
    case "item_check": {
      const count = gameState.items[condition.key] || 0;
      const req = Number(condition.value) || 1;
      switch (condition.operator) {
        case ">=": return count >= req;
        case "==": return count === req;
        case "<=": return count <= req;
        case ">":  return count > req;
        case "<":  return count < req;
        default:   return count >= req;
      }
    }
    case "scene_viewed":
      return unlockStore ? unlockStore.isUnlocked("scene", condition.key) : false;
    case "choice_made": {
      const history = gameState.choiceHistory || [];
      return history.some(
        (h) => h.label === condition.key && h.choice === condition.value
      );
    }
    default:
      console.warn("[eventEvaluator] 未知の条件タイプ:", condition.type);
      return false;
  }
}

// イベント全体を評価（全条件AND結合）
export function evaluateEvent(event, gameState, unlockStore) {
  if (!event.enabled) return false;
  if (!event.conditions || event.conditions.length === 0) return true;
  return event.conditions.every((c) => evaluateCondition(c, gameState, unlockStore));
}

// イベントアクションを実行
export function executeEventActions(event, dispatch, labelMap) {
  if (!event.actions) return null;
  let jumpTarget = null;

  for (const action of event.actions) {
    switch (action.type) {
      case "set_flag":
        dispatch({
          type: ACTION.SET_FLAG,
          payload: { key: action.key, value: action.value !== false },
        });
        break;
      case "set_variable":
        dispatch({
          type: ACTION.SET_VARIABLE,
          payload: {
            key: action.key,
            value: Number(action.value) || 0,
            operator: action.operator || "=",
          },
        });
        break;
      case "add_item":
        dispatch({
          type: ACTION.ADD_ITEM,
          payload: { id: action.id, amount: Number(action.amount) || 1 },
        });
        break;
      case "remove_item":
        dispatch({
          type: ACTION.REMOVE_ITEM,
          payload: { id: action.id, amount: Number(action.amount) || 1 },
        });
        break;
      case "jump_label": {
        const target = resolveTarget(action.label, labelMap);
        if (target >= 0) jumpTarget = target;
        break;
      }
      case "show_message":
        // NovelEngine側でダイアログとして処理するための特殊戻り値
        dispatch({
          type: ACTION.SET_SPEAKER,
          payload: action.speaker || "",
        });
        dispatch({
          type: ACTION.SET_DISPLAYED_TEXT,
          payload: action.message || "",
        });
        break;
      case "play_bgm":
        dispatch({
          type: ACTION.SET_BGM,
          payload: { name: action.name, volume: action.volume },
        });
        break;
      case "play_se":
        dispatch({
          type: ACTION.SET_SE,
          payload: { name: action.name, volume: action.volume },
        });
        break;
      case "change_bg":
        dispatch({
          type: ACTION.SET_BG,
          payload: { src: action.src, transition: action.transition || "fade" },
        });
        break;
      case "unlock_cg":
        // unlockFn は呼び出し元から渡す必要があるが、ここでは dispatch で通知
        break;
      case "unlock_scene":
        break;
      default:
        console.warn("[eventEvaluator] 未知のアクションタイプ:", action.type);
    }
  }
  return jumpTarget;
}
