# 独立用法示例（乐高，不是套件）

三段最小、可运行的例子，证明本仓库的每一块都能**单独使用**——不强制引入其余部分。均由 CI 的 `ui` job（`vitest`）执行验证。

| # | 文件 | 演示 | 依赖 |
|---|------|------|------|
| 1 | [`protocol-only.ts`](protocol-only.ts) | 只用**协议契约**构造/读取 Envelope | 仅 `bindings/typescript`（外部项目用 `@airp/state-protocol`） |
| 2 | [`custom-bus.ts`](custom-bus.ts) | 用**自定义 `AgentBus`** 驱动 UI（非 Gateway、非 MockBus） | 仅 `AgentBus` 契约 |
| 3 | [`standalone-widget.ts`](standalone-widget.ts) | 用 **`mount` 接口**做单个 widget（无 Vue、无其余组件） | 仅 `WidgetModule` 接口 |

测试见 [`standalone.test.ts`](standalone.test.ts)。

> 这些例子刻意各自只依赖一块。要把它们拼起来（协议 + UI + Gateway + MCP）是**可选**的完整组合，不是运行前置。见根 [README](../../README.md) 的「乐高，不是套件」。
