/**
 * Standalone use #3 — a single widget via the mount interface ALONE.
 *
 * A widget is just a `WidgetModule` (`mount` / `unmount`). No Vue, no other
 * components, no framework. Build the DOM however you like; it plugs into any
 * host that speaks the protocol.
 */

import type { WidgetModule, WidgetContext } from "../../src/registry/widget-module";

/** A tiny vanilla-DOM badge widget that shows `state.label`. */
export function createBadgeWidget(): WidgetModule {
  return {
    mount(el: HTMLElement, ctx: WidgetContext) {
      const span = document.createElement("span");
      span.className = "badge";
      const render = (state: unknown) => {
        span.textContent = String((state as { label?: string } | null)?.label ?? "");
      };
      render(ctx.getState());
      ctx.onState(render);
      el.append(span);
    },
  };
}
