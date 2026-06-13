<script setup lang="ts">
import {
  ref,
  shallowRef,
  watch,
  onMounted,
  onBeforeUnmount,
  onErrorCaptured,
  defineAsyncComponent,
} from "vue";
import type { Component } from "vue";
import type { WidgetInstance, Json } from "../protocol/types";
import type { WidgetModule, WidgetContext } from "../registry/widget-module";
import { resolveWidget } from "../registry/registry";

const props = defineProps<{ instance: WidgetInstance; state: unknown }>();
const emit = defineEmits<{ (e: "intent", name: string, params?: Json): void }>();

const reg = resolveWidget(props.instance.type);
const failed = ref<string | null>(null);

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function onIntent(name: string, params?: Json): void {
  emit("intent", name, params);
}

// --- kind: vue (native component) ---
const vueComponent = shallowRef<Component | null>(null);
if (reg?.kind === "vue") {
  try {
    const r = reg.load();
    vueComponent.value = r instanceof Promise ? defineAsyncComponent(() => r) : r;
  } catch (e) {
    failed.value = errMsg(e);
  }
}

// --- kind: module (framework-agnostic) ---
const moduleEl = ref<HTMLElement | null>(null);
let mod: WidgetModule | null = null;
let stateCb: ((state: unknown) => void) | null = null;

function makeContext(): WidgetContext {
  return {
    instance: props.instance,
    getState: () => props.state,
    onState: (cb) => {
      stateCb = cb;
      return () => {
        if (stateCb === cb) stateCb = null;
      };
    },
    emit: (name, params) => emit("intent", name, params),
    capabilities: props.instance.capabilities ?? [],
  };
}

async function mountModule(): Promise<void> {
  if (reg?.kind !== "module" || !moduleEl.value) return;
  try {
    const loaded = reg.load();
    mod = loaded instanceof Promise ? await loaded : loaded;
    await mod.mount(moduleEl.value, makeContext());
    stateCb?.(props.state);
  } catch (e) {
    failed.value = errMsg(e);
  }
}

watch(
  () => props.state,
  (s) => {
    try {
      stateCb?.(s);
    } catch (e) {
      failed.value = errMsg(e);
    }
  },
);

onMounted(() => {
  if (reg?.kind === "module") void mountModule();
});

onBeforeUnmount(() => {
  try {
    mod?.unmount?.();
  } catch {
    /* a misbehaving widget must not break teardown */
  }
});

// Contain widget render errors so one widget can't crash the app.
onErrorCaptured((e) => {
  failed.value = errMsg(e);
  return false;
});
</script>

<template>
  <div class="widget-host">
    <div v-if="failed" class="widget-error">widget 出错：{{ instance.type }} — {{ failed }}</div>
    <component
      :is="vueComponent"
      v-else-if="reg?.kind === 'vue' && vueComponent"
      :instance="instance"
      :state="state"
      @intent="onIntent"
    />
    <div v-else-if="reg?.kind === 'module'" ref="moduleEl" class="widget-mount"></div>
    <div v-else class="widget-missing">未注册的 widget：{{ instance.type }}</div>
  </div>
</template>

<style scoped>
.widget-host {
  height: 100%;
  min-height: 0;
}
.widget-mount {
  height: 100%;
  padding: 8px;
}
.widget-missing,
.widget-error {
  padding: 8px;
  font-size: 13px;
  color: #e0668a;
}
</style>
