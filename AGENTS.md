# MapleBirchCE-CoT 仓库纪律（AI 协作）

> 本项目是 DoL 版 MapleBirchCE 向 CoT（Course of Temptation 0.8.2i）的移植：**按全新游戏对待，仅复用 DoL 经验**（工作流、纪律、框架形态），不搬任何 DoL 模组代码/键/内容。独立仓库、独立版本线。全局纪律：输入代码前先自检；测试先行（tdd 红绿循环）；回归原始材料，不用二手摘要；输出写明方法/工具；结论必须配套验证。

## 硬约束

1. 只改 `javascript/src/*.js`；打包产物 `javascript/maplebirchce-cot.js` 由构建生成，绝不手改。
2. 版本双源必须同步：`javascript/src/01-core.js` MCE_VERSION 与 `boot.json` version。
3. 改码前先快照基线（涉及文件 SHA256 存 `.selfcheck/`）；出现异常优先回滚，不硬修。
4. 默认验证 = 静态取证 + 单元测试 + 打包 verifier + 消费端人工实机；**实机冒烟（moli）按用户指令停用为默认门禁（太慢）**，工具留档 `tools/cot_smoke.ps1` 仅供按需复核。交付汇报按三份清单（改动点补丁 / 验证层 / 玩家路径走查）。
5. **不升版本、不发布、不擅自清理用户文件**——三者均需用户明确指令（D4 已定：先不发）。

## 已验证事实（实测取证，勿凭印象改）

- 双端 loader 同版：`ModUtils.version = '2.101.1'`（webpack `src/BeforeSC2/Utils.ts`），CoT 与 DoL HTML 逐字相同 → loader API 零代差。
- `window.modUtils` 经 `thisWin.modUtils = thisWin.modSC2DataManager.getModUtils()` 暴露；`window.modSC2DataManager` 可用（`getSc2EventTracer()` / `getModLoader().getModZip(name)` 等，ModI18N earlyload 实证）。
- boot.json GameVersion 依赖：照抄 ModI18N 的 `=0.8.2-i`（社区已发版实证；P0 冒烟复核 loader 实际传参，若不符即改）。
- mod 旁加载（LocalStorage）：`CoTmodDataLocalStorageZipList` = JSON 数组（名字符串）；每模组键 = `${CoTmodDataLocalStorageZipPrefix}:<name>`（前缀默认值以 scan6 取证为准），值为 zip 的 base64。
- CoT 变量模型：PC 中心 `$pc*`（`$pcskills/$pcstats/$pcneeds/$pcmoney/$pcinclinations/...`）；时间 `$day/$hour/$minute/$year/$gameday/$gameyear`；人物注册 `setup.people`；无 `$traits/$scenes/$scenePassages/$love/$dom`。
- CoT 0.8.2i HTML **内置 16 个官方 mod**（ModLoaderGui/ConflictChecker/ImageLoaderHookCore/ModSubUiAngularJs/BeautySelectorAddon/CheckGameVersionCot/ImageLoaderHook2BeautySelectorAddon/TweeReplacerLinker/TweeReplacer/I18nTweeReplacer/I18nTweeList/I18nScriptList/ReplacePatcher/ModuleCssReplacer/TweePrefixPostfixAddon/SweetAlert2Mod）；内置 **CheckGameVersionCot** 从 passage 提取 `Config.saves.version = "v0.8.2i"`（实机日志实证，含 v 前缀）。
- boot.json GameVersion 依赖写法 `=0.8.2-i` 照抄已发版 ModI18N；CheckGameVersionCot 的具体匹配规则尚未取证（P1 静态取证确认该写法不会被拦截）。
- loader 另有 RemoteLoader 通道（远程 modList.json）；本机 HTTP 缺该文件会产生 SyntaxError 噪音，不影响 LocalStorage/IndexedDB 本地通道。
- 消费端：`C:\Users\27352\Doubao\chats\2026-11-04\new-chat\cot-game\`；moli：`C:\Users\27352\AppData\Local\moli\moli-v1.1.19-x86_64-pc-windows-msvc\moli.exe`。

## 已知边界

- 实机冒烟按用户指令停用为默认门禁（太慢）；交互层验证走消费端人工实机 + 玩家路径走查，注入层以静态取证为准。
- CoT 版本时效：社区可见 0.8.4c（2026-10-14）；升版必须重跑键核验闭环。
- 与 ModI18N 共存：CE 面板中文写死、不依赖 i18n.json；CSS/DOM 冲突面纳入冒烟。
