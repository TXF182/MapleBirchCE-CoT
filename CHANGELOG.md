# CHANGELOG

## [0.6.7] - 2026-11-04

- R9 三项增强：
  - **$pcskills 搜索过滤**：数值页顶部新增过滤输入框，按键名/路径即时过滤所有行（隐藏不匹配），行带 `data-key` 属性。
  - **面板位置记忆**：拖拽结束保存位置（`mbCE_cot_ui_pos`），重开面板恢复 left/top（清 right/bottom）。
  - **关系页 NPC 折叠记忆**：每 NPC 折叠状态持久化（`mbCE_cot_ui_rel` 记收起 NPC 名），刷新恢复。
- 安装包：`MapleBirchCE-CoT-0.6.7.mod.zip`（ZIP SHA256 `29AF3265...A9965`，结构已验证：boot.json 根 + javascript/ + twee/ + README.md）。
- 单测扩至 52 项。

## [0.6.6] - 2026-11-04

- R8 四项增强：
  - **relationship 枚举 chip**：关系标签从文本输入升级为 4 个枚举 chip（best friend/fuckbuddy/hatefuck/submissive，点击即时写、再点取消=清除、选中高亮、悬停显示中文释义），自定义文本输入保留，另有"清除标签"按钮。
  - **$crush 下拉选择**：暗恋对象新增 NPC 下拉（$people 键，change 即时写），文本输入保留供自定义；确认 $crush 为纯字符串 NPC 名。
  - **people 其他字段**：每 NPC 新增专业（major，文本）与学年（year，1-10 校验）编辑。
  - **分组优化**：数值页四组折叠状态持久化（`mbCE_cot_ui_stats` 记收起组）；关系页每 NPC 变为可折叠块（默认展开，标题含关系摘要）。
- 取证（scan15）：relationship 字符串赋值仅见 `"best friend"`（其余枚举用于 setup.Relationships 体系/物品 appeal/findnpc）；year 赋值样本 1/3（学年制）；$crush 无 stage 对象，全为 `==` 字符串比较；major 文本（psychology/business 等）。
- 单测扩至 49 项（mock 元素补 getAttribute/setAttribute 存取）。

## [0.6.5] - 2026-11-04

- R7 三项增强：
  - **更多 Person 字段**：关系页每 NPC 新增性别（gender，文本）与标签（label，文本）编辑（注明 gender 仅改字段，身体部件/代词/标签在构造时定不随动）；**已知状态**切换按钮（`name_known` + `known` 双键同步写，模仿 `setup.people.make_known` 语义）；`M.rel.markKnown`。
  - **NPC 技能编辑**：每 NPC 技能折叠块（默认收起），按 `V.people[X].skills` 现有键自发现渲染数字行（0-100 校验，容器缺失先建），游戏命令同款直改路径；`M.rel.writeSkill`。
  - **面板拖拽 + 字号设置**：标题栏可拖动面板（改 left/top）；标题栏 A-/A+ 字号循环 12-16px，持久化 `mbCE_cot_ui_font` 并恢复；`M.shell.setFont/fontSize`。
- 取证（scan14/14b/14c）：`Person.skills` 键来自 `setup.Skills.all_skills()` = mainskills + otherskills；技能值域 0-100（`skill_level*100`）；`name_known` 构造时由 `is_known` 定，显示真名判定用 `name_known`（双键 `known`）；gender/label 构造时定。
- 单测扩至 45 项。

## [0.6.4] - 2026-11-04

- R6 三项增强：
  - **页签记忆**：面板记住上次打开的页签（localStorage `mbCE_cot_ui_tab`，开合状态键不变），刷新/重开面板恢复；`M.shell.activateTab/activeTab`。
  - **$people 深层字段**：关系页每 NPC 新增昵称（nickname，文本）与年龄（age，1-120 校验）编辑，Person 实例属性直改留痕；`M.rel.writePersonField`。
  - **Findr 标签选择器 UI**：tags 由逗号文本输入改为 8 个可点击 chip（Open/Poly/Romance/Hookups/Dominant/Submissive/Exhibitionist/Voyeur），点击即时保存、再点取消、选中高亮。
- 单测扩至 42 项。

## [0.6.3] - 2026-11-04

- R5 场景/数值页增强（取证：scan13/scan13b 定向取证 setup.Weather / setup.Findr / $findr）：
  - **Findr 玩家状态可编辑**：`$findr`（name/tags/liked/disliked/matched，逗号分隔文本↔数组，支持中英文逗号）；`$findr` 未注册时拒绝写入并提示（reason `no-findr`，i18n 已汉化）；页面说明 `setup.Findr` 为方法容器（username/uses/on_now/people_on/likes_tags/npc_tags/get_new_match），NPC 在线状态由游戏实时计算不可直改。
  - **天气边界明确**：`$weather` 由游戏时间推进重建快照（`V.weather = setup.Weather.state()`），直改不持久，保持只读并页面说明。
  - **数值页分组折叠**：顶层数值与时间 / 技能 / 身体 / 需求四组 `<details>` 折叠块（默认展开）。
- 单测扩至 39 项。

## [0.6.2] - 2026-11-04

- R4 关系页增强：`relationship` 标签可编辑（已取证枚举提示 + 自定义文本，留空 = 清除）；展示带中文释义（挚友/炮友/相爱相杀/服从）；`M.rel.writeRelationship` + `relLabel`。单测扩至 36 项。

## [0.6.1] - 2026-11-04

- R1 汉化优化：`M.i18n.reason` 错误码汉化表（no-adapter/empty/nan/no-person/parent-missing/range:* → 中文提示），04/05/06 状态栏统一走汉化；07 生态层引用 01-core 的 i18n 基础。单测扩至 35 项。
- R2 边界与一致性：地点页自定义跳转成功后清空输入框；README 开发闭环描述更新（动态语法扫描）；pack/tests 两处 ORDER 加同步纪律注释。
- R3 汉化补漏与全量回归：关系页 `special` 标记汉化为「特殊」；全量复验 7 源 node --check + 单测 35/35 + verifier 4/4 + SHA256 `D7C9FB82...9A0E`。

## [0.6.0] - 2026-11-04

- P5 CoT 生态适配：`07-p5-eco.js` 运行时生态检测（modI18N / ModUtils / modSC2DataManager / setup.mbStageCE 自检）、about 页生态块（依赖声明 + 官方内置 16 mod 清单 + 使用说明）、I18n 钩子 `M.i18n`（原文直通，接 i18n.json 留待后续）。
- 单测扩至 33 项。
- P6 回归与发布就绪：全量验证 7 源 `node --check` + 单测 33/33 + pack verifier 4/4 + 产物 SHA256 `651312F8A6C9C358B5A3A2423B8B23F4170A051AAF34701E1272D2388B68EE6F`；模块接入核验通过；`dev.ps1` 语法检查从硬编码 3 文件改为动态扫描全部 `src/*.js`（回归修复）。**发布待命（D4：无用户指令不发布）。**

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
