# AIRP-State-Protocol

**AIRP 生态的状态/渲染协议层。** 定义 AIRP UI（显示层）与 AgentBus 实现（如 AIRP-Gateway）之间，与具体 Agent、UI 框架都无关的契约——让 Agent 能驱动一个**长期存在、可扩展、低 Token** 的界面。

> 这是 AIRP 全家桶里「最稳定的资产」：MCP 解决「Agent 怎么调用工具」，本协议解决「Agent 怎么驱动一个界面」。

## 生态定位

```
AIRP-UI         (显示, Tauri + Vue)         ← Widget Registry 渲染 Blueprint
   ↓  本协议 (Tauri IPC / HTTP / SSE / WS)
AIRP-Gateway    (状态与协议, AgentBus 实现)   ← 热：会话缓存 + patch 差分
   ↓  MCP
AIRP-MCP        (工具与数据)                  ← 冷：落盘真相
   ↓
Agent Runtime   (推理)
```

| 仓库 | 角色 |
|------|------|
| [AIRP-MCP-Server](https://github.com/GhostXia/AIRP-MCP-Server) | 角色扮演数据管理（纯 MCP，不推理） |
| [AIRP-Gateway](https://github.com/GhostXia/AIRP-Gateway) | 协议桥 / AgentBus 默认实现 |
| **AIRP-State-Protocol**（本仓库） | 两者之间的契约：Schema + Rust/TS 绑定 + 规范 |

## 仓库结构

```
schema/airp-state-protocol.schema.json   # 真相：JSON Schema (draft 2020-12)
schema/widget-manifest.schema.json       # widget manifest 校验入口（开放扩展契约）
bindings/rust/                            # Rust 类型 + AgentBus trait（给 Gateway / Tauri core）
bindings/typescript/                      # TS 类型 + 类型守卫（给 Vue/React 前端）
widgets/core/                             # 第一方 widget manifest（chat/memory/emotion/...）
docs/spec/protocol.md                     # 规范 v1
docs/widget-authoring.md                  # widget 作者指南（第三方接入）
docs/AIRP-架构与状态协议-背景整理.md        # 决策与性能契约背景
examples/                                 # 可被 schema 校验的 Envelope 示例
CONTRIBUTING.md                           # 贡献指南（含「如何加 widget」）
.github/workflows/ci.yml                  # 云端验证（编译/类型/schema 均在 CI 跑）
```

## 核心概念（速览）

- **Envelope**：线上每条消息的信封（`v/id/ts/src/body`）。
- **Body**：按 `kind` 判别的消息——下行 `blueprint`/`state`/`event`/`error`，上行 `intent`/`subscribe`/`unsubscribe`/`hello`/`ack`。
- **Blueprint**：由 RP 推导的声明式界面（layout + widgets + theme）。**UI 只渲染，不生成。**
- **State/Patch**：状态以 RFC 6902 JSON Patch 增量同步，降低 Token。
- **Capability**：widget/agent 声明、Gateway 强制的权限。
- **AgentBus**：进程内 trait 契约；任何实现者可替换默认 Gateway。
- **开放 Widget**：widget 系统对任何第三方开放——用自己的命名空间（`namespace.name`）发 manifest 即可接入，无需改协议核心。见 [widget 作者指南](docs/widget-authoring.md) 与 [CONTRIBUTING](CONTRIBUTING.md)。

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

`v0.1` 开发中。已定决策见背景文档 §5（前端框架 = **Vue**）；仍开放问题见 §7（首批 widget 清单、与 MCP 关系、capability 粒度）。

## License

MIT OR Apache-2.0
