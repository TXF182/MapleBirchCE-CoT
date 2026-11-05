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
- boot.json GameVersion 依赖写法 `=0.8.2-i` 照抄已发版 ModI18N；**校验链路已取证（决定性）**：`DependenceChecker.checkGameVersion(gameVersion)` = InfiniteSemVer `satisfies(parseVersion(gameVersion).version, parseRange(n.version), true)`；GameVersion 在 `checkFor()` 中被跳过，由内置 CheckGameVersionCot 提取 `Config.saves.version`（运行值 `v0.8.2i`，含 v 前缀）后调用。CE 声明与官方同构建 ModI18N 一致（实证）。
- CoT 变量初始化**双轨**：Twine StoryInit passage（tags="util noevents nobr"；`$varsversion=71`；时间 `$day=1/$month=setup.Time.months.indexOf("Autumber")/$hour=8/$minute=0/$year=2019/$gameday=1/$gameyear=1`；PC 顶层 `$pcname="Addison Lee"/$pcnickname/$pcgender="female"/$pcbirthday/$pcage`，另有 `$pcmoney/$pcskills/$pcstats/$pcneeds/$pcinclinations`）+ JS 版本升级器（`vars.pc` 对象、case 阶梯 version++；`$pc` 对象由脚本维护，非 StoryInit 直接声明）。
- P1 产物：`javascript/src/01-core.js`（运行时根+stage 状态机）、`02-shell.js`（悬浮球/面板壳/六页占位/自检徽标）、`03-cot-adapter.js`（安全读写+`$mbCE_wrote` 留痕+`setup.mbStageCE` 自检键）；`tools/pack.ps1`（verifier 4/4 + SHA256，可选 -BuildZip）；`tests/run-tests.js`（18 项单测，node 0 依赖）。
- P2 键模型（实体转义取证）：`$pcmoney=500`；`$pcskills={"Charisma":100,"Willpower":100,"Exhibitionism":0,"Voyeurism":0,"Sexual Knowledge":200,"Disinhibition":100,"Dominance":0,"Submission":0,"Hand":100,"Oral":0,"Vaginal":0,"Anal":0,"Penetrative":0}`；`$pcstats={"age":18,"height":500,"plumpness":400,"muscle":400,"breast size":500,"penis size":500,"ass size":500}`；`$pcneeds={"Food":1000,"Rest":1000,"Relaxation":1000,"Attention":1000,"Bladder":1000,"Hygiene":1000,"Composure":1000,"Release":1000,"Arousal":0,"Satisfaction":0,"Pain":0,"Humiliation":0,"Drunkenness":0}`（1000 满值尺度）；`$pcinclinations=[]`（数组）。
- P2 人物/时间：`$people` = NPC 名 -> 数据对象（`relationship/special/style` 等，Twine 里 `$people[$bestfriend].relationship`）；NPC 数据库 = `setup.people_db()`（`setup.people.db/niches`）；时间系统 = `setup.Time`（`advance_time/minutes_until/clock/weekday/months[]`，`$month` 是 `setup.Time.months` 索引，首月 Autumber=0）；跨天进位由游戏推进，CE 只改 `$hour/$minute`（0-23/0-59 校验）。
- P2 产物：`javascript/src/04-p2-data.js`（键映射表 + 数值页/角色页渲染 + 时间调节 + `$people` 自发现）；shell 页签 render 钩子；版本 0.3.0。
- P3 关系键模型（取证）：恋爱数值轴 = `$people[NPC].attitude[type]`（type ∈ friendship/romance/lust/anger/suspicion/favor/random；`setup.people.set_attitude(name,type,value)` 写入、`alter_attitude` 范围 clamp -1000..1000，romance 上限另受 `setup.Relationships.max_romance` 约束；nevernegative 类型有 anger/suspicion/favor）；`$people[NPC].relationship` = 关系标签（best friend/fuckbuddy/hatefuck/submissive 等，另有 previousrelationship/allrelationships/relationshipChangeDay）；`$people[NPC].partner=="PC"` 表示与玩家恋爱；`$crush` = PC 暗恋对象 NPC 名（事件采样 `if (V.crush == p) interest += 800`）；attractiontopc/attractionfrompc 是 NPC 原型配置标志，非运行数值。class Person 字段：makeup/pierced/name/nickname/species/gender/age/is_student/is_faculty/is_townie/skills/body_parts/pronouns/label/fleeting_stats 等。
- P3 产物：`javascript/src/05-p3-relations.js`（attitude 三轴编辑 + $crush + relationship/partner 只读展示）；版本 0.4.0。
- P4 地点/场景键模型（取证）：`$location` = **Twine passage 名**（`loc:XXX` tag → `$location = tags()[_i].substring(3)`；`people_at_location` 用 `Story.get(HousingRoom|loc).tags` 解析）；已知地点 = Campus/BlodgettGym/ChamberlainHall/EmersonBuilding/HallowellBuilding/SmithLibrary/SummitMarket/ThoreauBuilding/BangCoffee/HousingRoom/YourDorm/NutmegSt/RiverRat；`$previouslocation`、`$locationblock`（区域）；`$peopleatlocation` = NPC 名数组（`setup.people_at_location(loc, locationblock)` 计算，`V.optnpcroomcap||200` 上限）；`$weather` = `setup.Weather.state()` 对象（`todaysWeather/yesterdaysWeather`，非字符串）；`$preencountertags` = 场景标签数组（遭遇结束 `State.setVar("$preencountertags", [])` 重置）；`$lastloc/$lastloctags`（地点标签数组，含 `job:` 前缀标签）；`setup.Findr` = 约会软件（username/uses/on_now/people_on/likes_tags/npc_tags/get_new_match）。
- P4 产物：`javascript/src/06-p4-places.js`（地点跳转 + 天气/在场人物/场景标签/Findr 只读；时间键补全日/月/年/游戏日/游戏年）；版本 0.5.0。
- P5 生态：`javascript/src/07-p5-eco.js` 运行时生态检测（modI18N/ModUtils/modSC2DataManager/setup.mbStageCE）+ about 页生态块 + `M.i18n` 钩子（原文直通，接 i18n.json 留待后续）；官方内置 16 mod 清单；版本 0.6.0。至此六页全部由 data 渲染接管（char/stats/rel/place/scene/about）。
- 测试纪律补充：vm 沙箱内创建的对象（数组等）跨 realm 原型不同，`assert.deepStrictEqual` 会误报「same structure but not reference-equal」——跨 realm 值改用语义断言（Array.isArray + length / 标量 ===）；render 路由测试的「未接管页」用不存在的 tab（`nope`）断言 fallback。
- P6 回归（0.6.0）：7 源 `node --check` + 33 单测 + verifier 4/4 + SHA256 `651312F8...B68EE6F`；`dev.ps1` [1/3] 语法检查改为动态扫描全部 src/*.js（P6 回归修复，此前硬编码 3 文件漏检 04-07）；产物模块标记核验 M.i18n/mbCE_cot.data/mbStageCE/mbCE_wrote 就位（rel/places/eco 由单测直证）。发布待命：D4。
- 0.6.1 优化：`M.i18n` 基础在 01-core（`t` 原文直通 + `reasons` 汉化表 + `reason(code)`：range:* 前缀动态汉化、未知码保底原样）；07 的 `eco.i18n` 引用 `M.i18n`（不再自建）；04/05/06 状态栏统一 `M.i18n.reason`。单测 35 项。`tools/pack.ps1` 的 `$order` 与 `tests/run-tests.js` 的 `ORDER` 必须同步（两侧均有注释）。
- 0.6.3 取证与边界（scan13/scan13b.out.txt）：`setup.Weather = {}` 为方法容器（twine-user-script #73 weather.js）；`$weather` 在时间推进时被重建（`V.weather = setup.Weather.state()` 继承旧值）→ **直改 $weather 不持久，保持只读**。`setup.Findr = {}` 为方法容器（twine-user-script #5 findr.js：username/uses/on_now/people_on/likes_tags/npc_tags/get_new_match，NPC 在线实时计算）；玩家 Findr 状态在 **`$findr`**（`{name,tags[],liked[],disliked[],matched[]}`，注册时创建，passage 用 push/delete 维护）→ 可编辑 `$findr` 字段（tags 有效值 Open/Poly/Romance/Hookups/Dominant/Submissive/Exhibitionist/Voyeur 来自 likes_tags 检查集）；`$findr` 缺失拒绝（reason `no-findr`）。数值页四组 `<details>` 折叠块（默认展开）。单测 39 项。
- 0.6.4 增强（R6）：页签记忆（`mbCE_cot_ui_tab` 存 lastTab，`M.shell.activateTab/activeTab`）；`$people` 深层字段编辑 nickname（文本）/age（1-120）走 writePersonField；Findr tags 改 chip 选择器（FIND_TAG_HINTS 8 项，点击即时写 `$findr.tags`、再点取消）。单测 42 项。
- 0.6.5 增强（R7，scan14/14b/14c.out.txt）：`Person.skills` 键来自 `setup.Skills.all_skills()`=mainskills+otherskills，值域 0-100（`setup.people.skill_level*100`），游戏命令直改 `pdata.skills[skill]` → NPC 技能编辑自发现现有键渲染（writeSkill，容器缺失先建，0-100 校验）；`name_known` 构造时由 `setup.people.is_known` 定（=people[name].known），passage 显示真名用 `_partner.name_known` → 已知状态切换写**双键** name_known+known（模仿 `setup.people.make_known`）；gender/label 构造时定（gender 改字段不随动 body_parts/pronouns/label）；面板拖拽（标题栏 mousedown→mousemove 改 left/top）+ 字号 A-/A+ 12-16px 持久化 `mbCE_cot_ui_font`（`M.shell.setFont/fontSize`）。单测 45 项。
- 0.6.6 增强（R8，scan15.out.txt）：relationship 字符串赋值仅见 `"best friend"`（其余枚举在 setup.Relationships.db/物品 appeal/findnpc 用），编辑=4 枚举 chip 即时写+自定义文本+清除；`$crush` 纯字符串 NPC 名（无 stage 对象，`V.crush == person` 比较）→ 下拉选择+文本输入；year 赋值样本 1/3（学年制）→ 校验 1-10；major 文本；数值页折叠记忆 `mbCE_cot_ui_stats`（记收起组 gid：top/GROUPS id，默认展开）；关系页每 NPC 折叠块（默认展开）。单测 49 项；mock 元素已支持 getAttribute/setAttribute。
- 0.6.7 增强（R9）：数值页顶部搜索过滤（输入即时过滤行，行带 data-key）；面板拖拽位置持久化 `mbCE_cot_ui_pos`（{left,top} JSON，恢复清 right/bottom）；关系页 NPC 折叠记忆 `mbCE_cot_ui_rel`（记收起 NPC 名数组）。UI 偏好键全集：`mbCE_cot_ui`(开合) / `_ui_tab`(页签) / `_ui_font`(字号) / `_ui_pos`(位置) / `mbCE_cot_ui_stats`(数值折叠) / `mbCE_cot_ui_rel`(NPC 折叠)。单测 52 项；0.6.7 安装包 zip SHA 29AF3265...A9965。
- 0.6.8 增强（R10）：角色页 PC 基本信息改为可编辑（pcname/pcnickname/pcgender/pcage/pcmajor/pcspecies 顶层直写，pcage 1-120，`M.data.writePcField`）；关系页 NPC 搜索过滤（data-name）；关于页自检详情（模块 stage/适配器目录+wrote 计数/UI 偏好键）。单测 55 项。
- 0.6.9 增强（R11）：`$pcskills` 一键满值（13 键写 100）/重置本组（渲染时快照）→ `M.data.applyGroupValue/resetGroup`；关系页每 NPC 全字段只读 JSON 查看器（循环引用/函数时提示）；面板宽度 W-/W+ 300/340/380px 持久化 `mbCE_cot_ui_width`（`M.shell.setWidth/panelWidth`）。UI 偏好键全集 7 个：`mbCE_cot_ui`(开合)/`_ui_tab`(页签)/`_ui_font`(字号)/`_ui_pos`(位置)/`_ui_width`(宽度)/`mbCE_cot_ui_stats`(数值折叠)/`mbCE_cot_ui_rel`(NPC 折叠)。单测 58 项。
- 0.6.10 增强（R12，scan16.out.txt）：`$pcinclinations` 为**数组**（游戏 `V.pcinclinations.push/indexOf/splice` 维护，`setup.add_inclination/remove_inclination`；有效值来自 `setup.inclinations` 对象键，如 Insecure/Shy/basic_exhibitionist，词表大不硬编码）→ 角色页逗号分隔数组编辑（中英文逗号，留空清空）`M.data.writePcInclinations`；场景页 Findr 全字段只读 JSON 查看器；数值页一键重置全页（TOP+全部组渲染时快照写回）`M.data.resetAll`。单测 61 项。
- 0.6.10 安装包：`MapleBirchCE-CoT-0.6.10.mod.zip`（ZIP SHA256 `BC81670CDFC333811BFB73778889E041BD50E5E1E773BA0FF0D0B59F94A63C7D`，内部 js SHA=100C7A51...9686F；核验见 `.selfcheck/zip-build-0610.txt`）。发布待命：D4 先不发，实际发布需用户明确指令；实机冒烟 D6 非默认门禁。
- 发布（2026-11-04，用户明确指令，D4 解除）：新开 GitHub 仓库 `TXF182/MapleBirchCE-CoT`（https://github.com/TXF182/MapleBirchCE-CoT，独立于 DoL 版 TXF182/MapleBirchCE）；master 全提交线 + tag v0.6.10 已推送；Release v0.6.10（https://github.com/TXF182/MapleBirchCE-CoT/releases/tag/v0.6.10）已建，资产 MapleBirchCE-CoT-0.6.10.mod.zip（22722 B，state=uploaded）。发布说明不含版本线列表（用户偏好）。PAT 全程内存使用不落盘（git credential fill 喂 stdin 取，remote 为裸 URL）。
- loader 另有 RemoteLoader 通道（远程 modList.json）；本机 HTTP 缺该文件会产生 SyntaxError 噪音，不影响 LocalStorage/IndexedDB 本地通道。
- 消费端：`C:\Users\27352\Doubao\chats\2026-11-04\new-chat\cot-game\`；moli：`C:\Users\27352\AppData\Local\moli\moli-v1.1.19-x86_64-pc-windows-msvc\moli.exe`。

## 已知边界

- 实机冒烟按用户指令停用为默认门禁（太慢）；交互层验证走消费端人工实机 + 玩家路径走查，注入层以静态取证为准。
- CoT 版本时效：社区可见 0.8.4c（2026-10-14）；升版必须重跑键核验闭环。
- 与 ModI18N 共存：CE 面板中文写死、不依赖 i18n.json；CSS/DOM 冲突面纳入冒烟。

## R13 记录（0.7.0，用户实机截图整改）

- **汉化残留**：底部脚注（02-shell 的 statusEl 初始文案）与角色页 `$people` 列表 `· special` 已改；检查渲染路径时注意「角色页」与「关系页」是两条独立渲染代码（R3 只修了关系页）。
- **技能阶段**：游戏等级 = `floor(值/100)`，进度 = `值%100`（实测 121 → 等级 1、进度 21%）；`setup.people.skillleveled(name, skill, lvl)` 语义为 `lvl <= 等级 || lvl == 1`。CE 阶段按钮写 `(Lv±1)*100`。
- **声誉**：`$reputation = {类型:{群体:数值}}`；类型固定 7 个（exhibitionism/promiscuity/studiousness/reservedness/kindness/meanness/popularity），群体 3 个（student/townie/faculty），来自 `setup.people.calculate_reputation`。
- **社媒/职业**：`$streaming` 为平台对象、`$jobs` 为数组、`$riverrat.jobtitle` 为餐厅打工岗位；三者均由游戏按日结算派生，CE 仅只读展示，不写入。
- **人物分类**（全部来自游戏函数，勿自造判定）：`V.favoritepeople`（关注）、`all_romantic_partners()`、`V.crush`、`all_friends()`、`all_acquaintances(true)`、`all_admirers()`、`all_special()`、`all_faculty()`、`all_coworkers()`、`all_exes()`、`is_rival(name)`。
- **倾向**：`setup.inclinations` 共 98 键；CE 中文名表 `MCE_INCL_ZH` 只覆盖常用 20 项，其余保留英文键（专名不译）；`writePcInclinations` 支持中文名反查英文键。
- **模块陷阱**：`readGroup()` 的参数是**路径**（如 `pcskills`）不是组 id（`skills`）——曾因此让阶段行全部读成 0。
- 自检归档：`.selfcheck/r13-stages-cats-i18n.txt`；单测 67 项。
## R14 记录（0.7.1，自我扫描）

- **`$favoritepeople` 定案**：数组。全库 =[]/push/splice/indexOf/includes 共 15 处；`V.favoritepeople.delete(name)` 仅 1 处且位于游戏 `removepeople`（对数组调 .delete 属上游 latent bug），CE 不触发。
- **面板容器**：panel 是 `overflow:hidden` + flex column，`.mbce-body` 必须 `flex:1 1 auto; min-height:0` 才能滚动；缺 min-height 会让长内容下半段不可达。
- **拖拽**：触摸需 touchstart/touchmove(passive:false)/touchend；只绑 mouse 事件手机端完全无效。
- **位置记忆**：恢复前必须校验坐标在视口内，否则换屏后面板可能落在屏幕外且无法找回。
- **留痕**：`$mbCE_wrote` 对对象/数组存快照（引用会失真），并限制 200 条。
- **`rowEl` 成功反馈**：写成功必须给状态栏提示，否则用户无法区分「没点中」与「已写入」。
- **文案会腐烂**：`setup.mbStageCE.stage`、关于页「骨架版」、决策行「D4 先不发」都属同类残留——扫陈旧文案时按「阶段标记 / 决策 / 版本号」三类关键词全库 grep（`骨架|P1|先不发|调试面板|D4`）。
- **版本号**：UI 文案一律读 `M.version`，不再手写。
- 单测 71 项；自检归档 `.selfcheck/r14-selfscan.txt`。
## R15 记录（0.7.2，用户反馈四条）

- **切页卡顿**：修复手段是「页签 DOM 缓存 + 摘挂复用」，不是减少内容。`renderContent` 里 `renderedTab` 记录当前页、`tabCache` 存子节点数组、`tabStale` 标记脏页；切走时 `snapshot` 留节点、切回 `restoreCache` 复挂。`clearBox` 要同时处理真实 DOM（removeChild 循环）与测试桩（`children.length = 0`）。
- **置脏策略**：写入成功 → `invalidateOthers(当前页)`；打开面板 → `invalidate()` 全清。只清一个方向会要么显示陈旧值、要么缓存永不命中。
- **懒渲染钩子**：`details` 内的重块（98 倾向 chip / NPC 全字段 JSON / Findr JSON）在 `toggle` 首展开时构建；测试桩 `addEventListener` 是 no-op，因此实现挂了 `node._mbceBuild` 供单测直接调用——没有这个钩子，懒渲染部分不可测。
- **倾向中文**：i18n 全量搜 `Open Relationships`/`Insecure`/`Polyamorous` **0 命中**，说明游戏侧倾向名从未汉化；98 项中文只能 CE 自建译名。别再尝试从 i18n 抽倾向名。
- **地点中文**：可行路径是 i18n `typeB.TypeBOutputText` 里 `"<passageKey>": {name: "…"`（`database_maps.js`），12/13 命中；`Campus` 的 name 在独立条目 `name: "校园"`，`HousingRoom` 无 name。
- **FAB 拖拽**：`touchstart` **不能** `preventDefault`（否则浏览器不再派发 click，点按开合失效）；只在 `touchmove` 里 prevent。FAB 需 `touch-action:none`。拖动阈值 6px + `fabMoved` 抑制 click。
- **常/全两套表**：`M.inclCommon`（20 项快选）与 `M.inclZh`（98 项全量）分开——扩充 `inclZh` 时不能直接把它当常用区，否则角色页一次铺 98 个 chip。
- 单测 76 项；自检归档 `.selfcheck/r15-perf-i18n-fab.txt`。