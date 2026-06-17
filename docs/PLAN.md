# AIRP-State-Protocol 推进计划

> 活文档（计划书）：愿景与未来展望、里程碑路线图、当前进度、下一步任务、开放决策与工作规则，方便随时接手。
> 最后更新：2026-06-13

## 0. 一句话定位

本仓库 = **AIRP 的 UI 项目**（Tauri + Vue 显示层）+ 它所渲染的**状态/渲染协议契约**。理念：通用优先、不绑定任何项目，任何第三方都能接入。详见 [README](../README.md)、[背景整理](AIRP-架构与状态协议-背景整理.md)、[协议规范](spec/protocol.md)、[责任边界](SECURITY.md)。

## 愿景与未来展望

**一句话愿景**：做「Agent 驱动界面」的通用、开放标准——任何 Agent、任何后端、任何前端框架、任何第三方 widget 都能接入。像浏览器之于网页，成为 Agent 时代的「标准显示层 + 状态协议」。

**三根长期支柱**

1. **协议即核心资产**：稳定的 State Protocol（消息 / Blueprint / 状态 / patch）比任何具体实现更值钱。目标是成为「Agent 如何驱动一个长期存在、可扩展、低 Token 的界面」的事实标准——这正是当前行业缺的那块（背景 §3.1）。
2. **通用 + 开放**：不绑定项目 / 厂商 / 框架；widget 对任何第三方开放；每块都能单独用（乐高，不是套件）。
3. **安全分层**：宿主守自身（capability / 秘密隔离 / 同意 / 错误隔离），不审核插件，用户自担（[SECURITY.md](SECURITY.md)）。

**它会长成什么样（展望）**

- **近期**：Tauri + Vue 桌面应用，嵌入式 sidecar Gateway，本地优先的 RP 客户端。
- **中期**：多前端（桌面 / web / 移动）共用同一协议；第三方 widget 生态 / 市场；「一个 UI ↔ 多个 Agent」会话总线。
- **远期**：协议被 AIRP 之外的项目采用（非 AIRP 后端也能用），成为「Agent UI 协议」的标准候选；Gateway 演化为 Agent Operating Bus（背景 §3.5）。

## 里程碑路线图

> 版本是能力里程碑，非日期承诺。

- **v0.1 — 契约 + UI 骨架（当前，基本完成）**
  协议 v1 契约（schema + Rust/TS 绑定）、开放 widget 框架、Tauri+Vue UI 骨架（Registry / Blueprint / 状态+patch / MockBus）、框架无关 `mount` 接口、esm 动态加载、责任边界、LICENSE 对齐、CI 四 job。
- **v0.2 — 接通真实链路**
  接真实 AgentBus（Tauri IPC → Gateway，任务 B）；esm 端到端样例 + manifest 流入 App（任务 A 收尾）；聊天虚拟滚动 + perf spike（任务 C）；独立用法示例（任务 G 示例）。
  *验收*：UI ↔ Gateway ↔ MCP 真跑通一个 RP 会话。
- **v0.3 — 安全与生态**
  iframe sandbox（D）；capability 强制 + 同意 UI（E）；补齐第一方 widget（F）；发布绑定到 npm / crates（G 发布）；跨仓库框架措辞同步（H）。
- **v1.0 — 协议稳定**
  协议冻结 v1；状态同步语义（热 / 冷）定稿；capability 粒度定稿；布局 DSL「逃生舱」决策落地；作者文档 / 示例完善。
- **远期**
  多 Agent 会话总线；多前端；协议标准化推广。

## 1. 现状快照（已合并到 `main`）

| PR | 内容 |
|----|------|
| #1 | 协议契约脚手架：JSON Schema + Rust/TS 绑定 + `airp-protocol` 校验 CLI + release-exe workflow |
| #2 | 前端框架确定 = Vue |
| #3 | CI 切 Node24 |
| #4 | 开放 widget 框架：manifest schema + 命名空间 + 7 个 `core.*` manifest + CI 校验 |
| #5 | Tauri + Vue UI 进仓：Widget Registry 运行时 + MockBus + ChatWidget/EmotionWidget + vitest |
| #6 | 框架无关 `mount` 组件接口 + 错误隔离 + 非 Vue 样例(clock) + 责任边界 SECURITY.md |
| #7 | README 置顶「通用」理念 |
| #8 | LICENSE 文件 + 元数据，与 AIRP-Gateway 看齐（MIT OR Apache-2.0） |

CI jobs：`rust`(cargo build+test) · `typescript`(tsc) · `schema`(ajv 校验 examples + widget manifests) · `ui`(vue-tsc + vite build + vitest)。`release-exe.yml` 手动触发，已验证产出 Windows .exe。

## 2. 已完成

- [x] State Protocol v1：Envelope / Body(blueprint·state·event·error·intent·subscribe·hello·ack) / Blueprint / WidgetInstance / Capability / RFC6902 patch。三处对齐：schema(真相) + Rust 绑定 + TS 绑定。
- [x] `AgentBus` trait（Rust，进程内契约）。
- [x] 开放 widget 框架：命名空间 manifest（`core.*` 保留）+ CI 校验 + 作者指南。
- [x] UI 运行时：Widget Registry（vue + module 双类型）、BlueprintRenderer、WidgetHost（含错误隔离）、按 scope 响应式状态 + patch、MockBus。
- [x] 框架无关组件接口 `WidgetModule`/`WidgetContext`（`mount`/`unmount`）。
- [x] 责任边界政策（不审核插件，用户自担；宿主守 capability/秘密/同意/错误隔离）。
- [x] 单测：store(patch) + registry。

## 3. 下一步任务（按建议顺序）

### A. esm 动态加载 + manifest 下发（第三方接入前置）— ✅ 完成
- **已落地**：`registerEsmWidget` + `manifests.ts`（注册表 + `registerEsmWidgetsFromManifests` + `applyManifestMessage`）+ `setDefaultEsmImporter`（全局可覆盖导入器）。
- **协议加 `manifest` 下行消息**（schema + Rust + TS 三处对齐）：`op:set` 全替 / `op:patch` 按 `type` 增量 upsert（注意：此 `patch` = manifests 数组 upsert，非 RFC6902）。
- **App 接线**：先处理 `manifest` 再处理 `blueprint`（渲染器只在 mount 解析一次类型，须先注册）。
- **esm 端到端样例**：MockBus 广告第三方 `acme.status-pill`（esm），`main.ts` 用 `setDefaultEsmImporter` 把 `demo:` 源映射到本地模块（demo 不需网络）；`App.manifest.test.ts` + `manifests.test.ts` 覆盖顺序/upsert。
- **剩余（移交 E）**：启用第三方 esm 前的 capability 展示/同意 UI。

### B. 接真实 AgentBus（替 MockBus）
- 做：实现 `TauriBus`（或 `HttpBus`），经 Tauri IPC / HTTP-SSE 连 AIRP-Gateway，跑同一套 `AgentBus` 接口。
- 关键文件：`src/protocol/bus.ts`（新增实现，保留 MockBus 作 dev/test）、`src-tauri/`（IPC 桥）。需 Gateway 暴露 State Protocol 端点。
- 验收：UI ↔ Gateway 实时跑通 blueprint + state set/patch + intent。

### C. 聊天虚拟滚动 + 历史窗口分页（性能契约硬约束）
- 做：ChatWidget 上虚拟滚动（vue-virtual-scroller / TanStack Virtual）；`chat.loadMore` intent 向 Gateway 拉历史窗口；全量历史不常驻前端。
- 关键文件：`src/widgets/ChatWidget.vue`、`bus`/Gateway 分页。
- 验收：perf spike（背景 §6.4）——10 万条假消息，滚动 ~60fps、内存封顶、流式追加不卡。

### D. iframe sandbox（不可信 widget 可选隔离）
- 做：`entry.sandbox=true` → 把 esm widget 装进沙箱 iframe，`postMessage` 转发同一套 `WidgetContext`（getState/onState/emit）。
- 关键文件：`src/components/WidgetHost.vue`（sandbox 分支）+ 一个 iframe bootstrap。
- 验收：沙箱内 widget 无法触碰宿主 DOM/秘密；接口与 in-process 一致。
- 参考：Ironsmith 的「沙箱 + 代码签名」对待 AI/第三方代码（见 §7）。

### E. capability 强制 + 启用同意（需 Gateway 配合）
- 做：宿主/Gateway 按 manifest capability 卡数据；启用 esm widget 前弹同意（展示 `entry.source` + 申请 capability）。
- 验收：未授权 capability 的调用被拒；启用流程有知情同意。

### F. 补齐第一方 widget 组件
- **已落地**：`core.memory/inventory/quest/map/card` 五个 Vue 组件 + 注册（`src/widgets/*.vue`，`registerBuiltins`），inventory/quest 已进样例蓝图并播种状态；`registerBuiltins` 全类型注册有测试覆盖。
- **剩余**：按需打磨样式/交互；其余 widget 视新场景再加。

### G. 让「独立使用」实操无摩擦（不止治感知，更治实操）
- **独立用法示例（已落地）**：`examples/standalone/` 三例——① 只用协议契约 `protocol-only.ts`；② 自定义 `AgentBus` 驱动 `custom-bus.ts`；③ `mount` 接口单 widget `standalone-widget.ts`，均由 `vitest` 验证（见 `standalone.test.ts`）。
- **剩余 — 发布绑定**：`bindings/typescript` → npm（`@airp/state-protocol`）、`bindings/rust` → crates.io（需账号/令牌）。目标：「只用协议」= `npm install` / `cargo add`，而非 git 子目录路径。

### H. 生态级框架措辞同步（跨仓库）
- 把「乐高，不是套件」框架同步到 [AIRP-MCP-Server](https://github.com/GhostXia/AIRP-MCP-Server)、[AIRP-Gateway](https://github.com/GhostXia/AIRP-Gateway) 的 README / `SKILL.md`：**独立用法置顶，拼装说明降级为「可选」**。
- 背景：外部反馈「自洽三件套」造成「必须三件一起用」错觉（2026-06-13）。本仓库已在 README 修（「乐高，不是套件」节，PR #10）；另两仓库待同步。
- 注：跨仓库，不在本仓库 CI 范围。

## 4. 开放决策（待拍板）

- **State-Protocol ↔ MCP 关系**：协议包裹在 MCP 之上，还是平行独立通道？影响 Gateway dispatch。
- **capability 粒度**：最终最小集（现有 `read:memory/write:memory/read:worldbook/read:state/write:state/call:tool`）是否够。
- **受限布局 DSL「逃生舱」**（背景 §4.1）：是否要让 Agent 组合布局而非仅选固定 widget。
- **状态同步语义**：Gateway(热) ↔ MCP(冷) 何时 flush、冲突如何解决（背景 §4.2）。

## 5. 工作规则（接手必读）

- **PR-only**：首轮脚手架已直推；之后**一律分支 → PR → CI 绿 → squash 合并**。不直推 `main`。
- **验证全在 CI**：本地不装工具链（本地空间紧、默认 Rust toolchain 是 msvc 缺 link.exe）。**每个 PR 前先问：现有 workflow 能验证这次改动吗？不能就在同一 PR 加/扩 workflow。**
- **流程命令**：`git checkout -b <branch>` → 改 → `git commit`（Conventional Commits）→ `git push -u origin <branch>` → `gh pr create --body-file <file>`（PS 5.1 下 `--body` 含双引号会被拆，用 `--body-file`）→ `gh pr checks <n>` → `gh pr merge <n> --squash --delete-branch`。
- `gh` 路径：`C:\Program Files\GitHub CLI\gh.exe`。
- 本地只做：写文件 + JSON parse 自检（`node -e`，零安装）。
- 三处对齐：改协议先改 `schema/`，再同步 `bindings/rust` + `bindings/typescript`，更新 `docs/spec/protocol.md` + 加 `examples/`。

## 6. 文件地图

```
schema/                     协议真相（JSON Schema）+ widget-manifest schema
bindings/rust|typescript/   协议绑定（Rust 类型+AgentBus trait / TS 类型）
widgets/core/*.json         第一方 widget manifest
src/                        UI 应用（main/App/protocol/state/registry/widgets/components）
src-tauri/                  Tauri 桌面壳（暂不打包 exe）
docs/spec/protocol.md       协议规范 v1
docs/SECURITY.md            责任边界
docs/widget-authoring.md    widget 作者指南
docs/AIRP-架构与状态协议-背景整理.md  决策/性能契约全背景
docs/PLAN.md                本文件
.github/workflows/          ci.yml（rust/ts/schema/ui）+ release-exe.yml（手动）
```

## 7. 外部参考

- **[Ironsmith](https://github.com/Jeidoban/Ironsmith)**（macOS 菜单栏：用 LLM 从自然语言生成原生 Mac 应用）
  - 它走的是我们**否决**的路线 1（Agent 直接生成代码）；它的产品是「一次性生成独立 app」，能接受路线 1 的代价（每 app 生成 + 编译）。看其代价**反向印证**我们对长期界面选路线 2（Blueprint）的决定。
  - **可借鉴 ①（喂任务 D / SECURITY）**：对「AI / 第三方产出的代码」用 **沙箱 + 代码签名** 兜安全——是我们 iframe sandbox 与「装已签名二进制」策略的现成先例。
  - **可借鉴 ②（喂 Gateway / Agent 侧）**：本地 + 云 LLM 提供商抽象（Ollama / LM Studio / Llama.cpp + OpenAI / Anthropic / Gemini），印证「任意 Agent / 任意后端」方向。
  - 立场印证：拒绝 Electron、走原生（与我们选 Tauri 同向）。
  - 不通用：macOS / Swift 栈，代码层面不可直接复用。
