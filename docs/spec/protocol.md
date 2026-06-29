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
  entry?,          // { kind: builtin|esm, source?, sandbox? } UI 如何加载
  author?, homepage?, license?
}
```

规则：
- **命名空间强制**：`type` 必须含 `.`（`namespace.name`），避免第三方冲突。`core.*` 保留给第一方。
- **sandbox（可选，esm 专属）**：`entry.sandbox: true` 时，宿主把该 widget 装进 `<iframe sandbox="allow-scripts">`（**无** `allow-same-origin` → opaque origin），`WidgetContext` 经 `postMessage` 桥接，widget 无法触碰宿主 DOM/全局/同源资源（SECURITY.md）。推荐用于不可信第三方 widget；默认 false（in-process esm，与 builtin 同上下文）。详见 task D。
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

## 8. 版本与兼容

- 破坏性变更递增 `v`。
- 接收方遇到未知 `kind` 应忽略并（可选）回 `error` code=`unknown_kind`，不得崩溃。
- 新增可选字段不递增 `v`。

## 9. 待细化（见背景文档 §7）

- State Protocol 与 MCP 的关系（包裹 vs 平行通道）。
- 受限布局 DSL「逃生舱」。
- capability 粒度最终集。
