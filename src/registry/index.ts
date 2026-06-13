/**
 * Built-in (first-party) widget registration.
 *
 * First-party widgets may be native Vue components or framework-agnostic
 * modules. Third-party widgets register their own namespaced types the same way
 * (or are loaded from a manifest `entry: { kind: "esm", source }`). See
 * CONTRIBUTING.md and docs/widget-authoring.md.
 */

import { registerVueWidget, registerModuleWidget } from "./registry";
import ChatWidget from "../widgets/ChatWidget.vue";
import EmotionWidget from "../widgets/EmotionWidget.vue";
import { createClockWidget } from "../widgets/clock.module";

export function registerBuiltins(): void {
  registerVueWidget("core.chat", () => ChatWidget);
  registerVueWidget("core.emotion", () => EmotionWidget);
  // A framework-agnostic (vanilla DOM) widget — proves authors aren't tied to Vue.
  registerModuleWidget("core.clock", () => createClockWidget());
}

export {
  registerWidget,
  registerVueWidget,
  registerModuleWidget,
  resolveWidget,
  registeredTypes,
} from "./registry";
