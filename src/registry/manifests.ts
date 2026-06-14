/**
 * Manifest registry — maps a widget `type` to its published manifest (WidgetDef).
 *
 * Lets the UI know a widget's `entry` (how to load it), props/state schema, and
 * requested capabilities. `registerEsmWidgetsFromManifests` wires any
 * `entry.kind === "esm"` manifest into the component registry so third-party
 * widgets load dynamically from their `source`.
 */

import type { WidgetDef } from "../protocol/types";
import { registerEsmWidget } from "./registry";

const manifests = new Map<string, WidgetDef>();

export function registerManifest(manifest: WidgetDef): void {
  manifests.set(manifest.type, manifest);
}

export function getManifest(type: string): WidgetDef | undefined {
  return manifests.get(type);
}

export function allManifests(): WidgetDef[] {
  return [...manifests.values()];
}

/**
 * Record manifests and auto-register their esm widgets into the component
 * registry. `importer` is injectable for testing.
 */
export function registerEsmWidgetsFromManifests(
  list: WidgetDef[],
  importer?: (s: string) => Promise<unknown>,
): void {
  for (const manifest of list) {
    registerManifest(manifest);
    if (manifest.entry?.kind === "esm" && manifest.entry.source) {
      registerEsmWidget(manifest.type, manifest.entry.source, importer);
    }
  }
}
