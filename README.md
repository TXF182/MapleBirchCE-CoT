# MapleBirchCE-CoT · CoT 全局调试面板（移植项目）

> 将 DoL 版 MapleBirchCE（v1.9.27）移植到 Course of Temptation（CoT 0.8.2i）。
> 独立仓库、独立版本线、与 DoL 版解耦。当前状态：**R14 自我扫描整改完成，当前版本 0.7.1**。

## 发布（2026-11-05 追加 v0.7.1）

- **GitHub 仓库**（新开，独立于 DoL 版 `TXF182/MapleBirchCE`）：https://github.com/TXF182/MapleBirchCE-CoT
- **Release v0.7.1**：https://github.com/TXF182/MapleBirchCE-CoT/releases/tag/v0.7.1 （Release id 435262318，tag 指向 `f3a73bc`）
- **安装包资产**：`MapleBirchCE-CoT-0.7.1.mod.zip`（30156 B，SHA256 `C9AF5FBCD03D786590AC470DCF66A01AC2633F51FB3F2CAB08A72EECC459F7BE`；GitHub 回读 digest 一致）→ https://github.com/TXF182/MapleBirchCE-CoT/releases/download/v0.7.1/MapleBirchCE-CoT-0.7.1.mod.zip
- 上一版（历史）：Release v0.6.10 https://github.com/TXF182/MapleBirchCE-CoT/releases/tag/v0.6.10
- 实机冒烟（D6）：非默认门禁，按需执行——游戏内 Mod 管理器加载 zip → 刷新 → 右下金色悬浮球。

## 阶段进度（移植方案 7 阶段）

| 阶段 | 内容 | 状态 |
|---|---|---|
| P0 环境基线 | cot-game 消费端 + 新仓库骨架 | ✅ 0.1.0 |
| P1 CE 骨架 | 最小可加载 mod + 悬浮球/面板壳 + CoT 键适配层 | ✅ 0.2.0 |
| P2 数值/角色页 | 键映射表 + 数值/角色页 + 时间调节 | ✅ 0.3.0 |
| P3 关系/恋爱页 | attitude 三轴 + $crush + 关系标签 | ✅ 0.4.0 |
| P4 场景/地点页 | 地点跳转 + 天气/在场人物/场景标签 | ✅ 0.5.0 |
| P5 CoT 生态适配 | 生态检测 + about 页 + I18n 钩子 | ✅ 0.6.0 |
| P6 回归与发布就绪 | 全量验证 + 模块接入核验 + 发布待命 | ✅ 0.6.0 |

## 决策记录（2026-11-04 用户拍板）

| 决策 | 结论 |
|---|---|
| D1 源码组织 | **新仓库**（本目录），不动 DoL 版 MapleBirchCE |
| D2 目标版本 | **CoT 0.8.2i**（现包起步；升版走既有键核验闭环） |
| D4 发布 | **先不发**（无用户指令不发布） |
| D5 看待方式 | **全新游戏**：仅复用 DoL 经验（工作流/纪律/框架形态），不搬任何 DoL 模组代码、键模型、内容 |
| D6 验证方式 | **实机冒烟非默认门禁**（用户：不用实机，太慢）；默认验证 = 静态取证 + 单元测试 + 打包 verifier + 消费端人工实机 |

## 双端事实基线（实测取证，见移植方案文档）

- CoT 0.8.2i 与 DoL 0.5.12.13 两个 HTML 内嵌 **同一版 ModLoader 引擎 2.101.1**（`ModUtils.version`，webpack 源码逐字相同）→ loader 层零代差。
- `window.modUtils` 暴露一致；mod 旁加载：LocalStorage + IndexedDB（无 mods/ 目录）。
- CoT 无 maplebirch 框架、无 DoL 键模型（无 `$traits/$scenes/$love/$dom`），PC 中心 `$pc*` 模型 → 游戏逻辑层全部重写。
- CoT 内部版本：`Config.saves.version = "v0.8.2i"`，`$varsversion = 71`。

## 目录职责

- `javascript/src/*.js`：源码（只改这里；打包产物 `javascript/maplebirchce-cot.js` 由构建生成，绝不手改）
- `twee/`：widget（`maplebirchce-cot-widget.twee`）
- `tests/`：单元测试（tdd 红绿循环；node 0 依赖）
- `tools/`：打包（pack.ps1，verifier 4/4）/ 冒烟（cot_smoke.ps1，按需）/ 快照 / 键核验工具
- `.selfcheck/`：基线快照（SHA256）
- 消费端：`C:\Users\27352\Doubao\chats\2026-11-04\new-chat\cot-game\`（CoT HTML + ModI18N + 基线）

## 验证与纪律

- 每次改码交付前：三份清单（改动点 / 验证层 6 步全链 / 玩家路径走查）；改码前先快照，异常优先回滚。
- 版本双源必须同步：`javascript/src/01-core.js` MCE_VERSION 与 `boot.json` version。
- 不升版本、不发布、不擅自清理用户文件——均需用户明确指令。
- 实机冒烟（moli）按用户指令停用为默认门禁（太慢）；`tools/cot_smoke.ps1` 留档为按需复核工具。默认验证 = 静态取证 + 单元测试 + 打包 verifier + 消费端人工实机。
- 开发闭环：`dev.ps1` 一键（[1/3] `node --check` 动态扫描全部 `src/*.js` → [2/3] `node tests\run-tests.js` 单测 → [3/3] `tools\pack.ps1` verifier 4/4 + SHA256）。

## 0.7.1 本地安装包

- `MapleBirchCE-CoT-0.7.1.mod.zip`（SHA256 `C9AF5FBCD03D786590AC470DCF66A01AC2633F51FB3F2CAB08A72EECC459F7BE`）
- 0.7.0：`MapleBirchCE-CoT-0.7.0.mod.zip`（SHA256 `D2542F3A88455899668106E7C670B2D7B756ADBA02B6C1E00093877E64917543`）
