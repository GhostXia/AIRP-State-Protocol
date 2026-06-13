/**
 * Reactive state store. Holds one value per protocol "scope" (a widget instance
 * id, "session", or dotted path). Updated from downstream `state` messages:
 * `set` replaces a scope, `patch` applies an RFC 6902 subset in place.
 *
 * Performance contract: the full history lives in the Gateway. This store only
 * holds the live windowed slice the UI currently renders.
 */

import { reactive } from "vue";
import type { Json, JsonPatch, PatchOp } from "../protocol/types";

export const stateStore = reactive<Record<string, Json>>({});

export function setState(scope: string, value: Json): void {
  stateStore[scope] = value;
}

export function patchState(scope: string, patch: JsonPatch): void {
  if (stateStore[scope] == null || typeof stateStore[scope] !== "object") {
    stateStore[scope] = {};
  }
  const root = stateStore[scope];
  for (const op of patch) applyOp(root, op);
}

function pointerTokens(path: string): string[] {
  return path
    .split("/")
    .slice(1)
    .map((t) => t.replace(/~1/g, "/").replace(/~0/g, "~"));
}

// RFC 6902 subset: add / remove / replace (covers what the protocol's patches
// need). move/copy/test are intentionally not implemented in the scaffold.
function applyOp(root: Json, op: PatchOp): void {
  const toks = pointerTokens(op.path);
  if (toks.length === 0) return;

  let parent: any = root;
  for (let i = 0; i < toks.length - 1; i++) {
    parent = parent?.[toks[i]];
    if (parent == null) return;
  }
  const key = toks[toks.length - 1];

  switch (op.op) {
    case "add":
      if (Array.isArray(parent)) {
        if (key === "-") parent.push(op.value);
        else parent.splice(Number(key), 0, op.value);
      } else {
        parent[key] = op.value;
      }
      break;
    case "replace":
      parent[key] = op.value;
      break;
    case "remove":
      if (Array.isArray(parent)) parent.splice(Number(key), 1);
      else delete parent[key];
      break;
    default:
      // move / copy / test: not needed by the scaffold
      break;
  }
}
