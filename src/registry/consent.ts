/**
 * Capability consent gate (PLAN task E).
 *
 * The host secures itself: a third-party (esm) widget must be explicitly
 * approved by the user before it loads, and only the capabilities it declared
 * are granted. First-party (builtin) widgets need no consent. We do NOT audit
 * the widget's code — installing/approving it is the user's choice (SECURITY.md).
 *
 * Consent is bound to the widget's **identity** `{type, version, source}`, not
 * just its `type`: if a manifest later swaps its `source` or bumps `version`,
 * the old approval does NOT carry over and the user must re-consent.
 *
 * Reactive + unit-tested: grants live in a reactive Set so the host re-renders
 * when the user approves; the decision functions are covered in CI.
 */

import { reactive } from "vue";
import type { WidgetDef, Capability } from "./../protocol/types";

type ManifestId = Pick<WidgetDef, "type" | "version" | "entry">;
type ManifestCaps = ManifestId & Pick<WidgetDef, "capabilities">;

const granted = reactive(new Set<string>());

/** Identity a grant is bound to: type + version + (esm) source. */
function grantKey(m: ManifestId): string {
  const source = m.entry?.kind === "esm" ? m.entry.source ?? "" : "";
  return `${m.type}@${m.version}#${source}`;
}

export function isGranted(manifest: ManifestId): boolean {
  return granted.has(grantKey(manifest));
}
export function grant(manifest: ManifestId): void {
  granted.add(grantKey(manifest));
}
export function revoke(manifest: ManifestId): void {
  granted.delete(grantKey(manifest));
}
export function clearGrants(): void {
  granted.clear();
}

/** Third-party (esm) widgets need explicit consent; builtin ones do not. */
export function needsConsent(manifest: Pick<WidgetDef, "entry">): boolean {
  return manifest.entry?.kind === "esm";
}

/** May this widget mount now? Builtin: always. esm: only once this exact identity is granted. */
export function canMount(manifest: ManifestId): boolean {
  if (!needsConsent(manifest)) return true;
  return isGranted(manifest);
}

/** Capabilities effectively available to the widget (none until it may mount). */
export function effectiveCapabilities(manifest: ManifestCaps): Capability[] {
  if (!canMount(manifest)) return [];
  return manifest.capabilities ?? [];
}
