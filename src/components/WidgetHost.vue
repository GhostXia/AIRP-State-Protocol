<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import type { Component } from "vue";
import type { WidgetInstance, Json } from "../protocol/types";
import { resolveWidget } from "../registry/registry";

const props = defineProps<{ instance: WidgetInstance; state: unknown }>();
const emit = defineEmits<{ (e: "intent", name: string, params?: Json): void }>();

// Resolve the component for this instance's type from the registry. Builtin
// loaders return synchronously; esm loaders return a Promise, wrapped lazily.
const component = computed<Component | null>(() => {
  const loader = resolveWidget(props.instance.type);
  if (!loader) return null;
  const result = loader();
  return result instanceof Promise ? defineAsyncComponent(() => result) : result;
});

function onIntent(name: string, params?: Json): void {
  emit("intent", name, params);
}
</script>

<template>
  <div class="widget-host">
    <component
      :is="component"
      v-if="component"
      :instance="instance"
      :state="state"
      @intent="onIntent"
    />
    <div v-else class="widget-missing">未注册的 widget：{{ instance.type }}</div>
  </div>
</template>

<style scoped>
.widget-host {
  height: 100%;
  min-height: 0;
}
.widget-missing {
  padding: 8px;
  font-size: 13px;
  color: #e0668a;
}
</style>
