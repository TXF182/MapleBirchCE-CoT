# CHANGELOG

## [0.6.0] - 2026-11-04

- P5 CoT 生态适配：`07-p5-eco.js` 运行时生态检测（modI18N / ModUtils / modSC2DataManager / setup.mbStageCE 自检）、about 页生态块（依赖声明 + 官方内置 16 mod 清单 + 使用说明）、I18n 钩子 `M.i18n`（原文直通，接 i18n.json 留待后续）。
- 单测扩至 33 项。

## [0.5.0] - 2026-11-04

- P4 场景/地点页：`06-p4-places.js` 地点跳转（`$location`=passage 名，13 个已知地点 + 自定义）、`$peopleatlocation` 在场人物、`$weather` 只读、`$preencountertags` 清空、`$lastloc/$lastloctags`、Findr 只读；时间键补全日/月/年/游戏日/游戏年（含范围校验，月为索引 0=Autumber）。写入走 adapter 留痕。
- 单测扩至 28 项。

## [0.4.0] - 2026-11-04

- P3 关系/恋爱页：`05-p3-relations.js` 恋爱数值轴编辑（`$people[NPC].attitude.friendship/romance/lust`，-1000~1000 校验，容器缺失自动建）、`$crush` 暗恋对象设置/清空、relationship/partner 只读展示。写入全部走 adapter 留痕。
- 单测扩至 23 项。

## [0.3.0] - 2026-11-04

- P2 数值/角色页：`04-p2-data.js` 键映射表（`$pcskills` 13 键 / `$pcstats` 7 键 / `$pcneeds` 13 键（1000 满值）/ `$pcmoney` / `$pcinclinations`），数值页（金钱 + 技能/身体/需求编辑）、角色页（PC 信息 + `$people` 自发现）、时间调节（`$hour/$minute` 0-23/0-59 校验）。写入全部走 adapter 留痕 `$mbCE_wrote`。
- shell 增加页签 render 钩子与 `.mbce-row/.mbce-in/.mbce-btn` 样式；单测扩至 18 项。

## [0.2.0] - 2026-11-04

- P1 CE 骨架：01-core（mbCE_cot 运行时根 + stage 自检状态机）、02-shell（金色悬浮球 + 六页占位面板壳 + 说明折叠 + 状态栏 + 自检徽标）、03-cot-adapter（CoT 键安全读写 + `$mbCE_wrote` 留痕 + `setup.mbStageCE` 自检键）。
- 工具链：`tools/pack.ps1` 打包 verifier 4/4 + SHA256（可选 `-BuildZip` 本地安装包）；`tests/run-tests.js` 单测 11 项（node 0 依赖，mock SugarCube 环境）；`dev.ps1` 接全链。
- 取证定案：GameVersion 校验链路 = InfiniteSemVer `satisfies(parseVersion(gameVersion).version, parseRange(n.version), true)`；CE 声明 `=0.8.2-i`（与官方同构建 ModI18N 一致）。StoryInit 键模型锁定（时间/PC 顶层键 + `$varsversion=71`）。

## [0.1.0] - 2026-11-04

- Phase 0：仓库初始化（git init + 目录骨架 + boot.json + 版本双源 01-core.js）。
- 消费端基线就位：cot-game（CoT 0.8.2i HTML + ModI18N-0.8.2i-chs-1.0.0.mod.zip），SHA256 归档 `.selfcheck/baseline-20261104.txt`。
- 决策落档：D1 新仓库 / D2 0.8.2i / D4 先不发 / D5 全新游戏看待（仅复用 DoL 经验）/ D6 实机冒烟非默认门禁。
- 方向调整（用户指令）：CoT 按全新游戏对待、仅复用 DoL 经验；实机冒烟停用为默认门禁（太慢），默认验证 = 静态取证 + 单元测试 + 打包 verifier + 消费端人工实机。
- 取证补充：GameVersion 复核实证 `v0.8.2i`（内置 CheckGameVersionCot 提取日志）；发现 CoT HTML 内置 16 个官方 mod；RemoteLoader 通道需 modList.json。
- 移植方案文档：`DoL-Project\CoT-MapleBirchCE-移植方案-2026-11-04.md`（本项目立项依据）。
