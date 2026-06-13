/**
 * Widget Registry — maps a namespaced widget `type` to its implementation.
 *
 * Two kinds are supported so authors are not constrained to Vue:
 *  - `vue`    — a native Vue component (first-party, tight integration)
 *  - `module` — a framework-agnostic {@link WidgetModule} (any technology)
 *
 * The renderer never hard-codes widget types; it looks them up here.
 */

import type { Component } from "vue";
import type { WidgetModule } from "./widget-module";

export type RegisteredWidget =
  | { kind: "vue"; load: () => Component | Promise<Component> }
  | { kind: "module"; load: () => WidgetModule | Promise<WidgetModule> };

const registry = new Map<string, RegisteredWidget>();

export function registerWidget(type: string, widget: RegisteredWidget): void {
  registry.set(type, widget);
}

/** Register a native Vue-component widget. */
export function registerVueWidget(
  type: string,
  load: () => Component | Promise<Component>,
): void {
  registry.set(type, { kind: "vue", load });
}

/** Register a framework-agnostic module widget. */
export function registerModuleWidget(
  type: string,
  load: () => WidgetModule | Promise<WidgetModule>,
): void {
  registry.set(type, { kind: "module", load });
}

export function resolveWidget(type: string): RegisteredWidget | undefined {
  return registry.get(type);
}

export function registeredTypes(): string[] {
  return [...registry.keys()];
}
