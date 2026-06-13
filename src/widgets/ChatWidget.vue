<script setup lang="ts">
import { computed, ref } from "vue";
import type { WidgetInstance, Json } from "../protocol/types";

const props = defineProps<{ instance: WidgetInstance; state: unknown }>();
const emit = defineEmits<{ (e: "intent", name: string, params?: Json): void }>();

interface Msg {
  id: string;
  role: string;
  text: string;
}

const title = computed(() => {
  const p = props.instance.props as unknown as { title?: string } | null;
  return p?.title ?? "对话";
});
const messages = computed<Msg[]>(
  () => (props.state as { messages?: Msg[] } | null)?.messages ?? [],
);

const draft = ref("");

function send(): void {
  const text = draft.value.trim();
  if (!text) return;
  emit("intent", "chat.send", { text });
  draft.value = "";
}
</script>

<template>
  <div class="w-chat">
    <div class="w-title">{{ title }}</div>
    <ul class="w-chat-log">
      <li v-for="m in messages" :key="m.id" :class="['msg', m.role]">
        <span class="role">{{ m.role }}</span>
        <span class="text">{{ m.text }}</span>
      </li>
    </ul>
    <form class="w-chat-composer" @submit.prevent="send">
      <input v-model="draft" placeholder="说点什么…" />
      <button type="submit">发送</button>
    </form>
  </div>
</template>

<style scoped>
.w-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.w-chat-log {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 8px;
}
.msg {
  margin: 4px 0;
}
.msg .role {
  opacity: 0.6;
  margin-right: 6px;
  font-size: 12px;
}
.w-chat-composer {
  display: flex;
  gap: 6px;
  padding: 8px;
}
.w-chat-composer input {
  flex: 1;
}
</style>
