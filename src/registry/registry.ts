/**
 * Widget Registry — maps a namespaced widget `type` to a Vue component loader.
 *
 * This is what makes widgets OPEN: first-party widgets register a builtin
 * loader; third-party widgets either register here or are loaded dynamically
 * from a manifest `entry: { kind: "esm", source }`. The renderer never hard-codes
 * widget types.
 */

import type { Component } from "vue";

export type WidgetLoader = () => Component | Promise<Component>;

const registry = new Map<string, WidgetLoader>();

export function registerWidget(type: string, loader: WidgetLoader): void {
  registry.set(type, loader);
}

export function resolveWidget(type: string): WidgetLoader | undefined {
  return registry.get(type);
}

export function registeredTypes(): string[] {
  return [...registry.keys()];
}
