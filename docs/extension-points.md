# 扩展点 / 自定义点（开发者 & 用户面板）

> 「乐高，不是套件」。本文把所有**可自定义/可替换的接口面**集中列出——每一项给出：**做什么 · 文件 · 接口签名 · 怎么用 · 最小例子**。
> 想接入而不改协议核心、不改 UI 核心？看这张表就够了。
>
> 责任边界：宿主守自身安全（capability、秘密、同意、错误隔离），**不审核插件代码**；接入与否是用户的选择与风险（[SECURITY.md](SECURITY.md)）。

## 速查表

| # | 扩展点 | 你是谁 | 文件 |
|---|--------|--------|------|
| 1 | 写一个 widget（vue / module / esm 三种） | widget 作者 | `src/registry/registry.ts`、`src/registry/widget-module.ts` |
| 2 | 接自己的后端（自定义 `AgentBus`） | 集成方 | `src/protocol/bus.ts`、`src/protocol/bus-factory.ts` |
| 3 | Rust 侧换实现（`AgentBus` trait / `BusRelay`） | Gateway/壳作者 | `bindings/rust/src/lib.rs`、`src-tauri/src/bus.rs` |
| 4 | 覆盖 esm 导入方式（`setDefaultEsmImporter`） | 集成方 | `src/registry/registry.ts` |
| 5 | 不可信 widget 走 iframe 沙箱（`entry.sandbox`） | widget 作者 / 宿主 | `src/registry/sandbox-bridge.ts` |
| 6 | 同意持久化后端（`ConsentStorage` / `initGrants`） | 集成方 | `src/registry/consent.ts` |
| 7 | 自定义界面（Blueprint / Theme / Layout） | Agent / 后端 | `schema/…schema.json`、`src/components/BlueprintRenderer.vue` |
| 8 | 扩展权限集（`Capability`） | 协议维护者 | `schema/…schema.json` + `bindings/{rust,typescript}` |
| 9 | 只用协议契约（不要 UI） | 任意项目 | `schema/`、`bindings/` |
| 10 | Registry 低层 API | 高级用法 | `src/registry/registry.ts` |

---

## 1. 写一个 widget

Widget 系统对任何第三方开放，**三种 kind**，互不强制框架。详尽的 manifest 字段见 [widget 作者指南](widget-authoring.md)；这里给三种注册方式的接口。

宿主在 mount 时递给 widget 的上下文（所有 kind 通用）：

```ts
// src/registry/widget-module.ts
interface WidgetContext {
  instance: WidgetInstance;                    // id / type / props / 申请的 capabilities
  getState(): unknown;                         // 读本 widget scope 的当前状态
  onState(cb: (state: unknown) => void): () => void; // 订阅状态变化，返回退订
  emit(intent: string, params?: Json): void;   // 向上发 intent（用户动作）
  capabilities: Capability[];                   // 宿主**实际授予**的权限（已过同意闸门）
}
```

### 1a. Vue 组件（第一方式紧集成）

```ts
import { registerVueWidget } from "./registry";
registerVueWidget("acme.my-widget", () => MyWidget /* 或 () => import("...") 异步 */);
```
组件收 props `{ instance, state }`，发 `@intent`。参考 `src/widgets/ChatWidget.vue`。

### 1b. Module 组件（框架无关，任意技术）

任何技术（React/Svelte/Lit/原生 DOM/Web Component）只要实现 `WidgetModule`：

```ts
// src/registry/widget-module.ts
interface WidgetModule {
  mount(el: HTMLElement, ctx: WidgetContext): void | Promise<void>;
  unmount?(): void;
}
```
```ts
import { registerModuleWidget } from "./registry";
registerModuleWidget("acme.clock", () => ({
  mount(el, ctx) {
    el.textContent = "…";
    const off = ctx.onState((s) => { el.textContent = String(s); });
    el.onclick = () => ctx.emit("clock.tick");
    this._off = off;
  },
  unmount() { this._off?.(); },
}));
```
参考 `src/widgets/clock.module.ts`（原生 DOM 样例）。

### 1c. esm 第三方（manifest 动态下发，零改宿主）

后端用 `manifest` 下行消息广告一个 widget，UI 自动注册并按需 `import()`：

```jsonc
{ "kind": "manifest", "op": "set", "manifests": [{
  "type": "acme.status-pill", "version": "1.0.0", "title": "状态胶囊",
  "capabilities": ["read:state"], "intents": ["status.toggle"],
  "entry": { "kind": "esm", "source": "https://cdn.example.com/status-pill.mjs", "sandbox": true }
}] }
```
esm 模块的 **default export 必须是 `WidgetFactory`**：
```ts
// status-pill.mjs
export type WidgetFactory = () => WidgetModule;   // 见 widget-module.ts
export default () => ({ mount(el, ctx) { /* … */ } });
```
第三方 esm 需用户**授权**后才加载（见 §6），可选 iframe 沙箱（见 §5）。

---

## 2. 接自己的后端：自定义 `AgentBus`（TS）

UI 与后端之间只认这个接口。实现它即可换掉默认 Gateway / MockBus，**不绑定 AIRP-Gateway**。

```ts
// src/protocol/bus.ts
interface AgentBus {
  dispatch(env: Envelope): void | Promise<void>;   // UI → bus：上行 envelope
  subscribe(handler: (env: Envelope) => void): () => void; // bus → UI：订阅下行，返回退订
}
```
```ts
class MyBus implements AgentBus {
  dispatch(env) { myTransport.send(env); }          // 接你的 WS/HTTP/SSE/IPC
  subscribe(h) { myTransport.onMessage(h); return () => myTransport.off(h); }
}
```
接线方式：改 `src/protocol/bus-factory.ts` 的 `createBus()`（当前按 `__TAURI_INTERNALS__` 选 `TauriBus`/`MockBus`），或直接在 `App.vue` 注入你的 bus。内置 `MockBus`（`bus.ts`）无后端即可跑，是写自己 bus 的最小参照。

---

## 3. Rust 侧换实现：`AgentBus` trait / `BusRelay`

进程内契约。Tauri 壳里 `BusRelay`（`src-tauri/src/bus.rs`）当前是 **mock relay**；真连 Gateway 时**只替换 relay 内部**，`dispatch` / `subscribe_downstream` 表面不变：

```rust
// bindings/rust/src/lib.rs —— 进程内 trait
pub trait AgentBus { /* … */ }
```
- 上行入口：`#[tauri::command] fn airp_dispatch(env: Envelope) -> Result<(), String>`（校验协议版本后转交 relay）。
- 下行事件：relay 通过 `AppHandle::emit("airp:envelope", env)` 推给 webview。
- 换真实现：把 `BusRelay::dispatch` 的 mock 回环换成对 Gateway 的 IPC/HTTP 调用即可。

---

## 4. 覆盖 esm 导入方式：`setDefaultEsmImporter`

控制「esm widget 的 `source` 如何被 `import()`」——用于本地映射（demo 免网络）、私有 CDN、缓存、加签/鉴权。

```ts
// src/registry/registry.ts
function setDefaultEsmImporter(importer: (source: string) => Promise<unknown>): void;
```
```ts
import { setDefaultEsmImporter } from "./registry";
const LOCAL = { "demo:acme/status-pill": () => import("./widgets/status.module") };
setDefaultEsmImporter((source) =>
  LOCAL[source]?.() ?? import(/* @vite-ignore */ source));
```
`registerEsmWidget(type, source, importer?)` 也接受**逐次覆盖**的 importer（测试常用）。参考 `src/main.ts`。

---

## 5. 不可信 widget 走 iframe 沙箱：`entry.sandbox`

manifest 声明 `entry.sandbox: true` → 宿主把该 esm widget 装进 **opaque-origin iframe**（`allow-scripts`，**无** `allow-same-origin`），`WidgetContext` 经 `postMessage` 桥接，widget **碰不到宿主 DOM / 全局 / 同源资源 / cookie**。

```jsonc
"entry": { "kind": "esm", "source": "https://cdn.example.com/x.mjs", "sandbox": true }
```
- 接口与 in-process 完全一致（`WidgetContext` 同形），widget 代码无需改。
- 桥实现 `src/registry/sandbox-bridge.ts`（`SandboxBridge` + `createIframeTransport`）。
- 安全门：宿主在 `message` 监听里 gate `event.source === iframe.contentWindow`，防邻帧伪造。
- **当前 `sandbox` 为可选（opt-in）**；是否对不可信 esm 默认开启是开放决策（PLAN §4）。

---

## 6. 同意持久化后端：`ConsentStorage` / `initGrants`

第三方 esm widget 需用户授权后才加载；授权绑定 `{type, version, source}` 身份（换源/升版需重授）。持久化后端可注入。

```ts
// src/registry/consent.ts
interface ConsentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
function initGrants(storage?: ConsentStorage): void; // 启动调用一次；省略则用 localStorage
```
```ts
import { initGrants } from "./registry/consent";
initGrants();                  // 默认 localStorage（键 airp:consent-grants）
initGrants(myKvStore);         // 或注入自己的后端（如 Tauri store / 内存 mock）
```
未调 `initGrants` → 纯内存（向后兼容）；无 `localStorage` 环境 → 空操作不抛错。`grant`/`revoke`/`clearGrants` 自动写回。

---

## 7. 自定义界面：Blueprint / Theme / Layout

**界面是声明式数据，不是代码**——Agent/后端产出 Blueprint，UI 渲染。要换界面，改的是数据（理念见背景文档 §2.2）。

```jsonc
{ "version": "bp-1", "profile": "rp:my",
  "theme": { "name": "cyberpunk", "tokens": { "accent": "#00e5ff" } },
  "layout": { "type": "dock",            // dock | grid | stack | tabs
              "areas": [ { "id": "main", "widgets": ["w-chat"] } ] },
  "widgets": [ { "id": "w-chat", "type": "core.chat", "state": "w-chat" } ] }
```
- `theme.tokens`：任意设计令牌（颜色/间距…），渲染层消费。
- `layout.type`：`dock`/`grid`/`stack`/`tabs`。**要加新布局类型**：扩 schema 的 `Layout.type` 枚举 + 在 `src/components/BlueprintRenderer.vue` 加渲染分支。
- 状态以 RFC 6902 JSON Patch 增量同步（`state` 消息 `op:patch`），稳定 `id` 做 key。

---

## 8. 扩展权限集：`Capability`

权限是**闭合枚举**，三处对齐才生效（schema 真相 + 两端绑定），且最终由 **Gateway 强制**：

```
read:memory · write:memory · read:worldbook · read:state · write:state · call:tool
```
加一个权限要改：① `schema/airp-state-protocol.schema.json` 的 `Capability.enum`；② `bindings/rust/src/lib.rs`；③ `bindings/typescript/src/index.ts`；④ Gateway 侧实现强制。CI 的 `schema` job 会校验示例一致性。

---

## 9. 只用协议契约（不要 UI）

不想要本 UI，只想在你自己的项目里描述/校验 UI 状态与 Blueprint：

- `schema/airp-state-protocol.schema.json`——真相（JSON Schema draft 2020-12），任意语言可校验。
- `schema/widget-manifest.schema.json`——widget manifest 校验入口。
- `bindings/rust/`——Rust 类型 + `AgentBus` trait。
- `bindings/typescript/`——TS 类型 + 类型守卫。

实操样例见 `examples/standalone/`（protocol-only / custom-bus / standalone-widget）。

---

## 10. Registry 低层 API

```ts
// src/registry/registry.ts —— 需要细粒度控制时
registerWidget(type, { kind: "vue" | "module", load });  // 通用注册
unregisterWidget(type);                                   // 注销（manifest set 丢弃时用）
resolveWidget(type): RegisteredWidget | undefined;        // 查
registeredTypes(): string[];                              // 列已注册类型
```
manifest 流相关：`applyManifestMessage(op, manifests, importer?)`、`registerEsmWidgetsFromManifests`、`clearManifests`（见 `src/registry/manifests.ts`）。

---

> 没覆盖到你的场景？欢迎开 issue/PR——见 [CONTRIBUTING](../CONTRIBUTING.md)。协议层本就与传输、框架、具体 Agent 无关，扩展点会持续补充。
