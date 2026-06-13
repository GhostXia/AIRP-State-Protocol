/**
 * AIRP State Protocol — TypeScript binding.
 *
 * Wire types for an AIRP UI (Vue/React) talking to an AgentBus implementation
 * (e.g. AIRP-Gateway). The on-the-wire contract is defined by
 * `schema/airp-state-protocol.schema.json`; these types mirror it 1:1 and match
 * the Rust binding in `bindings/rust`.
 *
 * Transport-agnostic: the same envelopes flow over Tauri IPC, HTTP/SSE, or
 * WebSocket.
 */

/** Current protocol version (the `v` field on every {@link Envelope}). */
export const PROTOCOL_VERSION = 1 as const;

/** Arbitrary JSON value. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** Every message on the wire is an `Envelope`. */
export interface Envelope {
  /** Protocol version. Always {@link PROTOCOL_VERSION}. */
  v: 1;
  /** Unique message id (UUID recommended). */
  id: string;
  /** Creation time, epoch milliseconds. */
  ts: number;
  /** Origin: `"ui"`, `"gateway"`, or `"agent:<name>"`. */
  src: string;
  /** The tagged message body. */
  body: Body;
}

/** Message body, discriminated by `kind`. */
export type Body =
  // ---- downstream: gateway -> ui ----
  | BlueprintMsg
  | StateMsg
  | EventMsg
  | ErrorMsg
  // ---- upstream: ui -> gateway ----
  | IntentMsg
  | SubscribeMsg
  | UnsubscribeMsg
  | HelloMsg
  | AckMsg;

/** Whether a `blueprint`/`state` message carries a full value or a patch. */
export type SetOrPatch = "set" | "patch";

/** DOWNSTREAM. Set or patch the UI blueprint. */
export interface BlueprintMsg {
  kind: "blueprint";
  op: SetOrPatch;
  /** Present when `op === "set"`. */
  blueprint?: Blueprint;
  /** Present when `op === "patch"`. */
  patch?: JsonPatch;
}

/** DOWNSTREAM. Set or patch a state scope. */
export interface StateMsg {
  kind: "state";
  /** Widget instance id, `"session"`, or a dotted path. */
  scope: string;
  op: SetOrPatch;
  /** Full state value. Present when `op === "set"`. */
  state?: Json;
  /** Present when `op === "patch"`. */
  patch?: JsonPatch;
}

/** DOWNSTREAM. Fire-and-forget event (toast, sfx, navigate, ...). */
export interface EventMsg {
  kind: "event";
  topic: string;
  data?: Json;
}

/** DOWNSTREAM. Error report. */
export interface ErrorMsg {
  kind: "error";
  code: string;
  message: string;
  detail?: Json;
}

/** UPSTREAM. A user action emitted by a widget. */
export interface IntentMsg {
  kind: "intent";
  /** Intent name, e.g. `"chat.send"`, `"emotion.set"`. */
  name: string;
  /** Originating widget instance id. */
  source?: string;
  params?: Json;
}

/** UPSTREAM. Subscribe to state scopes. */
export interface SubscribeMsg {
  kind: "subscribe";
  scopes: string[];
}

/** UPSTREAM. Unsubscribe from state scopes. */
export interface UnsubscribeMsg {
  kind: "unsubscribe";
  scopes: string[];
}

/** UPSTREAM. Handshake; declares client and renderable widget types. */
export interface HelloMsg {
  kind: "hello";
  /** Client name, e.g. `"airp-ui"`. */
  client: string;
  version: string;
  /** Widget types this client can render. */
  accept?: string[];
}

/** Either direction. Acknowledge an envelope by id. */
export interface AckMsg {
  kind: "ack";
  /** The acknowledged envelope id. */
  ref: string;
}

/** Declarative description of the whole UI — the stable, RP-derived asset. */
export interface Blueprint {
  /** Identity of this blueprint (UUID or content hash). */
  version: string;
  /** RP / UI profile id this blueprint belongs to. */
  profile?: string;
  theme?: Theme;
  layout: Layout;
  widgets: WidgetInstance[];
}

export interface Theme {
  /** e.g. `"cyberpunk"`. */
  name: string;
  /** Design tokens (color/spacing/...). */
  tokens?: Record<string, string>;
}

export type LayoutKind = "dock" | "grid" | "stack" | "tabs";

export interface Layout {
  type: LayoutKind;
  areas: Area[];
}

export interface Area {
  id: string;
  /** Widget instance ids placed in this area. */
  widgets: string[];
  /** Area-specific layout props (size, dock side, ...). */
  props?: Json;
}

/** A widget placed in the blueprint. */
export interface WidgetInstance {
  /** Stable instance id; used as state scope and render key. */
  id: string;
  /** Registry key, e.g. `"chat"`, `"emotion"`. */
  type: string;
  /** Static props for this instance. */
  props?: Json;
  /** State scope this widget binds to (defaults to its id). */
  state?: string;
  /** Permissions this instance requests. */
  capabilities?: Capability[];
}

/**
 * A widget manifest as published in the registry — the OPEN extension contract.
 *
 * Not part of the wire envelope; used by Gateway/UI registries. Any third party
 * can ship a widget by publishing a manifest under its own namespace (see
 * `type`). Mirrors `schema/widget-manifest.schema.json`.
 */
export interface WidgetDef {
  /**
   * Namespaced widget id, e.g. `"core.chat"` or `"acme.relationship-graph"`.
   * Must be `namespace.name`; the `core.*` namespace is reserved for first-party widgets.
   */
  type: string;
  /** Semantic version. */
  version: string;
  title: string;
  description?: string;
  /** JSON Schema for this widget's props. */
  propsSchema?: Json;
  /** JSON Schema for this widget's state slice. */
  stateSchema?: Json;
  /** Permissions this widget requests; enforced by the Gateway. */
  capabilities?: Capability[];
  /** Intent names this widget can emit. */
  intents?: string[];
  /** How the UI's Widget Registry loads this widget. */
  entry?: WidgetEntry;
  author?: string;
  homepage?: string;
  license?: string;
}

/** `builtin` = bundled in the UI; `esm` = loaded as an ES module. */
export type EntryKind = "builtin" | "esm";

/** How the UI's Widget Registry loads a widget. */
export interface WidgetEntry {
  kind: EntryKind;
  /** For `kind === "esm"`: the module specifier or URL the UI imports. */
  source?: string;
}

/** A permission a widget/agent requests; enforced by the Gateway. */
export type Capability =
  | "read:memory"
  | "write:memory"
  | "read:worldbook"
  | "read:state"
  | "write:state"
  | "call:tool";

/** An RFC 6902 JSON Patch document. */
export type JsonPatch = PatchOp[];

export type PatchOpKind = "add" | "remove" | "replace" | "move" | "copy" | "test";

export interface PatchOp {
  op: PatchOpKind;
  /** JSON Pointer (RFC 6901). */
  path: string;
  /** Operand for add/replace/test. */
  value?: Json;
  /** Source pointer for move/copy. */
  from?: string;
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/** Narrow an envelope body by its `kind`. */
export function isKind<K extends Body["kind"]>(
  body: Body,
  kind: K,
): body is Extract<Body, { kind: K }> {
  return body.kind === kind;
}

/** True for messages a UI renders (downstream). */
export function isDownstream(body: Body): body is BlueprintMsg | StateMsg | EventMsg | ErrorMsg {
  return (
    body.kind === "blueprint" ||
    body.kind === "state" ||
    body.kind === "event" ||
    body.kind === "error"
  );
}

/** True for messages a UI sends (upstream). */
export function isUpstream(
  body: Body,
): body is IntentMsg | SubscribeMsg | UnsubscribeMsg | HelloMsg | AckMsg {
  return (
    body.kind === "intent" ||
    body.kind === "subscribe" ||
    body.kind === "unsubscribe" ||
    body.kind === "hello" ||
    body.kind === "ack"
  );
}

/** Build an envelope with the current protocol version. */
export function envelope(id: string, ts: number, src: string, body: Body): Envelope {
  return { v: PROTOCOL_VERSION, id, ts, src, body };
}
