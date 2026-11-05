# CHANGELOG

## [0.7.0] - 2026-11-05

R13 大规模质量整改（依用户手机实机截图与逐条批评）：

- **汉化残留清理**：面板底部固定脚注由陈旧的「P1 骨架…」改为「就绪：写入经适配器并留痕 $mbCE_wrote」；角色页 `$people` 列表 `· special` → `· 特殊`（R3 修过关系页同类，本次补角色页渲染路径）。
- **技能按阶段直调**：每个技能行新增「阶段 Lv N（进度 M%）」+ 「等级 −/+」按钮，等级 = floor(值/100)、进度 = 值%100（实测 121 → Lv1/21%，与游戏「等级 + 到下一等级进度」一致），点按钮写 `(Lv±1)*100`，可精确停在阶段起点；技能行改用 `M.skillZh` 中文名。
- **玩家侧面板补齐**：
  - **倾向**（`$pcinclinations`）：常用倾向中文 chip（开放关系/多元恋/半性恋/无性恋/无浪漫/不自信/害羞/自信/善良/忠诚/合群/独行/素食/纯素/鱼素/不忠/挑剔/讨好型/谨慎/热切），点选即时写数组；「完整倾向清单」折叠展开游戏内全部 98 键；文本框支持**直接输中文**（中文名反查英文键，如「开放关系」→ `Open Relationships`）。
  - **声誉**（`$reputation`）：新增折叠块，7 类（暴露/滥交/好学/保守/友善/刻薄/人气）× 3 群体（学生/镇民/教职工）逐格编辑，范围 -1000~1000；`M.data.writeReputation`。
  - **社交媒体 / 职业**（只读）：展示 `$streaming` 平台键与字段数、`$jobs` 列表、`$riverrat.jobtitle`；因粉丝/工资按日结算，直写内部计数会与结算逻辑冲突，故不提供写入。
- **人物页按游戏分类**：关系页新增分类筛选 chip（全部/⭐关注的人/♥浪漫伴侣/💗暗恋/😊朋友/👋认识的人/💗仰慕者/🤝特殊人物/🎓教职工/💼同事/💔前任/👿对手），分类**直接调用游戏原生判定**（`all_romantic_partners/all_friends/all_acquaintances/all_admirers/all_special/all_faculty/all_coworkers/all_exes` + `V.favoritepeople` + `is_rival`）；NPC 卡头部显示所属分类图标，卡内新增「关注 ⭐ / 取消关注」切换（写 `$favoritepeople` 数组）。
- 取证（scan17-22）：`setup.people.skill_level/skillleveled` 语义、`calculate_reputation` 的 7 类 × 3 群体、`setup.inclinations` 98 键全清单、人物分类函数定义块、ModI18N 中文对照（Favorites→关注的人、Faculty→教职工、Voyeurism→窥淫癖 等）。
- 单测扩至 67 项。

## [0.6.10] - 2026-11-04

- R12 三项增强：
  - **场景页 Findr 全字段查看**：Findr 编辑区新增"查看全部字段（只读 JSON）"折叠，展示 `$findr` 完整对象。
  - **$pcinclinations 编辑**：角色页新增倾向编辑行——逗号分隔文本 ↔ 数组（支持中英文逗号，去空项，留空=清空），整体写回留痕；提示值来自 setup.inclinations 键（如 Insecure/Shy/basic_exhibitionist，词表大不硬编码）；`M.data.writePcInclinations`。
  - **数值页一键重置全页**：顶部新增"重置全页"按钮，写回本页渲染时快照（TOP + 全部组键）；`M.data.resetAll`。
- 取证（scan16）：`$pcinclinations` 为数组（游戏 `push/indexOf/splice` 维护，`setup.add_inclination/remove_inclination`）；有效值来自 `setup.inclinations` 对象键。
- 单测扩至 61 项。

## [0.6.9] - 2026-11-04

- R11 三项增强：
  - **$pcskills 一键满值/重置**：技能组顶部新增批量操作行——"一键满值（100）"将 13 键全部写 100，"重置本组"写回本组渲染时快照（均逐键留痕）；`M.data.applyGroupValue/resetGroup`。
  - **$people 全字段查看器**：关系页每 NPC 新增"查看全部字段（只读 JSON）"折叠，展示 `$people[NPC]` 完整对象（含循环引用/函数时提示无法 JSON 展示）。
  - **面板宽度偏好**：标题栏 W-/W+ 循环 300/340/380px，持久化 `mbCE_cot_ui_width` 并恢复；`M.shell.setWidth/panelWidth`。
- UI 偏好键现共 7 个：开合/页签/字号/位置/数值折叠/NPC 折叠/宽度。
- 单测扩至 58 项。

## [0.6.8] - 2026-11-04

- R10 三项增强：
  - **角色页 PC 字段可编辑**：PC 基本信息（姓名/昵称/性别/年龄/专业/种族）从只读改为可编辑（顶层 $ 变量直写留痕；年龄 1-120 校验；注明性别/种族等部分游戏联动由剧情设定，改字段可能不完全联动）；`M.data.writePcField`。
  - **关系页 NPC 搜索**：NPC 列表顶部新增过滤输入框，按 NPC 名即时过滤折叠块（行带 `data-name`）。
  - **关于页自检详情**：新增"自检详情"块——模块 stage（core/adapter/shell）、适配器目录键数与 $mbCE_wrote 留痕计数、当前生效的 UI 偏好键列表。
- 单测扩至 55 项。

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
