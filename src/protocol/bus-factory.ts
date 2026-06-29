/**
 * Bus factory — picks the right {@link AgentBus} for the current environment
 * (PLAN task B, ②).
 *
 * Inside the Tauri shell the UI talks to the Rust core (and onward to
 * AIRP-Gateway) via {@link TauriBus}; everywhere else (web preview, vitest,
 * `vite dev` outside Tauri) it falls back to {@link MockBus} so the scaffold
 * renders with no backend.
 *
 * Detection uses the `__TAURI_INTERNALS__` global Tauri injects into the
 * webview. The factory is async because {@link createTauriTransport} dynamically
 * imports `@tauri-apps/api`, which only resolves inside the shell.
 */

import type { AgentBus } from "./bus";
import { MockBus } from "./bus";
import { TauriBus, createTauriTransport } from "./tauri-bus";

/** True when running inside a Tauri webview (the shell injects this global). */
export function isTauriEnvironment(): boolean {
  return typeof globalThis !== "undefined"
    && "__TAURI_INTERNALS__" in globalThis;
}

/**
 * Build the bus for this environment. Tauri shell → {@link TauriBus} over the
 * real IPC transport; otherwise → {@link MockBus}.
 *
 * The transport is only constructed when needed, so `@tauri-apps/api` is never
 * imported in vitest or a plain browser, keeping the mock path dependency-free.
 */
export async function createBus(): Promise<AgentBus> {
  if (isTauriEnvironment()) {
    const transport = await createTauriTransport();
    return new TauriBus(transport);
  }
  return new MockBus();
}
