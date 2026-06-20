<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef } from "vue";
import type { Blueprint, Envelope, Json } from "./protocol/types";
import { MockBus } from "./protocol/bus";
import { stateStore, setState, patchState, applyJsonPatch } from "./state/store";
import { registerBuiltins, applyManifestMessage } from "./registry";
import BlueprintRenderer from "./components/BlueprintRenderer.vue";

// Register first-party widgets into the open registry.
registerBuiltins();

const blueprint = shallowRef<Blueprint | null>(null);

// MockBus stands in for the AgentBus client (Tauri IPC / HTTP-SSE to Gateway).
const bus = new MockBus();
let unsubscribe: (() => void) | null = null;

function onEnvelope(e: Envelope): void {
  const body = e.body;
  // Manifests are processed BEFORE blueprint: the renderer resolves a widget
  // type once at mount, so a third-party esm widget must be registered before
  // the blueprint that references it arrives.
  if (body.kind === "manifest") {
    applyManifestMessage(body.op, body.manifests);
  } else if (body.kind === "blueprint") {
    if (body.op === "set" && body.blueprint) {
      blueprint.value = body.blueprint;
    } else if (body.op === "patch" && body.patch && blueprint.value) {
      // shallowRef: patch a clone then reassign so the renderer updates.
      const next = structuredClone(blueprint.value);
      applyJsonPatch(next as unknown as Json, body.patch);
      blueprint.value = next;
    }
  } else if (body.kind === "state") {
    if (body.op === "set") setState(body.scope, body.state ?? null);
    else if (body.op === "patch" && body.patch) patchState(body.scope, body.patch);
  }
}

function onIntent(name: string, params?: Json): void {
  void bus.dispatch({
    v: 1,
    id: `ui-${Date.now()}`,
    ts: Date.now(),
    src: "ui",
    body: { kind: "intent", name, params },
  });
}

onMounted(() => {
  unsubscribe = bus.subscribe(onEnvelope);
});
onUnmounted(() => {
  unsubscribe?.();
});
</script>

<template>
  <main class="app">
    <header class="topbar">
      <strong>AIRP&nbsp;UI</strong>
      <small>scaffold · {{ blueprint?.theme?.name ?? "—" }}</small>
    </header>
    <BlueprintRenderer
      v-if="blueprint"
      :blueprint="blueprint"
      :state="stateStore"
      @intent="onIntent"
    />
    <div v-else class="loading">等待 Blueprint…</div>
  </main>
</template>

<style>
:root {
  --accent: #00e5ff;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: #0b0e14;
  color: #e6e6e6;
}
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.topbar {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.topbar small {
  opacity: 0.6;
}
.loading {
  margin: auto;
  opacity: 0.6;
}
input,
button {
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 6px 10px;
}
button {
  cursor: pointer;
}
</style>
