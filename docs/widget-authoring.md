# Widget 作者指南

AIRP UI 的 widget 系统**对任何第三方开放**。你不改协议核心、不改 UI 核心，就能用自己的命名空间发布一个 widget 接入本 UI。本文讲 manifest 怎么写、权限怎么声明、UI 怎么加载。

## 1. 开放与命名空间

- 任何人都能加 widget，只要用**自己的命名空间**。
- `type` 必须是 `namespace.name`（必须含 `.`），例如 `acme.relationship-graph`。命名空间避免第三方之间冲突。
- `core.*` 保留给第一方（本仓库 `widgets/core/`）。
- 校验：`schema/widget-manifest.schema.json`（CI 自动校验 `widgets/**/*.json`）。

## 2. Manifest 字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `type` | ✅ | 命名空间 id，`namespace.name`。 |
| `version` | ✅ | 语义化版本，如 `1.0.0`。 |
| `title` | ✅ | 显示名。 |
| `description` | | 一句话说明。 |
| `propsSchema` | | 该 widget 静态 props 的 JSON Schema。 |
| `stateSchema` | | 该 widget 状态切片的 JSON Schema（Gateway 据此发 set/patch）。 |
| `capabilities` | | 申请的权限数组，Gateway 强制（见 §3）。 |
| `intents` | | 本 widget 可发出的 intent 名，如 `chat.send`。 |
| `entry` | | UI 如何加载（见 §4）。 |
| `author` / `homepage` / `license` | | 元数据。 |

## 3. 权限（capabilities）

第三方 widget 可能想读记忆、调工具、读世界书。**按需声明，Gateway 强制执行**——不要多要。

可选值：`read:memory` · `write:memory` · `read:worldbook` · `read:state` · `write:state` · `call:tool`

> 安全模型：widget 是声明式数据 + 受信渲染器，不执行 LLM 生成的代码。权限在 Gateway 这一层卡，不在 UI、不在 Agent。

## 4. UI 如何加载（entry）

```json
"entry": { "kind": "builtin" }
"entry": { "kind": "esm", "source": "https://cdn.example.com/acme-widget.mjs" }
```

- `builtin`：随 UI 打包（第一方常用）。
- `esm`：UI 运行时按 `source` 动态 import 一个 ES 模块。

> `esm` 第三方加载的具体安全策略（来源白名单、沙箱）由 AIRP-UI 运行时定义；manifest 只声明意图。

## 5. 生命周期

```
声明 manifest → 注册到 Widget Registry → Blueprint 引用 type → UI 装载渲染
            ↘ 发 intent（用户操作） / 收 state set+patch（数据更新）↗
```

- 状态真相在 Gateway，UI 只渲染视口窗口（性能契约，见背景文档 §6）。`stateSchema` 描述的是切片形状。
- 用稳定 id 做 key；状态更新优先 patch。

## 6. 最小示例

`widgets/acme/relationship-graph.json`：

```json
{
  "type": "acme.relationship-graph",
  "version": "1.0.0",
  "title": "关系图",
  "description": "Force-directed character relationship graph.",
  "stateSchema": {
    "type": "object",
    "properties": {
      "nodes": { "type": "array", "items": { "type": "object" } },
      "edges": { "type": "array", "items": { "type": "object" } }
    }
  },
  "intents": ["relationship.focus"],
  "capabilities": ["read:state"],
  "entry": { "kind": "esm", "source": "https://cdn.example.com/relationship-graph.mjs" },
  "author": "Acme",
  "license": "MIT"
}
```

## 7. 提交

加文件到 `widgets/<namespace>/<name>.json` → 开 PR → CI 自动校验 manifest。组件实现（Vue）放 `AIRP-UI` 仓库。完整流程见 [CONTRIBUTING.md](../CONTRIBUTING.md)。
