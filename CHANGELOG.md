# CHANGELOG

## [0.7.2] - 2026-11-05

R15 用户反馈四条（切页卡顿 / 地点未翻译 / 倾向不全 / 悬浮球不可拖）逐条整改：

### ① 切页卡顿与渲染慢（对标 DoL 版的分级导航思路）

- **页签 DOM 缓存**：每页首次构建后保留子节点，切走只做「摘挂」，切回直接复挂，不再 `innerHTML=""` 全量重建。命中/重建次数与上次构建耗时记入 `M.perf`，关于页「自检详情」可查（定位后续卡顿有据可依）。
- **写入后精确置脏**：写入成功只把「非当前页」标脏（`invalidateOthers`），连续改值不会反复清缓存；**重新打开面板时全量失效**，保证数据新鲜。
- **懒渲染大块**：98 项倾向清单、NPC 全字段 JSON、Findr 全字段 JSON 改为 `details` 首次展开时才构建（此前每个 NPC 卡都即时 `JSON.stringify` 整个对象，是关系页首渲染卡顿主因）。
- 常用倾向恢复为 20 项 chip（此前把 20 项表扩到 98 后会一次铺 98 个 chip）。

### ② 地点跳转列表翻译

取证：直接对 i18n 的 `typeB.TypeBOutputText` 逐条匹配 `"<passage 键>": {name: "…"`，命中 12/13（来源文件 `database_maps.js`）：

| passage | 中文名 | passage | 中文名 |
|---|---|---|---|
| Campus | 校园 | SummitMarket | 顶峰市场 |
| ChamberlainHall | 钱伯兰大厅 | ThoreauBuilding | 梭罗大楼 |
| EmersonBuilding | 埃默森大楼 | BangCoffee | 邦咖啡 |
| HallowellBuilding | 哈洛韦尔大楼 | BlodgettGym | 布洛杰特体育馆 |
| SmithLibrary | 史密斯图书馆 | YourDorm | 你的宿舍 |
| NutmegSt | 豆蔻街 | RiverRat | 河鼠 |
| HousingRoom | （汉化包无对应 name，保留专名） | | |

- 展示形态为 **「中文名（passage 专名）」**——既满足中文可读，又保留写入时需要的原始键；当前地点/上一地点也按此显示。
- 上一版 R13b 那句「passage 专名不译」已替换为实测依据说明。

### ③ 倾向/特质不全（98 键补全）

- 取证结论：ModI18N 词表里**不存在** `Open Relationships` / `Insecure` / `Polyamorous` 等倾向键（原始 JSON 全量搜索 0 命中），说明游戏侧倾向名从未汉化，用户看到的英文键不是我们的映射缺失。
- 因此 `MCE_INCL_ZH` 由 20 项扩为 **98 项全量语义译名**（与 `setup.inclinations` 的 98 键逐一对齐，单测断言 98/98 且每项含中文）。
- 完整清单 chip 显示 **「中文（英文键）」**，写入仍用英文键；「常用 20 项」单独作为快选区，保持面板不臃肿。
- 直输中文反查（`normIncl`）因词表补全，98 键中文均可反查。

### ④ 悬浮球可拖动换位

- FAB 补 `mousedown` / `touchstart` / `touchmove({passive:false})` / `touchend`，拖动阈值 6px 与「点按开合」区分（`fabMoved` 抑制 click）。
- 位置持久化 `mbCE_cot_ui_fab`，坐标按视口 `clamp`（`clampToView`），换屏/旋屏后越界则丢弃回默认位；`touch-action:none` 防止浏览器接管手势。
- 注意：`touchstart` **不** `preventDefault`（否则触摸后浏览器不再派发 click，点按开合会失效）。

单测 71 → **76 项**；产物 SHA256 `733331533D55BE5B27673E0C2714964F05ABB32AABDB107EC318A9F3B68F43EE`（安装包见 `.selfcheck/r15-perf-i18n-fab.txt`）。

### 追加：R15b/R15c 自我扫描（同日，无审批连续自查）

四条反馈落地后又做了一轮代码审查，共修 13 处（单测 76 → 86）：

| 类别 | 问题 | 修法 |
|---|---|---|
| 崩溃 | `activateTab` 收到无效 id 时 `tab` 仍是 undefined，紧接读 `tab.label` 抛 TypeError（存档值被写坏即触发） | 回落时同时把 `tab` 指向 `TABS[0]` |
| 卡顿 | 连点当前页签命中"同页强制重建"，白重建一次 | `renderContent(tabId, force)` 加 `force`，正常切页不强制 |
| 卡顿 | FAB 把 `touchmove({passive:false})` **常驻**挂 document，浏览器无法把整页滚动移出主线程（拖慢整个游戏页滚动） | 按下才注册、松手即移除 |
| 体验 | 触摸拖动后浏览器可能不派发 click，`fabMoved` 一直为 true，吞掉下一次点按 | 拖动结束 400ms 定时兜底复位 |
| 体验 | FAB 位置恢复只判上界不判负值，且按 24px 余量算（球实际 52px） | 恢复时按视口 clamp 并回写 |
| 一致性 | 地点跳转后状态行写裸专名（中文名丢失），上一地点不刷新 | 统一走 `locLabel` 的 `refreshLocLines`，用节点引用代替 `getElementsByTagName` |
| 性能 | 数值页过滤每键 N 次 `getAttribute` + N 次样式写 | 渲染时缓存 `_mbceKey`，display 只写变化的 |
| 性能 | 关系页 NPC 过滤同上；空结果提示每键重写文本 | 缓存 `_mbceName`/`_mbceCats`，文本变才写 |
| 性能 | 点一个倾向 chip 要刷新 118 个 chip 的 className | 缓存 `_mbceInc`，className 只写变化的；分类/关系 chip 同改 |
| 内存 | 关闭面板后数百节点仍挂在 `display:none` 子树 | 关闭时 `invalidate()` + 清空内容节点 |
| 可用性 | A-/A+/W-/W+ 是无样式 `span`，像普通文字、触摸目标过小 | 补按钮样式（30×26、圆角、`touch-action:manipulation`） |
| 交互 | 从 A-/A+/W-/W+ 起手拖标题栏会同时改字号/宽度 | 起手目标命中这几个按钮时不启动拖拽 |
| 计时 | `lastBuildMs` 用 `Date` 毫秒差，常见 0ms 看不出慢页 | 优先 `performance.now()`，保留一位小数 |

单测 **86 项**；产物 SHA256 `36D1F75E07F3A0C40AD9972754B4F686BE9B66624F0D67DF7A5D7D4283ACDE14`。

**发布记录（2026-11-05）**：Release v0.7.2 https://github.com/TXF182/MapleBirchCE-CoT/releases/tag/v0.7.2 （id 435317810，draft=false，assets=1）；资产 `MapleBirchCE-CoT-0.7.2.mod.zip` 36590 B，`state=uploaded`，GitHub digest `sha256:ce45fc6dfb278862146f790362e58f77dce637feba92f01cf752910979e679c1`（与本地一致）；下载链接实测 302 → 200、`Content-Length: 36590`。

## [0.7.1] - 2026-11-05

R14 自我扫描整改（无审批连续自查，按「直到自己找不出问题」执行）：

- **手机可拖动面板**：拖拽此前只绑定 mousemove（手机无效），补 touchstart/touchmove/touchend（`passive:false` 才能 preventDefault）。
- **面板位置越界保护**：恢复 `mbCE_cot_ui_pos` 时校验坐标是否仍在视口内；换屏/旋屏后出视口则丢弃旧坐标回默认位置（此前会让面板跑到屏幕外找不回）。
- **内容滚动修复**：`.mbce-body` 补 `flex:1 1 auto; min-height:0` —— 面板 `overflow:hidden` 下长内容（98 倾向 + 21 声誉格）此前有后半段不可滚达。
- **倾向 chip 溢出**：倾向 chip 容器由 `.mbce-row`（不换行）改为 `.mbce-chips`（flex-wrap）；技能阶段行改 `.mbce-row mbce-wrap`，等级输入框 `.mbce-lv`（56px）。
- **写入留痕**：`$mbCE_wrote` 单条记录对对象/数组做快照（此前存引用，事后再改原对象会让历史记录失真）；留痕上限 200 条（超出截断保留最近，防存档膨胀）。
- **写成功也反馈**：`rowEl` 保存成功时状态栏显示「已写入 键 = 值」；此前只有失败提示，用户看不到成功。
- **技能值行 ↔ 阶段行同步**：改值/一键满值后阶段行 Lv 文本即时刷新（此前改值后阶段行停在旧值）。
- **分类 chip 带人数 + 空结果提示**：分类按钮显示「（N）」；筛选结果为空时显示「当前筛选无匹配人物，共 N 人」。
- **页签渲染兜底**：单页 render 抛错时显示错误信息，不再整块空白。
- **文案清理**：关于页「骨架版」→「作弊面板」；决策行「D4 先不发」→「D4 已解除（v0.6.10 起已发布）」（原为事实错误）；悬浮球 title 与文件头注释同步去掉「骨架 / P1 门」；状态栏版本号改读 `M.version`（避免升版漏改）。
- **关于页补齐**：UI 偏好键列表补第 7 个 `mbCE_cot_ui_width`；新增游戏实际版本（`Config.saves.version`）与目标的比对提示。
- **自检键**：`setup.mbStageCE.stage` 由写死 `"P1"` 改为 `"ready"`（单测同步）。
- **取证定案**：`$favoritepeople` 是数组（`=[]`/`.push`/`.splice`/`.indexOf`/`.includes` 共 15 处）；唯一一处 `.delete` 在游戏自身 `removepeople` 内，是上游 latent bug，不在 CE 路径。
- 单测扩至 71 项（新增：留痕快照与上限、分类人数与空提示、chip 换行样式、中文倾向 warn）。

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
- 技能行另加「等级」数字框 + 「设等级」按钮（直接填 Lv，写 Lv*100）。`n- 地点页补说明：跳转列表为 passage 专名，游戏内按汉化包显示中文地名。`n- 单测扩至 67 项。

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
