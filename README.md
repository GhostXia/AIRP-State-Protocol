# AIRP-State-Protocol

> **通用优先，不绑定任何项目。** 本项目始终以「通用」为核心理念——不捆绑任何特定项目或厂商，任何第三方都能便捷接入、自由用于任何用途。

**AIRP 生态的 UI 项目**（Tauri + Vue 显示层），同时承载它所渲染的**状态/渲染协议**。UI 通过一个**开放的 Widget Registry** 渲染由 Agent 产出的声明式 **Blueprint**，让 Agent 能驱动一个**长期存在、可扩展、低 Token** 的界面。

> 一仓两面：① Tauri+Vue 应用（显示层）；② 它与 AgentBus（如 AIRP-Gateway）之间，与具体 Agent 无关的 State Protocol 契约（Schema + Rust/TS 绑定 + widget manifest）。

## 乐高，不是套件

每一块都能**单独使用**，不强制你引入其余部分：

- **只用协议契约**：拿 `schema/` + `bindings/`（Rust 或 TS 类型）在你自己的项目里描述/校验 UI 状态与 Blueprint。不需要本 UI，也不需要 Gateway / MCP。
- **只用 UI**：Tauri + Vue 应用配**任意** `AgentBus` 实现——内置 `MockBus` 无任何后端即可跑；接你自己的后端只需实现 `dispatch` + `subscribe`，不绑定 AIRP-Gateway。
- **只用 / 自写一个 widget**：按 `mount` 接口（或 manifest）做一个 widget，挂到任何使用本协议的 UI 上，不需要其余组件。

> 下面的「生态」只是把这些（再加 AIRP 的后端）**拼满时**的样子——是**可选组合，不是运行前置**。任何一层都可单独使用、可换任意实现。

## 生态定位（可选的完整组合）

```
AIRP-State-Protocol  (本仓库, Tauri + Vue UI + 协议契约)  ← Widget Registry 渲染 Blueprint
   ↕  State Protocol (Tauri IPC / HTTP / SSE / WS)
AIRP-Gateway         (AgentBus 实现)                      ← 热：会话缓存 + patch 差分
   ↕  MCP
AIRP-MCP             (工具与数据)                          ← 冷：落盘真相
   ↕
Agent Runtime        (推理)
```

| 仓库 | 角色 |
|------|------|
| [AIRP-MCP-Server](https://github.com/GhostXia/AIRP-MCP-Server) | 角色扮演数据管理（纯 MCP，不推理） |
| [AIRP-Gateway](https://github.com/GhostXia/AIRP-Gateway) | 协议桥 / AgentBus 默认实现 |
| **AIRP-State-Protocol**（本仓库） | UI 应用（Tauri+Vue）+ State Protocol 契约（Schema + Rust/TS 绑定 + 规范） |

## 仓库结构

```
# —— UI 应用（Tauri + Vue）——
index.html  vite.config.ts  tsconfig.json  package.json
src/
  main.ts  App.vue                         # 挂载；订阅 AgentBus，分发 Blueprint/state
  protocol/types.ts                        # 复用 bindings/typescript 的协议类型
  protocol/bus.ts                          # AgentBus 接口 + MockBus（无后端可跑）
  state/store.ts                           # 按 scope 的响应式状态 + RFC6902 patch
  registry/                                # Widget Registry：type → 组件加载器
  widgets/                                 # 第一方 widget 组件（ChatWidget/EmotionWidget）
  components/                              # BlueprintRenderer + WidgetHost
src-tauri/                                 # Tauri 桌面壳（Rust，暂不打包 exe）

# —— State Protocol 契约 ——
schema/airp-state-protocol.schema.json     # 真相：JSON Schema (draft 2020-12)
schema/widget-manifest.schema.json         # widget manifest 校验入口（开放扩展契约）
bindings/rust/                             # Rust 类型 + AgentBus trait（给 Gateway）
bindings/typescript/                       # TS 类型 + 类型守卫（UI 复用）
widgets/core/                              # 第一方 widget manifest（chat/memory/emotion/...）
docs/spec/protocol.md                      # 规范 v1
docs/widget-authoring.md                   # widget 作者指南（第三方接入）
docs/AIRP-架构与状态协议-背景整理.md         # 决策与性能契约背景
examples/                                  # 可被 schema 校验的 Envelope 示例
CONTRIBUTING.md                            # 贡献指南（含「如何加 widget」）
.github/workflows/ci.yml                   # 云端验证（rust/ts/schema/ui 均在 CI 跑）
```

## 核心概念（速览）

- **Envelope**：线上每条消息的信封（`v/id/ts/src/body`）。
- **Body**：按 `kind` 判别的消息——下行 `blueprint`/`state`/`event`/`error`，上行 `intent`/`subscribe`/`unsubscribe`/`hello`/`ack`。
- **Blueprint**：由 RP 推导的声明式界面（layout + widgets + theme）。**UI 只渲染，不生成。**
- **State/Patch**：状态以 RFC 6902 JSON Patch 增量同步，降低 Token。
- **Capability**：widget/agent 声明、Gateway 强制的权限。
- **AgentBus**：进程内 trait 契约；任何实现者可替换默认 Gateway。
- **开放 Widget**：widget 系统对任何第三方开放——用自己的命名空间（`namespace.name`）发 manifest 即可接入，无需改协议核心。组件**不限框架**（`mount` 接口，任意技术实现）。见 [widget 作者指南](docs/widget-authoring.md)、[CONTRIBUTING](CONTRIBUTING.md)、责任边界 [SECURITY.md](docs/SECURITY.md)。

详见 [规范](docs/spec/protocol.md)。

## 关键约束

- **路线 2（Blueprint，非 Agent 写代码）**：Agent 产出声明式数据，UI 渲染。安全 + 稳定 + 低 Token。
- **性能契约**：性能问题是「有界 vs 无界」，不是「算力多寡」。强制虚拟滚动、历史窗口分页、patch 优先、稳定 ID、重活进 Rust。详见背景文档 §6。
- **传输无关**：协议不绑定任何传输；不绑定 Claude Artifacts。

## 验证

编译与验证全部在 CI（`.github/workflows/ci.yml`）执行：

- `rust`：`cargo build` + `cargo test`（Linux runner）。
- `typescript`：`tsc --noEmit`。
- `schema`：`ajv` 用 schema 校验 `examples/*.json`。

> 本地不需安装工具链。

## 状态

`v0.1` 开发中。已定决策见背景文档 §5（前端框架 = **Vue**）；仍开放问题见 §7。**推进进度、下一步任务、工作规则见 [docs/PLAN.md](docs/PLAN.md)。**

## License

双协议授权，与 [AIRP-Gateway](https://github.com/GhostXia/AIRP-Gateway) 看齐：**MIT OR Apache-2.0**，使用者任选其一。

- [LICENSE-MIT](LICENSE-MIT)
- [LICENSE-APACHE](LICENSE-APACHE)
