/**
 * AgentBus client — the UI's view of the State Protocol transport.
 *
 * The real implementation talks to AIRP-Gateway over Tauri IPC or HTTP/SSE.
 * `MockBus` below emits a sample session so the scaffold renders without a
 * backend; swap it for the real bus when wiring the Tauri core.
 */

import type { Envelope, Blueprint } from "./types";

export type EnvelopeHandler = (env: Envelope) => void;

export interface AgentBus {
  /** UI -> bus: send one upstream envelope (intent/subscribe/hello/ack). */
  dispatch(env: Envelope): void | Promise<void>;
  /** bus -> UI: subscribe to downstream envelopes. Returns an unsubscribe fn. */
  subscribe(handler: EnvelopeHandler): () => void;
}

let seq = 0;
function env(src: string, body: Envelope["body"]): Envelope {
  return { v: 1, id: `m${++seq}`, ts: Date.now(), src, body };
}

const SAMPLE_BLUEPRINT: Blueprint = {
  version: "bp-sample",
  profile: "rp:demo",
  theme: { name: "cyberpunk", tokens: { accent: "#00e5ff" } },
  layout: {
    type: "dock",
    areas: [
      { id: "main", widgets: ["w-chat"] },
      { id: "sidebar", widgets: ["w-emotion", "w-clock"], props: { side: "right" } },
      { id: "tools", widgets: ["w-inventory", "w-quest"], props: { side: "right" } },
    ],
  },
  widgets: [
    { id: "w-chat", type: "core.chat", props: { title: "对话" }, state: "w-chat" },
    { id: "w-emotion", type: "core.emotion", state: "w-emotion", capabilities: ["read:state"] },
    { id: "w-clock", type: "core.clock", state: "w-emotion" },
    { id: "w-inventory", type: "core.inventory", state: "w-inventory", capabilities: ["read:state"] },
    { id: "w-quest", type: "core.quest", state: "w-quest", capabilities: ["read:state"] },
  ],
};

/** A fake bus that pushes a blueprint, seed state, and a delayed patch. */
export class MockBus implements AgentBus {
  private handlers = new Set<EnvelopeHandler>();

  dispatch(e: Envelope): void {
    if (e.body.kind === "intent") {
      // Echo a chat intent back into the chat state as an assistant line.
      if (e.body.name === "chat.send") {
        const text = (e.body.params as unknown as { text?: string } | undefined)?.text ?? "";
        this.emit(
          env("agent:narrator", {
            kind: "state",
            scope: "w-chat",
            op: "patch",
            patch: [
              { op: "add", path: "/messages/-", value: { id: `u${seq}`, role: "user", text } },
              { op: "add", path: "/messages/-", value: { id: `a${seq}`, role: "assistant", text: "（示例回应）" } },
            ],
          }),
        );
      }
    }
  }

  subscribe(handler: EnvelopeHandler): () => void {
    this.handlers.add(handler);
    // Prime the session on the next tick so subscribers are attached.
    queueMicrotask(() => {
      this.emit(env("gateway", { kind: "blueprint", op: "set", blueprint: SAMPLE_BLUEPRINT }));
      this.emit(
        env("gateway", {
          kind: "state",
          scope: "w-chat",
          op: "set",
          state: { messages: [{ id: "s1", role: "narrator", text: "你睁开眼，霓虹灯在窗外闪烁。" }] },
        }),
      );
      this.emit(env("gateway", { kind: "state", scope: "w-emotion", op: "set", state: { emotion: 60, label: "平静" } }));
      this.emit(
        env("gateway", {
          kind: "state",
          scope: "w-inventory",
          op: "set",
          state: { items: [{ id: "i1", name: "钥匙", qty: 1, icon: "🔑" }, { id: "i2", name: "信用点", qty: 250, icon: "¤" }] },
        }),
      );
      this.emit(
        env("gateway", {
          kind: "state",
          scope: "w-quest",
          op: "set",
          state: { quests: [{ id: "q1", title: "找到接头人", status: "active" }, { id: "q2", title: "抵达旧城区", status: "done" }] },
        }),
      );
      setTimeout(() => {
        this.emit(env("agent:narrator", { kind: "state", scope: "w-emotion", op: "patch", patch: [{ op: "replace", path: "/emotion", value: 80 }, { op: "replace", path: "/label", value: "心动" }] }));
      }, 1500);
    });
    return () => this.handlers.delete(handler);
  }

  private emit(e: Envelope): void {
    for (const h of this.handlers) h(e);
  }
}
