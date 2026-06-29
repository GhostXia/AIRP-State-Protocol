# AIRP State Protocol — 规范 v1

> 状态/渲染协议。定义 **AIRP UI（显示层）** 与 **AgentBus 实现（如 AIRP-Gateway）** 之间的契约。
> 与 `schema/airp-state-protocol.schema.json`（真相）、`bindings/rust`、`bindings/typescript` 严格对齐。

## 0. 设计目标

1. **数据与表现分离**：Agent 产出声明式数据，UI 只渲染，不执行 Agent 生成的代码。
2. **传输无关**：同一套 Envelope 可走 Tauri IPC、HTTP/SSE、WebSocket、stdio。
3. **低 Token**：状态以 patch 增量同步；结构外置；引用复用。
4. **实现可替换**：任何实现 `AgentBus` 契约者均可替换默认 Gateway。

## 1. Envelope（信封）

线上每条消息都是一个 Envelope：

| 字段 | 类型 | 说明 |
|------|------|------|
| `v` | int | 协议版本，当前 `1`。 |
| `id` | string | 唯一消息 id（建议 UUID）。 |
| `ts` | int | 创建时间，epoch 毫秒。 |
| `src` | string | 来源：`"ui"` / `"gateway"` / `"agent:<name>"`。 |
| `body` | Body | 带 `kind` 判别的消息体。 |

```json
{ "v": 1, "id": "...", "ts": 1718200000000, "src": "gateway",
  "body": { "kind": "state", "scope": "w-emotion", "op": "patch", "patch": [ ... ] } }
```

## 2. Body（消息体，按 `kind` 判别）

### 下行 Gateway → UI

| kind | 字段 | 说明 |
|------|------|------|
| `blueprint` | `op`(set\|patch), `blueprint?`, `patch?` | 设置/补丁 UI 蓝图。`set` 带全量 `blueprint`，`patch` 带 JSON Patch。 |
| `state` | `scope`, `op`(set\|patch), `state?`, `patch?` | 设置/补丁某 scope 状态。 |
| `manifest` | `op`(set\|patch), `manifests[]` | 下发 widget manifest（WidgetDef[]），UI 据此自动注册尚不能渲染的 widget（开放扩展契约上线）。`set`=全量替换；`patch`=按 `type` 增量 upsert（**注意**：此处 `patch` 指 manifests 数组的 upsert，**不是** RFC 6902 JSON Patch）。UI 须在引用这些类型的 `blueprint` **之前**处理 manifest（渲染器在 mount 时只解析一次 widget 类型）。 |
| `event` | `topic`, `data?` | 一次性事件（toast / 音效 / 导航）。 |
| `error` | `code`, `message`, `detail?` | 错误。 |

### 上行 UI → Gateway

| kind | 字段 | 说明 |
|------|------|------|
| `intent` | `name`, `source?`, `params?` | 用户动作。`name` 如 `chat.send` / `emotion.set`；`source` 为发起 widget 实例 id。 |
| `subscribe` | `scopes[]` | 订阅状态 scope。 |
| `unsubscribe` | `scopes[]` | 取消订阅。 |
| `hello` | `client`, `version`, `accept?[]` | 握手；`accept` 声明本端可渲染的 widget 类型。 |
| `ack` | `ref` | 按 id 确认某 Envelope（双向）。 |

## 3. Blueprint（界面蓝图）

由 RP 推导、半永久存储的稳定资产。**UI 只渲染它，不生成它。**

```
Blueprint { version, profile?, theme?, layout, widgets[] }
Theme     { name, tokens?:{} }
Layout    { type: dock|grid|stack|tabs, areas[] }
Area      { id, widgets[](实例 id), props? }
WidgetInstance { id, type(注册表 key), props?, state?(默认=id), capabilities?[] }
```

- `version`：蓝图身份（UUID 或内容 hash），用于「同一 RP 复用，不再生成」。
- `WidgetInstance.id`：**稳定 id**，同时作为状态 scope 与渲染 key（性能契约要求，见 §6 背景文档）。

## 4. State 与 Patch

- `scope`：widget 实例 id、`"session"` 或点路径。
- 全量用 `op:set` + `state`；增量用 `op:patch` + `patch`（**RFC 6902 JSON Patch**，path 为 RFC 6901 JSON Pointer）。
- **真相在 Gateway（热）/ MCP（冷）**；UI 只持有视口窗口，按需订阅。

```json
{ "kind": "state", "scope": "w-emotion", "op": "patch",
  "patch": [ { "op": "replace", "path": "/emotion", "value": 80 } ] }
```

## 5. Widget Registry（开放扩展）

Widget 系统**对任何第三方开放**：任何人都能用自己的命名空间发布一个 widget manifest 接入本 UI，无需改协议核心。

Manifest（不在信封内，供 Gateway/UI 注册表使用）：

```
WidgetDef {
  type,            // 命名空间 id，如 "core.chat" / "acme.relationship-graph"（namespace.name）
  version,         // semver
  title,
  description?,
  propsSchema?,    // JSON Schema
  stateSchema?,    // JSON Schema
  capabilities?[], // 申请权限，Gateway 强制
  intents?[],      // 可发出的 intent 名
  entry?,          // { kind: builtin|esm, source? } UI 如何加载
  author?, homepage?, license?
}
```

规则：
- **命名空间强制**：`type` 必须含 `.`（`namespace.name`），避免第三方冲突。`core.*` 保留给第一方。
- 校验入口：`schema/widget-manifest.schema.json`（CI 自动校验 `widgets/**/*.json`）。
- UI 端注册表按 `WidgetInstance.type` 找到 manifest 并装载组件；Agent / Gateway 无需知道 Vue/React。
- 贡献流程见 [CONTRIBUTING.md](../../CONTRIBUTING.md) 与 [widget 作者指南](../widget-authoring.md)。

## 6. 权限（Capability）

widget/agent 声明、**Gateway 强制执行**。最小集：

`read:memory` · `write:memory` · `read:worldbook` · `read:state` · `write:state` · `call:tool`

## 7. 典型时序

```
UI  → hello(accept:[chat,emotion,...])
GW  → blueprint(set, <Blueprint>)
UI  → subscribe(scopes:[session.chat, w-emotion])
GW  → state(set, scope=w-emotion, <full>)
... 用户操作 ...
UI  → intent(chat.send, source=w-chat, {text})
GW  → state(patch, scope=session.chat, [+message])
GW  → state(patch, scope=w-emotion, [replace /emotion 80])
```

## 7. 传输绑定（Transport Bindings）

协议**传输无关**（§0），同一套 Envelope 可走任意传输。下列是已落地的具体绑定；新增绑定不递增协议 `v`（Envelope 形状不变），仅约定如何映射到传输原语。

### 7.1 Tauri IPC 绑定（桌面壳默认）

UI（webview）与 Rust core（`src-tauri`）之间走 Tauri v2 的 IPC 原语。Rust core 再 onward 到 AIRP-Gateway（该段为运行时项，见 PLAN 任务 B）。

| 方向 | Tauri 原语 | 名字 | wire shape |
|------|-----------|------|-----------|
| UI → core（上行） | command | `airp_dispatch` | `invoke("airp_dispatch", { env: Envelope })` → `Result<(), String>` |
| core → UI（下行） | event | `airp:envelope` | `emit("airp:envelope", Envelope)`；UI 侧 `listen<Envelope>("airp:envelope", e => e.payload)` |

约束：

- **版本校验在边界**：`airp_dispatch` 收到 Envelope 后先校验 `env.v == PROTOCOL_VERSION`（当前 `1`），不符直接返回 `Err`，不进入 relay。Body 形状由 serde 反序列化强制。
- **command 名 / event 名是契约的一部分**：`airp_dispatch` 与 `airp:envelope` 为本绑定固定标识，UI 侧 `TauriBus`（`src/protocol/tauri-bus.ts`）与 Rust 侧 `airp_dispatch` command + `BusRelay`（`src-tauri/src/bus.rs`）严格对齐。
- **环境判定 + 按需加载**：UI 侧 `createBus()`（`src/protocol/bus-factory.ts`）按 `__TAURI_INTERNALS__` sentinel 选 `TauriBus`（shell）或 `MockBus`（web/vitest/`vite dev`）。`TauriBus` 与 `createTauriTransport` 走**动态 `import()`**，仅在 Tauri 分支加载——保证非 Tauri 环境（含其 bundle）不静态拉入 `@tauri-apps/api`，mock 路径零依赖。
- **错误可见性**：UI 侧 `dispatch` 是边界调用，其 rejection（Rust `airp_dispatch` 返回 `Err` / IPC 传输失败 / 握手失败）不得成为未处理 promise rejection 而静默丢消息。UI 须 catch 并向用户暴露（`App.vue` 用响应式 `busError` 在模板展示）。`dispatch` 接口返回 `void | Promise<void>`（MockBus 同步、TauriBus 异步），归一为 promise 后再 `.catch`。
- **当前 relay 是 mock**：`BusRelay` 不接 Gateway——ack 上行 envelope、`intent`→下行 `state` patch 回环。真连 Gateway 时替换 relay guts，`dispatch`/`subscribe_downstream` 表面不变（PLAN §2.5 未验证清单 B）。

### 7.2 其他绑定（待落地）

HTTP/SSE、WebSocket、stdio 等绑定尚未实现；落地时在此补对应映射表。Envelope 形状与 §1-§6 一致，仅传输原语不同。

## 8. 版本与兼容

- 破坏性变更递增 `v`。
- 接收方遇到未知 `kind` 应忽略并（可选）回 `error` code=`unknown_kind`，不得崩溃。
- 新增可选字段不递增 `v`。

## 9. 待细化（见背景文档 §7）

- State Protocol 与 MCP 的关系（包裹 vs 平行通道）。
- 受限布局 DSL「逃生舱」。
- capability 粒度最终集。
