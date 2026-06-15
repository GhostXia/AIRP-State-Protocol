/**
 * Standalone use #1 — the protocol contract ALONE.
 *
 * No UI, no Gateway, no widgets. Just the State Protocol types/helpers, usable
 * in any TypeScript project. In an external project this import would be
 * `@airp/state-protocol`; here we point at the in-repo binding.
 */

import { envelope, isKind } from "../../bindings/typescript/src/index";
import type { Envelope } from "../../bindings/typescript/src/index";

/** Build a state-patch envelope using only the protocol. */
export function makeStatePatch(): Envelope {
  return envelope("m1", 1_718_200_000_000, "gateway", {
    kind: "state",
    scope: "w-emotion",
    op: "patch",
    patch: [{ op: "replace", path: "/emotion", value: 80 }],
  });
}

/** Read an envelope back, narrowing by kind — only the protocol. */
export function describeEnvelope(env: Envelope): string {
  if (isKind(env.body, "state")) return `state:${env.body.scope}`;
  return env.body.kind;
}
