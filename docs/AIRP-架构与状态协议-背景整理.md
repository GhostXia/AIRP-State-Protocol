# AIRP 架构与状态协议 — 背景整理

> 本文档汇总当前掌握的全部信息：AIRP 生态三个仓库的现状、ChatGPT 架构讨论的完整观点、前端实现路线之争、架构决策定稿、性能契约，以及由此推导出的 State Protocol 设计方向。
> 目的是作为后续设计/实现 `AIRP-State-Protocol` 的统一参照。
>
> 整理日期：2026-06-12 · 最后更新：2026-06-13

---

## 1. AIRP 生态全景

AIRP（AI Roleplay）目前由三个仓库构成，定位逐层抽象：

| 仓库 | 语言 | 定位 | 状态 |
|------|------|------|------|
| [AIRP-MCP-Server](https://github.com/GhostXia/AIRP-MCP-Server) | Rust | 角色扮演数据管理后端（纯 MCP） | 已有实现 |
| [AIRP-Gateway](https://github.com/GhostXia/AIRP-Gateway) | Rust (Axum/Tokio) | HTTP/SSE ↔ MCP 协议桥 | 已有实现 |
| **AIRP-State-Protocol**（本仓库） | 多语言（JSON Schema + Rust + TS） | 状态/渲染协议规范 + 绑定 | **开发中** |

### 1.1 AIRP-MCP-Server

- **定位**：纯 MCP 协议的角色扮演数据管理服务器。**不调用任何 AI API，不做推理**——所有叙事与角色逻辑发生在连接的 MCP 客户端（Claude、Cursor 等）。
- **能力**：暴露 **38 个 tools、19 个 resources、12 个 prompts**，覆盖角色卡、世界书、预设、会话历史、实时状态、记忆/存档、多角色场景。
- **存储层**：本地文件存储；防目录穿越；大小限制（角色 PNG 导入 ≤10 MiB，单次读取 ≤32 KiB）；服务端解析 PNG。
- **插件系统**：零 schema 命名空间（`data/plugins/`），第三方扩展可存任意数据，AIRP 不校验。
- **安全**：本地优先；HTTP 模式可选 bearer token 鉴权；刻意避免公网暴露。

```
MCP Client (推理/叙事)
    ↓ MCP 协议
AIRP Server (仅数据管理)
    ↓ 文件存储
本地数据目录
```

### 1.2 AIRP-Gateway

- **定位**：通用、高性能协议桥。把前端的 HTTP/SSE 请求翻译成上游服务的 MCP（JSON-RPC）调用，转发前处理鉴权与限流。
- **技术栈**：Rust + Axum + Tokio；构建目标 `x86_64-pc-windows-gnu`。
- **处理流水线**：`前端请求 → CORS → 限流 → 鉴权 → dispatch`
- **用户原始意图**：建立 Gateway 是为了**兼容性最大化**，未来用它连接 UI 与 MCP / Agent。

| 模块 | 职责 |
|------|------|
| `config` | 分层配置（default → TOML → 环境变量） |
| `server` | Axum 路由、鉴权、CORS、限流 |
| `bridge` | 请求/响应翻译（领域无关） |
| `mcp::client` | 上游初始化与 tool/resource 调用 |
| `mcp::pool` | 上游服务注册表 |
| `mcp::transport` | 协议抽象（stdio / HTTP 实现） |

- **设计铁律**：纯协议桥，不含业务逻辑；优先库而非可执行文件；保持 transport 独立以利移植。

---

## 2. 前端构想与路线之争

### 2.1 用户最初构想

> 用 **Artifacts + Vue** 做一个**自适应前端**。让 Agent 根据 RP（角色扮演），在对话之初制作一个**半永久化**的前端界面，用 Vue 呈现。

### 2.2 关键分叉：动态生成 vs 配置填充

#### 路线 1：Agent 每次生成 Vue 页面 — 否决

```
RP → Agent 生成 Vue 组件 → Artifacts 保存 → 浏览器渲染
```

三大问题：
1. **Token 浪费**：每次重建 Vue+CSS+JS，约 5000~10000 token。
2. **不稳定**：组件结构漂移（`EmotionPanel` → `MoodPanel`）。
3. **维护困难**：100 个角色 = 100 个 Vue 项目。
4. **（Claude 补充，最强否决理由）安全**：Agent 生成 Vue = 在前端执行 LLM 输出的任意代码，注入/XSS/沙箱逃逸风险全开。

#### 路线 2：Agent 生成 UI Blueprint（采纳）

不让 Agent 写 Vue，Vue 固定，Agent 只生成声明式 JSON：

```json
{ "theme": "cyberpunk", "panels": [ { "type": "emotion" }, { "type": "memory" } ] }
```

```
RP → Agent → UI Blueprint → 存储 → Vue Renderer（Widget Registry 动态装载）
```

真正稳定的资产不是 Vue 代码，而是那份由 RP 推导出的 **UI Blueprint**。符合 MCP「数据与表现分离」。

### 2.3 半永久前端

```
首次进入 RP → 生成 Blueprint → 存储 → 生成 UUID
以后：同一 RP → 直接读取 Blueprint（不再生成）
```

**RP = UI Profile**：恋爱→聊天界面；经营→数据面板；桌游→卡牌界面；跑团→属性栏。

### 2.4 Widget Registry（最终形态）

Agent 只发 widget 列表，Vue 端注册表动态装载：

```json
{ "widgets": ["chat", "memory", "emotion", "inventory"] }
```

```
Character Card → AIRP → UI Blueprint → Widget Registry → Vue
```

接近 SillyTavern UI / Tavern Helper / NovelAI 场景面板 / Claude Artifacts 的融合体。

---

## 3. Gateway 定位的再思考（ChatGPT 审计观点）

> 以下为 ChatGPT 的评估意见，非定论，供参考。

### 3.1 核心论断

**Gateway 可能比 AIRP-MCP 更接近未来核心；最有价值的资产是 Gateway 定义的那套 State Protocol（即本仓库）。**
- MCP 解决「Agent 怎么调用工具」。
- Gateway 解决「Agent 怎么驱动一个长期存在、可扩展、低 Token 的用户界面」——目前无统一行业标准。
- 用户做的不是普通 API Gateway，而是 **State Gateway / Agent Runtime**：状态总线 + 协议翻译 + 会话管理。

### 3.2 浏览器抽象层类比

```
早期：网站 → 直接操作系统 API
后来：网站 → 浏览器 → 操作系统     （浏览器成为抽象层）
对应：UI → Gateway → 任意后端       （Gateway 成为抽象层）
```

### 3.3 目标四层架构

```
AIRP-UI         (显示)        ← 标准 Agent 桌面
   ↓
AIRP-Gateway    (状态与协议)   ← 标准 Agent 运行时 / Agent Operating Bus
   ↓
AIRP-MCP        (工具)        ← 标准 Agent 后端
   ↓
Agent Runtime   (推理)
```

### 3.4 Gateway 应承担的五个职责层

1. **协议适配器**：UI 只认统一协议；Gateway 翻译 MCP/OpenAI/Claude/LangGraph/AutoGen → UI 协议。
2. **状态缓存（最重要）**：首轮全量、之后只发 patch。否则每轮重传全状态，浪费 Token。
3. **Widget Registry**：Agent 发 widget 声明 → Gateway 查注册表 → 通知 UI 加载。
4. **会话总线**：「一个 UI ↔ 多个 Agent」时负责消息路由、事件广播、状态同步。
5. **权限系统**：第三方 widget/MCP/Agent 的访问授权，应在 Gateway 而非 UI/Agent。

### 3.5 命名建议

把 AIRP-Gateway 重新定义为 **Agent Operating Bus** / **Agent Runtime Layer**。

---

## 4. 工程视角与建议（本仓库 Claude 补充）

### 4.1 路线选择：采纳路线 2，留「逃生舱」

- 最强理由是**安全**（见 §2.2）。
- 纯固定 Registry 会牺牲「Agent 自由生成 UI」想象力。建议混合：核心固定 widget 覆盖 90%；加受限布局 DSL 让 Agent 组合而非写代码；极端场景走默认关闭、需显式授权的强沙箱 freeform widget。

### 4.2 状态归属：MCP 与 Gateway 权责必须先划清

- **AIRP-MCP = 真相持久层**：落盘、跨重启、可备份（冷）。
- **AIRP-Gateway = 实时会话缓存 + Patch 差分层**：持有活动状态树，算 diff，发 patch，掉线回放（热）。
- 协议须定义两者**同步语义**（何时 flush、冲突解决）。

### 4.3 不要把协议绑死在 Claude Artifacts 上

- Artifacts 是 Claude 专有，多 Agent 不通用。
- **Blueprint/State 真相存 Gateway/MCP，Artifacts 只当其中一个渲染宿主。** 换模型不丢界面。

### 4.4 Token 优化关键是「协议形状」

- 稳定 ID + 引用复用；widget props schema 外置到 Registry；服务端模板（发 `template_id + 变量`）。

### 4.5 语言/绑定建议

- 协议本体 = 语言无关 **JSON Schema**（真相）。
- 产物：**TypeScript 类型**（给前端）+ **Rust 类型**（给 Gateway，与现有栈一致）。规范唯一、两端对齐。

---

## 5. 架构决策定稿（本轮拍板）

以下为讨论后**已确定**的决策，作为实现约束：

### 5.1 前端交付形态：Tauri 嵌入 + Sidecar Gateway

- **AIRP-UI = Tauri 桌面应用**：Vue/React 跑在 WebView 渲染，Rust core 在壳内。Tauri 是 AIRP-UI 这一**显示层的打包方式**，不替代任何架构层。
- **Gateway 以 sidecar（独立可执行）方式随包默认自带**，启动即用（零配置）。
  - 不违反 Gateway「优先库」铁律：Gateway 主体仍是 library crate，sidecar 只是极薄 exe 包装 `fn main() { airp_gateway::run() }`。
- **一键卸载/替换**：用户可在前端停止并删除自带 sidecar，改连**远程 Gateway URL** 或换装其他实现；都没有则进入「未配置态」（功能锁定，提示安装/连接）。
- **安装/替换走已签名 release 二进制**，**不在运行时 clone 源码编译**（慢 + RCE 风险）。装第三方实现须显式确认 + 来源可信提示。

```
┌─ Tauri App ───────────────────────────────────┐
│  Vue/React WebView (Widget Registry, 渲染 Blueprint)│
│        ↕  Tauri IPC（走 State Protocol）            │
│  Rust Core (AgentBus 客户端 stub)                   │
└───────────────┬───────────────────────────────┘
                ↕  本地 HTTP/IPC（走 State Protocol）
     ┌──────────┴──────────┐
     │ AIRP-Gateway        │  ← sidecar 二进制，可一键卸载/替换/改远程
     └──────────┬──────────┘
                ↓ MCP
           AIRP-MCP → Agent
```

### 5.2 契约边界：trait + 协议

- 独立性来自**稳定契约**，不是「拉仓库」这个动作。
- 线上契约 = State Protocol（JSON Schema 定义的消息/Blueprint/状态/patch）。
- 进程内契约 = Rust trait `AgentBus`；`AIRP-Gateway` 是它的一个实现。任何 crate 实现该 trait 即可替换。

### 5.3 本仓库 AIRP-State-Protocol = 契约层

交付：
1. **JSON Schema**（真相）：消息信封、Blueprint、Widget、State/Patch。
2. **Rust 绑定**：序列化类型 + `AgentBus` trait（给 Gateway / Tauri core）。
3. **TypeScript 绑定**：类型 + 类型守卫（给 Vue/React 前端）。
4. **规范文档**：`docs/spec/protocol.md`。

### 5.4 其它已定项

- **patch 格式**：JSON Patch (RFC 6902) 为主。
- **编码**：JSON；协议版本字段 `v`，当前 `1`。
- **传输**：协议 transport 无关。参考实现 UI↔Core 用 Tauri IPC，Core↔Gateway 用本地 HTTP/SSE。
- **状态分层**：Gateway 热（会话缓存 + diff）/ MCP 冷（落盘真相）。
- **前端框架**：Vue 与 React 二选一（**待最终拍板**），但契约层与框架无关，不阻塞。

---

## 6. 性能契约（防止重蹈酒馆覆辙）

### 6.1 核心原则：性能问题是「有界 vs 无界」，不是「算力多寡」

- SillyTavern（酒馆）崩溃的根因是 **无界 DOM + 单线程阻塞 + 内存泄漏**，**不是算力不足**。
- **4090 + 64G 照样崩**；给更多 CPU/GPU 是**崩得更快，不是更慢**——10 万 DOM 节点是内存/布局树问题，GPU 填充率救不了。
- **错觉纠正**：Tauri 的 WebView2 就是 Chromium，与浏览器同引擎，**不会「多吃」硬件**。「本地客户端能最大限度吃 CPU/GPU 所以不崩」是错误心智模型，指望它必重蹈覆辙。
- 类比：酒馆不是「没油」（硬件=油），是「没刹车」（无界增长）。装刹车（虚拟化/上界）不花硬件。

### 6.2 硬约束（不可违反，实现方谁都不许破）

1. **聊天/长列表强制虚拟滚动**：永远只渲染视口内 DOM（TanStack Virtual 等）。这是「2000 条崩」与「10 万条丝滑」的分界。
2. **全量历史真相在 Gateway**，UI 按**窗口分页**拉取，不在前端常驻全量。
3. **状态更新 patch 优先**：禁止每轮全量重灌 state。
4. **稳定 ID 做 key**：保证细粒度响应式只更新变化节点。
5. **重计算留在 Rust sidecar**：状态 diff、正则、prompt 拼装、持久化全离开渲染线程；必须在 JS 的重活走 Web Worker。
6. **流式增量追加渲染**：禁止每个 token 重解析整段 markdown。
7. **内存卫生**：离屏 widget 销毁、listener/interval 清理、内存内消息窗口封顶。

### 6.3 本地客户端的真实优势（次要，且非「吃硬件」）

- **状态可落磁盘**：Gateway 持久化到本地文件/DB，UI 不必把全量塞进内存/IndexedDB（浏览器标签有内存上限）。
- **Rust 真线程**：比浏览器 Web Worker 更强更省心的并行。
- **无后台标签节流**：桌面进程不受浏览器后台限制。

> 性质是「解除限制 / 便于离线程」，不是「多吃 GPU」。

### 6.4 去风险：先证后承诺（Perf Spike）

正式开发前做最小性能尖刺验证，过了再锁定框架：

- **场景**：Tauri 壳 + 虚拟滚动，灌 **10 万条假消息**。
- **验收（初始目标，待实测校准）**：
  - 滚动稳定 **60fps**、无可感掉帧。
  - 进程内存**封顶**（目标量级 < 几百 MB，不随历史增长线性上升）。
  - 流式追加（模拟逐 token）渲染无可感卡顿。
- 过 → 锁定 Tauri + Vue/React。未过 → 才有理由评估 Flutter 等 GPU 渲染方案。

---

## 7. 待决问题（仍开放）

1. **前端框架最终拍板**：Vue 还是 React？（契约层不阻塞，但 AIRP-UI 仓库开工前需定）
2. **首批 Widget 清单**：先实现哪几个？候选 `chat / memory / emotion / inventory / quest / map / card`。
3. **协议与 MCP 关系细化**：State Protocol 完全包在 MCP 之上，还是平行于 MCP 的独立通道？（影响 Gateway 内部 dispatch）
4. **权限粒度**：capability 列表的最小集（如 `read:memory` / `write:memory` / `read:worldbook` / `call:tool`）。

---

## 8. 信息来源

- AIRP-MCP-Server 仓库：<https://github.com/GhostXia/AIRP-MCP-Server>
- AIRP-Gateway 仓库：<https://github.com/GhostXia/AIRP-Gateway>
- ChatGPT 分享对话「项目更新审计报告」：<https://chatgpt.com/share/6a2bdd86-6e14-83ec-b7d0-d2147ee4c67f>
