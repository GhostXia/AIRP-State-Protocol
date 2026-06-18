/**
 * Capability consent gate (PLAN task E).
 *
 * The host secures itself: a third-party (esm) widget must be explicitly
 * approved by the user before it loads, and only the capabilities it declared
 * are granted. First-party (builtin) widgets need no consent. We do NOT audit
 * the widget's code — installing/approving it is the user's choice (SECURITY.md).
 *
 * Pure-ish + reactive: grants live in a reactive Set so the host re-renders when
 * the user approves; the decision functions are unit-tested in CI.
 */

import { reactive } from "vue";
import type { WidgetDef, Capability } from "./../protocol/types";

const granted = reactive(new Set<string>());

export function isGranted(type: string): boolean {
  return granted.has(type);
}
export function grant(type: string): void {
  granted.add(type);
}
export function revoke(type: string): void {
  granted.delete(type);
}
export function clearGrants(): void {
  granted.clear();
}

/** Third-party (esm) widgets need explicit consent; builtin ones do not. */
export function needsConsent(manifest: Pick<WidgetDef, "entry">): boolean {
  return manifest.entry?.kind === "esm";
}

/** May this widget mount now? Builtin: always. esm: only once granted. */
export function canMount(manifest: Pick<WidgetDef, "type" | "entry">): boolean {
  if (!needsConsent(manifest)) return true;
  return isGranted(manifest.type);
}

/** Capabilities effectively available to the widget (none until it may mount). */
export function effectiveCapabilities(
  manifest: Pick<WidgetDef, "type" | "entry" | "capabilities">,
): Capability[] {
  if (!canMount(manifest)) return [];
  return manifest.capabilities ?? [];
}
