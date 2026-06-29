# AIRP-State-Protocol 推进计划

> 活文档（计划书）：愿景与未来展望、里程碑路线图、当前进度、下一步任务、开放决策与工作规则，方便随时接手。
> 最后更新：2026-06-29

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
- **v0.2 — 可打包 + 接通真实链路**
  **🅿 打包 .exe（Tauri bundle，已提前为本阶段首要任务，见任务 P）**；接真实 AgentBus（Tauri IPC → Gateway，任务 B）；esm 端到端样例 + manifest 流入 App（任务 A 收尾）；聊天虚拟滚动 + perf spike（任务 C）；独立用法示例（任务 G 示例）。
  *验收*：能产出一个可双击运行的 Windows `.exe`（含内嵌 UI）；UI ↔ Gateway ↔ MCP 真跑通一个 RP 会话。
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
| #9 | docs：PLAN.md 路线图（现状 / 任务 / 规则 / 文件地图） |
| #10 | docs：README「乐高，不是套件」——独立用法置顶，生态图降级为可选 |
| #11 | docs(plan)：独立用法实操 + 跨仓库框架同步任务（G / H） |
| #12 | feat：esm 动态加载 widget（`registerEsmWidget` + manifest 注册表 + 单测） |
| #13 | docs(plan)：愿景与未来展望 + 里程碑路线图 |
| #14 | feat：第一方 widget 组件 memory/inventory/quest/map/card |
| #15 | docs(examples)：独立用法三例（protocol-only / custom-bus / standalone-widget） |
| #16 | docs(plan)：记录 Ironsmith 外部参考 |
| #17 | feat：**manifest 线上下发（任务 A 完成）** + 审计修复（op 语义统一 / CLI match / 注销 esm / 断言） |

CI jobs：`rust`(cargo build+test) · `typescript`(tsc) · `schema`(ajv 校验 examples + widget manifests) · `ui`(vue-tsc + vite build + vitest)。`release-exe.yml` 手动触发，已验证产出 Windows .exe。

## 2. 已完成

- [x] State Protocol v1：Envelope / Body(blueprint·state·**manifest**·event·error·intent·subscribe·hello·ack) / Blueprint / WidgetInstance / Capability / RFC6902 patch。三处对齐：schema(真相) + Rust 绑定 + TS 绑定。
- [x] `AgentBus` trait（Rust，进程内契约）。
- [x] 开放 widget 框架：命名空间 manifest（`core.*` 保留）+ CI 校验 + 作者指南。
- [x] UI 运行时：Widget Registry（vue + module 双类型）、BlueprintRenderer、WidgetHost（含错误隔离）、按 scope 响应式状态 + patch、MockBus。
- [x] 框架无关组件接口 `WidgetModule`/`WidgetContext`（`mount`/`unmount`）。
- [x] 责任边界政策（不审核插件，用户自担；宿主守 capability/秘密/同意/错误隔离）。
- [x] **esm 动态加载 + manifest 线上下发（任务 A）**：`manifest` 下行消息 + manifest 注册表 + `setDefaultEsmImporter` + App 接线（manifest 先于 blueprint）+ 端到端 esm demo（`acme.status-pill`）。
- [x] **第一方 widget 组件**：chat/emotion/memory/inventory/quest/map/card + clock(module)。
- [x] **独立用法示例**：`examples/standalone/`（protocol-only / custom-bus / standalone-widget），CI 验证。
- [x] 单测：store(patch) + registry + manifests + builtins + standalone。

## 2.5 工作策略与未验证清单

**策略（2026-06）**：基础代码先行，运行时验证后置到调试阶段。护栏三条——① 凡能 CI 验的（类型/构建/单测/schema）**不后置**，全程守住；② 纯运行时项（真 Gateway 连通、浏览器帧率、视觉）登记到下方清单，调试阶段照单逐项过；③ **性能 spike 提前**（晚发现 = 返工架构）。

**未验证清单（运行时，待调试阶段）**

- [ ] **B**：真连 Gateway 端到端（Rust 核 `airp_dispatch`/`airp:envelope` 桥 + App bus 工厂已落地，`BusRelay` 当前是 mock，待替换为真 Gateway IPC）。
- [ ] **C（性能 spike，尽早）**：10 万条假消息，虚拟滚动 ~60fps、内存封顶、流式追加不卡（背景 §6.4）。
- [ ] **esm 第三方真加载**：从真实远程 `source` `import()` 一个外部 widget 并渲染（当前仅本地映射 demo + 注入 importer 单测）。
- [ ] **D**：iframe sandbox 内 widget 无法触碰宿主 DOM/秘密。
- [ ] **E**：未授权 capability 调用被拒；启用前同意 UI。

## 2.6 审计快照（2026-06-19）

**总体判断**：方向清楚，核心价值在 `schema/` + TS/Rust bindings + manifest/registry 这条开放扩展链。当前主要短板不在概念，而在真实运行闭环、安全边界和协议一致性。

**主要风险**

- **真实 AgentBus 尚未闭环**（部分推进 2026-06-29）：`src/App.vue` 已改用 `createBus()` 工厂按环境选 `TauriBus`/`MockBus`；`src-tauri/src/bus.rs` 实现 `airp_dispatch` command + `airp:envelope` 事件桥（`BusRelay`，内置 mock relay）。**本轮（2026-06-29 迭代）收紧错误可见性**：`App.vue` 给 `createBus()` 与 `dispatch()` 加 try/catch，IPC/握手失败不再变成静默空壳或未处理拒绝，错误写入响应式 `busError` 并在模板展示；`bus-factory.ts` 把 `TauriBus` 改为按需动态 `import()`，web/vitest bundle 不再静态拉入 Tauri 传输（tree-shaking）。**剩余**：`BusRelay` 当前是 mock（不接 Gateway），真连 Gateway 时替换 relay guts 即可（表面不变）；端到端 UI→core→Gateway→patch→UI 未运行时验证。
- **第三方 widget 安全边界仍偏提示层**：`registerEsmWidget` 默认 `import(source)`，授权后 ESM 跑在宿主 JS 上下文；`WidgetHost` 只限制传给 widget 的 `capabilities` 数组，不能阻止代码访问 DOM、全局对象或同源资源。开放真实远程 ESM 前，必须先落 D/E 的最小安全护栏。
- **授权粒度过粗**：当前 `grant` 只按 `type` 记忆；若同一 `type` 的 manifest 后续替换 `source` 或 `version`，可能继承旧授权。需要把授权绑定到 `{type, version, source}` 或 source hash，manifest 变化后重新授权。
- **协议承诺与 UI 实现有偏差**（已修复）：`src/state/store.ts` 的 `applyJsonPatch` 现已实现完整 RFC 6902（`add/remove/replace/move/copy/test`）；`App.vue` 已处理 `blueprint op:patch`（clone→applyJsonPatch→reassign）。剩余偏差：`test` op 非事务性（前置 op 已生效后才抛）。
- **运行时 wire 输入缺校验**：真实 Gateway/IPC 输入不能只靠 TS 类型保护。`Envelope`、`Manifest`、`Blueprint` 进入 registry/store 前应做 schema 校验或轻量 runtime guard，未知/非法消息按规范忽略或回 `error`。
- **可复现性与供应链审计不足**：根目录无 `package-lock.json`，`src-tauri` 无 `Cargo.lock`，CI 使用 `npm install` 在线解析依赖。应用层建议锁定依赖；库发布则明确产物与版本策略。

**建议优先级**

1. **v0.2 先闭环真实链路**：App bus 工厂按环境选择 `TauriBus`/`MockBus`；Rust 核实现 `airp_dispatch` 与 `airp:envelope`；跑通 UI -> Gateway -> state patch -> UI 的最小 RP 会话。
2. **v0.3 前收紧安全模型**：授权绑定 `type + version + source/hash`；manifest 变更触发重新授权；Gateway 侧强制 capability；iframe sandbox 作为不可信 widget 的默认推荐路径。
3. **协议语义尽快收敛**：要么完整实现 RFC 6902，要么把 schema/文档降级为当前支持的 patch 子集；补上 `blueprint patch` 或从 v1 表面移除。
4. **补 runtime 校验与端到端测试**：在 App/Tauri/Gateway 边界加 Envelope 校验；增加一条从 manifest 下发、blueprint 渲染、intent 上行、state patch 回流的 e2e/smoke。
5. **发布前做可复现构建**：应用层提交 lockfile，CI 改 `npm ci`；`bindings/typescript` 发布前产出 `.d.ts`/JS 或明确纯类型包策略；Rust crate 发布前固定最小支持版本与 cargo publish 检查。

**本次本地验证记录**

- JSON 语法自检通过：20 个 `.json` 文件均可解析。
- `npm test` / `npm run typecheck` 未跑通：本地无 `node_modules`，`vitest`/`vue-tsc` 不可用。
- Rust 本地测试未跑通：当前 Windows 环境缺 MSVC `link.exe`；`src-tauri` 在允许联网后可下载依赖，但仍卡在 linker，不能据此判断项目编译失败。

**追加本地验证记录（2026-06-29，任务 B ①②）**

- 改动文件：`src-tauri/{Cargo.toml,src/main.rs,src/bus.rs(新增)}`、`src/{App.vue,protocol/bus-factory.ts(新增),protocol/bus-factory.test.ts(新增)}`、`docs/{PLAN.md,README.md}`。
- Rust 字段对齐已人工核对 `bindings/rust/src/lib.rs`：`AckMsg.ref_`、`IntentMsg.params: Option<Value>`（无 `capabilities`）、`PatchOp.value: Option<Value>`、`SetOrPatch`/`PatchOpKind` 枚举命名。Tauri v2 API 对齐官方文档（`#[tauri::command]` + `tauri::State` + `Emitter::emit` + `generate_handler!` + `Manager::state`）。
- TS 类型对齐 `AgentBus` 接口；`bus-factory.test.ts` 3 个用例覆盖环境判定 + MockBus 路径 + sentinel 切换（Tauri 分支归运行时清单，不硬测避免 CI flaky）。
- **CI 验证缺口已闭合**：新增 `ci.yml` 的 `tauri` job（`src-tauri` cargo build + test，含 WebKit/GTK 系统依赖 + 前端 `npm run build` 产 `dist`），覆盖本次 Rust 桥改动。CI 现有 5 个 job：`rust`（协议绑定）· `tauri`（桌面壳）· `typescript` · `schema` · `ui`。

**迭代审计（2026-06-29，同一 PR 续轮）**

对已推送的 `feat/b-tauri-bus-bridge`（origin/main..HEAD 三个 commit）做只读复审，落地以下收紧（未合并、未推送前先补强）：

- **P2 错误可见性**：`App.vue` 的 `onMounted` 异步 `await createBus()` 与 `void bus.dispatch(...)` 两处都可能产生未处理的 promise rejection——前者在 Tauri 壳内动态 import `@tauri-apps/api` / IPC 握手失败时，后者在 Rust `airp_dispatch` 返回 `Err`（版本不符 / serde / IPC 失败）时。改为 `try/catch` + `.catch()`，错误写入响应式 `busError` 并在模板顶部展示（不再静默空壳）。`dispatch` 接口返回 `void | Promise<void>`（MockBus 同步、TauriBus 异步），用 `Promise.resolve(...)` 归一后再 `.catch`，类型安全。
- **P3 bundle 体积**：`bus-factory.ts` 原静态 `import { TauriBus, createTauriTransport }`，即便非 Tauri 环境（web/vitest）也会把 `tauri-bus.ts` 拉进 bundle。改为 Tauri 分支内动态 `import("./tauri-bus")`，让 bundler 把 Tauri 传输（含其 `@tauri-apps/api` 动态 import）拆成单独 chunk，只在壳内加载。`MockBus` 仍静态导入（零后端 fallback 每个非 Tauri 目标都要）。
- **验证**：`vue-tsc --noEmit` 通过；`vitest run` 10 文件 40 用例全绿（含 `bus-factory` / `tauri-bus`）。Rust 侧本轮无改动，`tauri` job 范围不变。
- **审计结论**：当前 PR 可继续迭代，方向是「收紧边界错误可见性 + bundle 体积」，非破坏性、不改 wire 契约。**未合并**（遵循 PR-only + 不直推 main 规则）。剩余运行时项（真连 Gateway 端到端）仍登记在 §2.5 清单 B。

**第二轮迭代（2026-06-29，CI 供应链收紧）**

对推送后的 PR #27 收集 Gemini + CodeRabbit 两轮 review（针对 1b4daa4 / 7c535b7），逐条核对对 HEAD（464a3ff）是否仍有效：

- 已失效跳过：`bus.rs` chat.send 读 `params.as_str()`（7c535b7 已改读 `v.get("text")`）；`BusRelay` 用 `Mutex`（7c535b7 已改 `OnceLock`+`AtomicU64`）；`main.rs` `log::info!` 静默（7c535b7 已删，Cargo.toml 亦无 `log` 依赖）；`App.vue` 异步 createBus 晚于 unmount（7c535b7 已加 `disposed` 守卫，464a3ff 又包 try/catch）；`bus-factory.test.ts` sentinel 无 finally（已有 try/finally + 注释）。
- **仍有效、本轮修复**：CodeRabbit 指出 `ci.yml` tauri job（7c535b7 新增）无 `permissions:` 块（默认 `contents: write` 过宽，zizmor: excessive-permissions）且 `actions/checkout` 未设 `persist-credentials: false`（zizmor: artipacked，凭据留在 runner 供后续步骤取用）；同时根目录已入库 `package-lock.json`，`npm install` 在 CI 应改 `npm ci` 锁定可复现。本轮把收紧应用到**全部** workflow：`ci.yml` workflow 级 `permissions: contents: read` + 5 处 checkout 加 `persist-credentials: false` + 根目录两处（tauri 前端 build、ui job）`npm install`→`npm ci`；`tauri-build.yml` 同样收紧 + `npm ci`。`bindings/typescript` 无 lockfile（独立子包），保留 `npm install`；`schema` job 用 `npx --yes`，不动。
- 验证：本轮仅改 workflow YAML + 文档，无代码逻辑改动；本地无法跑 GitHub Actions，依赖 CI 自验（推送后观察 5 job 是否仍绿）。**未合并**。

## 3. 下一步任务（按建议顺序）

### P. 打包 .exe（Tauri bundle）— 🅿 高优先 · 进行中
> 决策更新：原「暂不打包 exe」前置约束**解除**；打包提为近期首要,以便尽早产出可分发桌面产物。
- **已落地**：`tauri.conf.json` 开 `bundle.active: true`(targets `nsis`,icon 列表);占位源图 `src-tauri/icon-source.png`(1024²,CI 用 `tauri icon` 生成全套,`src-tauri/icons/` 已 gitignore);手动 workflow `.github/workflows/tauri-build.yml`(windows-latest:`npm install` → `tauri icon` → `tauri build` → 上传 `airp-ui.exe` + NSIS 安装包 artifact)。`src-tauri/Cargo.lock` 已入库(可复现)。
- **剩余/未验证（运行时）**：手动 dispatch `tauri-build` 跑通(Windows 构建偏重,可能首跑要调依赖/图标);替换占位图标为正式美术；App bus 工厂(Tauri 用 `TauriBus`、否则 `MockBus`)随 B 落地——**首版 exe 跑 MockBus demo,符合验收**。
- **验收**：workflow 产出可双击运行的 Windows `.exe`,启动显示样例 UI（先 MockBus 即达标）。

### A. esm 动态加载 + manifest 下发（第三方接入前置）— ✅ 完成
- **已落地**：`registerEsmWidget` + `manifests.ts`（注册表 + `registerEsmWidgetsFromManifests` + `applyManifestMessage`）+ `setDefaultEsmImporter`（全局可覆盖导入器）。
- **协议加 `manifest` 下行消息**（schema + Rust + TS 三处对齐）：`op:set` 全替 / `op:patch` 按 `type` 增量 upsert（注意：此 `patch` = manifests 数组 upsert，非 RFC6902）。
- **App 接线**：先处理 `manifest` 再处理 `blueprint`（渲染器只在 mount 解析一次类型，须先注册）。
- **esm 端到端样例**：MockBus 广告第三方 `acme.status-pill`（esm），`main.ts` 用 `setDefaultEsmImporter` 把 `demo:` 源映射到本地模块（demo 不需网络）；`App.manifest.test.ts` + `manifests.test.ts` 覆盖顺序/upsert。
- **剩余（移交 E）**：启用第三方 esm 前的 capability 展示/同意 UI。

### B. 接真实 AgentBus（替 MockBus）— 进行中
- **已落地**：`src/protocol/tauri-bus.ts` 的 `TauriBus`（`dispatch`→`invoke("airp_dispatch")`，`subscribe`→`listen("airp:envelope")`），transport 可注入 → 逻辑单测覆盖（`tauri-bus.test.ts`）；`createTauriTransport()` 动态 import `@tauri-apps/api`。**① Rust 核 `airp_dispatch` command + `airp:envelope` 事件桥**：`src-tauri/src/bus.rs` 的 `BusRelay`（内置 mock relay：ack 上行 envelope、`intent`→下行 `state` patch 回环）+ `airp_dispatch` command（校验 `v` 后转交 relay）+ `main.rs` 注册 command 并在 `setup` 挂下游订阅；`Cargo.toml` 加 `airp-state-protocol`（本地路径依赖，复用同一套 wire 类型）+ `log`。**② App bus 工厂**：`src/protocol/bus-factory.ts` 的 `createBus()`——按 `__TAURI_INTERNALS__` sentinel 选 `TauriBus`（shell）或 `MockBus`（web/vitest/`vite dev`），`App.vue` 改 `onMounted` 异步建 bus；`bus-factory.test.ts` 覆盖环境判定 + MockBus 路径。
- **剩余（运行时，未验证清单）**：③ Rust 核 `BusRelay` 当前是 mock（不接 Gateway）——真连 Gateway 时替换 relay guts 即可（`dispatch`/`subscribe_downstream` 表面不变）；真连跑通 UI → core → Gateway → state patch → UI 的最小 RP 会话。需 Gateway 暴露 State Protocol 端点。

### C. 聊天虚拟滚动 + 历史窗口分页（性能契约硬约束）— 进行中
- **已落地（基础代码）**：自写定高窗口化 `src/widgets/virtual-window.ts`（纯函数 `computeWindow`，无第三方依赖）+ 单测；ChatWidget 改为只渲染视口切片 + 上下 spacer；滚到顶发 `chat.loadMore` intent。
- **剩余（运行时，未验证清单）**：perf spike（背景 §6.4）——10 万条假消息，滚动 ~60fps、内存封顶、流式追加不卡（需浏览器，建议尽早手动跑）；Gateway 侧历史窗口分页（MockBus 暂忽略 `chat.loadMore`）。
- 备注：定高方案是骨架；若需变高消息再换测量式/虚拟库。

### D. iframe sandbox（不可信 widget 可选隔离）
- 做：`entry.sandbox=true` → 把 esm widget 装进沙箱 iframe，`postMessage` 转发同一套 `WidgetContext`（getState/onState/emit）。
- 关键文件：`src/components/WidgetHost.vue`（sandbox 分支）+ 一个 iframe bootstrap。
- 验收：沙箱内 widget 无法触碰宿主 DOM/秘密；接口与 in-process 一致。
- 参考：Ironsmith 的「沙箱 + 代码签名」对待 AI/第三方代码（见 §7）。

### E. capability 强制 + 启用同意 — 进行中
- **已落地（基础代码）**：`src/registry/consent.ts`——`needsConsent`（仅 esm 需）/`canMount`（builtin 恒可，esm 须 `grant`）/`effectiveCapabilities`（未授权返回空，授权后给 manifest 声明的 caps）+ 单测；WidgetHost 接入同意闸门:gated 时显示「来源 + 申请权限 + 授权并加载」，授权后才 mount；`WidgetContext.capabilities` 只下发已同意的权限。授权绑定 `{type, version, source}` 身份——manifest 换源/升版不继承旧授权（应审计 §2.6 风险）。
- **剩余**：Gateway 侧对 capability 的真实强制（UI 只能限制自己下发的；越权工具调用最终由 Gateway 拒）；同意持久化（记住已授权）。

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
.github/workflows/          ci.yml（rust/tauri/ts/schema/ui）+ release-exe.yml（手动）+ tauri-build.yml（手动）
```

## 7. 外部参考

- **[Ironsmith](https://github.com/Jeidoban/Ironsmith)**（macOS 菜单栏：用 LLM 从自然语言生成原生 Mac 应用）
  - 它走的是我们**否决**的路线 1（Agent 直接生成代码）；它的产品是「一次性生成独立 app」，能接受路线 1 的代价（每 app 生成 + 编译）。看其代价**反向印证**我们对长期界面选路线 2（Blueprint）的决定。
  - **可借鉴 ①（喂任务 D / SECURITY）**：对「AI / 第三方产出的代码」用 **沙箱 + 代码签名** 兜安全——是我们 iframe sandbox 与「装已签名二进制」策略的现成先例。
  - **可借鉴 ②（喂 Gateway / Agent 侧）**：本地 + 云 LLM 提供商抽象（Ollama / LM Studio / Llama.cpp + OpenAI / Anthropic / Gemini），印证「任意 Agent / 任意后端」方向。
  - 立场印证：拒绝 Electron、走原生（与我们选 Tauri 同向）。
  - 不通用：macOS / Swift 栈，代码层面不可直接复用。
