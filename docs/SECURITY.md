# 安全与责任边界

AIRP 的 widget/插件系统是**开放**的：任何第三方都能用自己的命名空间发布 widget 接入本 UI。随之而来的安全责任，按下面的边界划分。**核心原则：我们暴露接口、守护宿主自身；我们不审核插件；插件带来的其他风险由用户自行选择承担。**

## 我们负责（宿主自身安全 —— 必须守）

1. **Capability 强制**：widget 在 manifest 中声明所需 capability（`read:memory` 等）。宿主 / Gateway **强制**这些边界——widget 不能越权。越权调用被拒。
2. **不泄露宿主自身的秘密**：Gateway 的 bearer token、其他未授权 scope 的状态，默认不暴露给 widget。widget 之间、widget 与宿主内部相互隔离（按授予的 capability 给数据，不多给）。
3. **知情同意**：启用一个 widget 前，如实展示它的来源（manifest `entry.source`）和申请的 capability，让用户在知情的前提下选择。我们负责"如实告知"。
4. **错误隔离**：单个 widget 抛错 / 崩溃不应拖垮整个宿主（`WidgetHost` 用 `onErrorCaptured` + `try/catch` 兜住）。

## 我们不负责（用户自行承担）

- **不审核、不扫描、不担保** widget 的代码安全性。
- **不替用户判断**某个 widget 是否可信。
- **不强制沙箱**。是否隔离运行由用户选择（见下）。

> 类比心智：宿主守好自己的边界与权限模型；是否信任某个 widget、是否安装它，是用户的决定与风险。我们不为任何第三方 widget 背书。

## 信任分级（加载方式）

| 级别 | 加载 | 隔离 | 适用 |
|------|------|------|------|
| `builtin` | 随宿主打包（原生 Vue 或 module） | 全信任 | 第一方 |
| `esm`（in-process） | 运行时 `import(source)`，跑在宿主 JS 上下文 | 无隔离 | 用户主动安装、自担风险 |
| `esm` + `sandbox`（规划中） | 装进沙箱 iframe，`postMessage` 走同一套 `WidgetContext` | 强隔离 | 不可信来源（用户自选） |

`sandbox` 是**给用户的可选项**，不是宿主的义务。无论哪级，capability 一律由宿主强制。

## 与"不跑 Agent 生成代码"的区别

- **Agent 生成的 UI 代码**：机器输出、不可信 → 默认**拒绝执行**。UI 只渲染声明式 Blueprint（见背景文档 §2）。
- **第三方 widget**：人写的、用户**主动安装**的插件 → 用户自担风险，宿主只守自身边界。

两者信任来源不同，策略不同。
