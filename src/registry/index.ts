/**
 * Built-in (first-party) widget registration.
 *
 * To add a first-party widget: create the component under `src/widgets/` and
 * register it here under its `core.*` type. Third-party widgets live in their
 * own packages and register their own namespaced types (see CONTRIBUTING.md).
 */

import { registerWidget } from "./registry";
import ChatWidget from "../widgets/ChatWidget.vue";
import EmotionWidget from "../widgets/EmotionWidget.vue";

export function registerBuiltins(): void {
  registerWidget("core.chat", () => ChatWidget);
  registerWidget("core.emotion", () => EmotionWidget);
}

export { registerWidget, resolveWidget, registeredTypes } from "./registry";
