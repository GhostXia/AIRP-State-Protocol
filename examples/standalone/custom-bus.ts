/**
 * Standalone use #2 — the UI's bus contract ALONE.
 *
 * The UI runs on ANY `AgentBus` — not just AIRP-Gateway, not just MockBus. The
 * contract is tiny: `dispatch` + `subscribe`. Here is a complete custom bus in a
 * dozen lines, proving you can drive the UI from your own backend.
 */

import type { AgentBus, EnvelopeHandler } from "../../src/protocol/bus";
import type { Envelope } from "../../bindings/typescript/src/index";

/** A minimal bus that echoes every dispatched envelope back to subscribers. */
export class EchoBus implements AgentBus {
  private handlers = new Set<EnvelopeHandler>();

  dispatch(env: Envelope): void {
    for (const handler of this.handlers) handler(env);
  }

  subscribe(handler: EnvelopeHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}
