/* ============================================================================
 * run-tests.js — MapleBirchCE-CoT P1 单元测试（node 内置 assert，0 依赖）
 * 用法：node tests\run-tests.js
 * 覆盖：core 初始化/版本双源、adapter 安全读写纪律（父级缺失拒写、
 *       undefined 拒写、$mbCE_wrote 留痕、嵌套写入、readVar 不抛）、
 *       check() 目录、setup.mbStageCE 自检键、shell DOM 注入/开合/防重入。
 * 说明：以 vm 沙箱 mock SugarCube/浏览器最小环境，不依赖游戏实机。
 * ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const SRC = path.join(__dirname, "..", "javascript", "src");
// ⚠️ 与 tools\pack.ps1 的 $order 必须同步：新增/移除源文件两处一起改。
const ORDER = ["01-core.js", "02-shell.js", "03-cot-adapter.js", "04-p2-data.js", "05-p3-relations.js", "06-p4-places.js", "07-p5-eco.js"];

function makeEl() {
  const children = [];
  const cls = { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } };
  const attrs = {};
  return {
    id: "", className: "", textContent: "", innerHTML: "", title: "", style: {}, children,
    classList: cls,
    addEventListener() {}, appendChild(n) { children.push(n); return n; },
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    remove() {},
  };
}

function makeEnv() {
  const variables = {};
  const bodyChildren = [];
  const body = { children: bodyChildren, appendChild(n) { bodyChildren.push(n); return n; }, insertBefore() {}, querySelector() { return null; } };
  const doc = {
    readyState: "complete",
    head: makeEl(), body, documentElement: makeEl(),
    createElement() { return makeEl(); },
    getElementById() { return null; },
    addEventListener() {}, querySelector() { return null; },
  };
  const ls = (function () {
    const m = {};
    return {
      getItem(k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem(k, v) { m[k] = String(v); },
      removeItem(k) { delete m[k]; },
      clear() { for (const k in m) { delete m[k]; } },
      get length() { return Object.keys(m).length; },
    };
  })();
  const sandbox = {
    console, document: doc, localStorage: ls,
    State: { variables, prng: { init() {} } },
    Setup: {}, V: variables,
    setTimeout, clearTimeout, setInterval, clearInterval,
    Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, Promise,
  };
  sandbox.window = sandbox;
  return { sandbox, variables, bodyChildren };
}

function loadAll(env) {
  for (const f of ORDER) {
    const code = fs.readFileSync(path.join(SRC, f), "utf8");
    vm.runInNewContext(code, env.sandbox, { filename: f });
  }
}

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test("core: mbCE_cot 初始化 + 版本双源", () => {
  const env = makeEnv(); loadAll(env);
  const M = env.sandbox.mbCE_cot;
  assert.ok(M, "mbCE_cot 存在");
  assert.strictEqual(M.version, "0.6.8");
  assert.strictEqual(M.game, "CoT");
  assert.strictEqual(M.targetGameVersion, "0.8.2i");
  assert.strictEqual(M.stage.core, "ok");
  assert.strictEqual(M.stage.adapter, "ok");
  assert.strictEqual(M.stage.shell, "ok");
});

test("adapter: 父级缺失拒绝写入", () => {
  const env = makeEnv(); loadAll(env);
  const A = env.sandbox.mbCE_cot.adapter;
  const r = A.writeVar("no.such.parent.key", 1);
  assert.strictEqual(r.ok, false);
  assert.ok(r.reason.indexOf("parent-missing") === 0, "reason=" + r.reason);
  assert.strictEqual(env.variables.no, undefined);
});

test("adapter: 绝不写 undefined", () => {
  const env = makeEnv(); loadAll(env);
  const A = env.sandbox.mbCE_cot.adapter;
  env.variables.pcmoney = 100;
  const r = A.writeVar("pcmoney", undefined);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "undefined-value");
  assert.strictEqual(env.variables.pcmoney, 100);
  assert.strictEqual(env.variables.mbCE_wrote, undefined);
});

test("adapter: 正常写入 + $mbCE_wrote 留痕", () => {
  const env = makeEnv(); loadAll(env);
  const A = env.sandbox.mbCE_cot.adapter;
  const r = A.writeVar("pcmoney", 500);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.pcmoney, 500);
  assert.ok(Array.isArray(env.variables.mbCE_wrote), "mbCE_wrote 数组");
  assert.strictEqual(env.variables.mbCE_wrote.length, 1);
  assert.strictEqual(env.variables.mbCE_wrote[0].k, "pcmoney");
  assert.strictEqual(env.variables.mbCE_wrote[0].from, undefined);
  assert.strictEqual(env.variables.mbCE_wrote[0].to, 500);
});

test("adapter: 嵌套父级存在时写入", () => {
  const env = makeEnv(); loadAll(env);
  const A = env.sandbox.mbCE_cot.adapter;
  env.variables.pc = { storage_locations: { dormcloset: "bag" } };
  const r = A.writeVar("pc.storage_locations.dormcloset", "wardrobe");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.pc.storage_locations.dormcloset, "wardrobe");
});

test("adapter: readVar 缺失不抛、返回 undefined", () => {
  const env = makeEnv(); loadAll(env);
  const A = env.sandbox.mbCE_cot.adapter;
  assert.strictEqual(A.readVar("pcname"), undefined);
  assert.strictEqual(A.readVar("a.b.c"), undefined);
  assert.strictEqual(A.readVar("pcmoney"), undefined);
});

test("adapter: check() 返回目录与留痕计数", () => {
  const env = makeEnv(); loadAll(env);
  env.variables.pcname = "Addison Lee";
  env.variables.pcmoney = 42;
  const A = env.sandbox.mbCE_cot.adapter;
  const c = A.check();
  assert.strictEqual(c.version, "0.6.8");
  assert.strictEqual(c.catalog.pcname, "Addison Lee");
  assert.strictEqual(c.catalog.money, 42);
  assert.strictEqual(c.catalog.day, undefined, "剧情未初始化时读不到");
  assert.strictEqual(c.wroteCount, 0);
});

test("自检键: setup.mbStageCE 就位（方案 P1 门）", () => {
  const env = makeEnv(); loadAll(env);
  const st = env.sandbox.Setup.mbStageCE;
  assert.ok(st, "Setup.mbStageCE 存在");
  assert.strictEqual(st.stage, "P1");
  assert.strictEqual(st.version, "0.6.8");
  assert.strictEqual(st.targetGameVersion, "0.8.2i");
  assert.strictEqual(env.sandbox.mbCE_cot.stage.keys, "ok");
});

test("shell: 悬浮球与面板 DOM 注入", () => {
  const env = makeEnv(); loadAll(env);
  const ids = env.bodyChildren.map(n => n.id);
  assert.ok(ids.indexOf("mbCE_cot_fab") >= 0, "fab 注入");
  assert.ok(ids.indexOf("mbCE_cot_panel") >= 0, "panel 注入");
});

test("shell: toggle 开合 + localStorage 持久化", () => {
  const env = makeEnv(); loadAll(env);
  const S = env.sandbox.mbCE_cot.shell;
  const open = S.open(true);
  assert.strictEqual(open, true);
  assert.strictEqual(env.sandbox.localStorage.getItem("mbCE_cot_ui"), "on");
  const open2 = S.open(false);
  assert.strictEqual(open2, false);
  assert.strictEqual(env.sandbox.localStorage.getItem("mbCE_cot_ui"), "off");
});

test("shell: init 防重入", () => {
  const env = makeEnv(); loadAll(env);
  const S = env.sandbox.mbCE_cot.shell;
  const before = env.bodyChildren.length;
  S.init(); S.init();
  assert.strictEqual(env.bodyChildren.length, before);
});

test("P2: 键映射表存在（三组 + 顶层）", () => {
  const env = makeEnv(); loadAll(env);
  const D = env.sandbox.mbCE_cot.data;
  assert.ok(D, "M.data 存在");
  assert.strictEqual(D.groups.length, 3);
  assert.strictEqual(D.groups[0].id, "skills");
  assert.strictEqual(D.groups[0].path, "pcskills");
  assert.ok(D.groups[0].keys.some(kv => kv[0] === "Charisma"), "技能含 Charisma");
  assert.ok(D.top.money && D.top.hour && D.top.minute, "顶层含 money/hour/minute");
});

test("P2: 技能写入回读 + 留痕", () => {
  const env = makeEnv(); loadAll(env);
  const D = env.sandbox.mbCE_cot.data;
  env.variables.pcskills = { Charisma: 100 };
  const r = D.applyEdit("skills", "Charisma", "250");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.pcskills.Charisma, 250);
  assert.strictEqual(env.variables.mbCE_wrote.length, 1);
  assert.strictEqual(env.variables.mbCE_wrote[0].k, "pcskills.Charisma");
});

test("P2: 时间越界拒绝（hour 25 / minute 61）", () => {
  const env = makeEnv(); loadAll(env);
  const D = env.sandbox.mbCE_cot.data;
  env.variables.hour = 8; env.variables.minute = 0;
  const r1 = D.applyEdit("hour", null, "25");
  assert.strictEqual(r1.ok, false);
  assert.ok(r1.reason.indexOf("range") === 0, "reason=" + r1.reason);
  assert.strictEqual(env.variables.hour, 8);
  const r2 = D.applyEdit("minute", null, "61");
  assert.strictEqual(r2.ok, false);
  assert.strictEqual(env.variables.minute, 0);
});

test("P2: 非数字拒绝 + 顶层金钱写入", () => {
  const env = makeEnv(); loadAll(env);
  const D = env.sandbox.mbCE_cot.data;
  env.variables.pcmoney = 500;
  const r1 = D.applyEdit("money", null, "abc");
  assert.strictEqual(r1.ok, false);
  assert.strictEqual(r1.reason, "nan");
  assert.strictEqual(env.variables.pcmoney, 500);
  const r2 = D.applyEdit("money", null, "999");
  assert.strictEqual(r2.ok, true);
  assert.strictEqual(env.variables.pcmoney, 999);
});

test("P2: $people 自发现（角色页数据源）", () => {
  const env = makeEnv(); loadAll(env);
  const D = env.sandbox.mbCE_cot.data;
  env.variables.people = { Bob: { relationship: "friend", special: true }, Amy: { relationship: "best friend" } };
  const list = D.discoverPeople();
  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[0].name, "Amy");
  assert.strictEqual(list[1].relationship, "friend");
  assert.strictEqual(list[1].special, true);
});

test("P2: render 路由（stats/char 处理，about 交给 shell）", () => {
  const env = makeEnv(); loadAll(env);
  const D = env.sandbox.mbCE_cot.data;
  const box = env.sandbox.document.createElement("div");
  assert.strictEqual(D.render("stats", box), true);
  assert.strictEqual(D.render("char", box), true);
  assert.strictEqual(D.render("nope", box), false);
});

test("shell: P2 页签走 data 渲染钩子", () => {
  const env = makeEnv(); loadAll(env);
  const S = env.sandbox.mbCE_cot.shell;
  const box = env.sandbox.document.createElement("div");
  const tab = S.tabs.filter(t => t.id === "char")[0];
  const r = tab.render(box);
  assert.strictEqual(r, true, "char 页签由 data 渲染");
});

test("P3: attitude 写入（容器缺失自动建）+ 留痕", () => {
  const env = makeEnv(); loadAll(env);
  const R = env.sandbox.mbCE_cot.rel;
  env.variables.people = { Bob: {} };
  const r = R.writeAttitude("Bob", "romance", "500");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.people.Bob.attitude.romance, 500);
  assert.strictEqual(env.variables.mbCE_wrote.length, 2);
  assert.strictEqual(env.variables.mbCE_wrote[1].k, "people.Bob.attitude.romance");
});

test("P3: attitude 越界/非数字/对象缺失拒绝", () => {
  const env = makeEnv(); loadAll(env);
  const R = env.sandbox.mbCE_cot.rel;
  env.variables.people = { Bob: { attitude: { lust: 100 } } };
  const r1 = R.writeAttitude("Bob", "lust", "1500");
  assert.strictEqual(r1.ok, false);
  assert.ok(r1.reason.indexOf("range") === 0);
  assert.strictEqual(env.variables.people.Bob.attitude.lust, 100);
  const r2 = R.writeAttitude("Bob", "lust", "xyz");
  assert.strictEqual(r2.ok, false);
  assert.strictEqual(r2.reason, "nan");
  const r3 = R.writeAttitude("Ghost", "lust", "100");
  assert.strictEqual(r3.ok, false);
  assert.strictEqual(r3.reason, "no-person");
});

test("P3: $crush 设置与清空", () => {
  const env = makeEnv(); loadAll(env);
  const R = env.sandbox.mbCE_cot.rel;
  env.variables.crush = "Amy";
  const r1 = R.setCrush("Bob");
  assert.strictEqual(r1.ok, true);
  assert.strictEqual(env.variables.crush, "Bob");
  const r2 = R.setCrush("");
  assert.strictEqual(r2.ok, true);
  assert.strictEqual(env.variables.crush, "");
});

test("P3: render 路由（rel 由 P3 处理，char 仍走 P2）", () => {
  const env = makeEnv(); loadAll(env);
  const box = env.sandbox.document.createElement("div");
  assert.strictEqual(env.sandbox.mbCE_cot.data.render("rel", box), true);
  assert.strictEqual(env.sandbox.mbCE_cot.data.render("char", box), true);
  assert.strictEqual(env.sandbox.mbCE_cot.data.render("nope", box), false);
});

test("shell: P3 关系页签走 data 渲染钩子", () => {
  const env = makeEnv(); loadAll(env);
  const S = env.sandbox.mbCE_cot.shell;
  const box = env.sandbox.document.createElement("div");
  const tab = S.tabs.filter(t => t.id === "rel")[0];
  assert.strictEqual(tab.render(box), true, "rel 页签由 data 渲染");
});

test("P4: 地点跳转写入 + 空值拒绝", () => {
  const env = makeEnv(); loadAll(env);
  const P = env.sandbox.mbCE_cot.places;
  const r1 = P.setLocation("Campus");
  assert.strictEqual(r1.ok, true);
  assert.strictEqual(env.variables.location, "Campus");
  const r2 = P.setLocation("");
  assert.strictEqual(r2.ok, false);
  assert.strictEqual(r2.reason, "empty");
  assert.strictEqual(env.variables.location, "Campus");
});

test("P4: 场景标签清空", () => {
  const env = makeEnv(); loadAll(env);
  const P = env.sandbox.mbCE_cot.places;
  env.variables.preencountertags = ["chargen", "encounter"];
  const r = P.clearPreencounterTags();
  assert.strictEqual(r.ok, true);
  assert.ok(Array.isArray(env.variables.preencountertags), "仍是数组");
  assert.strictEqual(env.variables.preencountertags.length, 0, "已清空");
  assert.strictEqual(env.variables.mbCE_wrote.length, 1);
  assert.strictEqual(env.variables.mbCE_wrote[0].k, "preencountertags");
});

test("P4: 时间键扩展（日/月/年/游戏日/游戏年 + 校验）", () => {
  const env = makeEnv(); loadAll(env);
  const D = env.sandbox.mbCE_cot.data;
  env.variables.day = 1; env.variables.month = 0; env.variables.gameyear = 1;
  assert.ok(D.top.day && D.top.month && D.top.year && D.top.gameday && D.top.gameyear);
  const r1 = D.applyEdit("month", null, "12");
  assert.strictEqual(r1.ok, false);
  const r2 = D.applyEdit("day", null, "0");
  assert.strictEqual(r2.ok, false);
  const r3 = D.applyEdit("gameyear", null, "2");
  assert.strictEqual(r3.ok, true);
  assert.strictEqual(env.variables.gameyear, 2);
});

test("P4: render 路由（place/scene 由 P4 处理，rel 仍 P3）", () => {
  const env = makeEnv(); loadAll(env);
  const box = env.sandbox.document.createElement("div");
  assert.strictEqual(env.sandbox.mbCE_cot.data.render("place", box), true);
  assert.strictEqual(env.sandbox.mbCE_cot.data.render("scene", box), true);
  assert.strictEqual(env.sandbox.mbCE_cot.data.render("rel", box), true);
  assert.strictEqual(env.sandbox.mbCE_cot.data.render("nope", box), false);
});

test("shell: P4 页签走 data 渲染钩子", () => {
  const env = makeEnv(); loadAll(env);
  const S = env.sandbox.mbCE_cot.shell;
  const box = env.sandbox.document.createElement("div");
  assert.strictEqual(S.tabs.filter(t => t.id === "place")[0].render(box), true);
  assert.strictEqual(S.tabs.filter(t => t.id === "scene")[0].render(box), true);
});

test("P5: 生态检测（默认无 modI18N/modUtils）", () => {
  const env = makeEnv(); loadAll(env);
  const E = env.sandbox.mbCE_cot.eco;
  const d = E.detect();
  assert.strictEqual(d.i18n, false);
  assert.strictEqual(d.modUtils, null);
  assert.strictEqual(d.sc2dm, false);
  assert.strictEqual(d.self, "ok", "自检键就位");
});

test("P5: 生态检测（有 modI18N/modUtils）", () => {
  const env = makeEnv(); loadAll(env);
  env.sandbox.modI18N = {};
  env.sandbox.modUtils = { version: "2.101.1" };
  env.sandbox.modSC2DataManager = {};
  const d = env.sandbox.mbCE_cot.eco.detect();
  assert.strictEqual(d.i18n, true);
  assert.strictEqual(d.modUtils, "2.101.1");
  assert.strictEqual(d.sc2dm, true);
});

test("P5: I18n 钩子原文直通 + 官方 mod 清单", () => {
  const env = makeEnv(); loadAll(env);
  const E = env.sandbox.mbCE_cot.eco;
  assert.strictEqual(E.i18n.t("key", "回退文案"), "回退文案");
  assert.strictEqual(E.i18n.t("key"), "key");
  assert.strictEqual(E.officialMods.length, 16);
  assert.ok(E.officialMods.includes("CheckGameVersionCot"));
});

test("P5: about 页由 P5 渲染，其余路由不变", () => {
  const env = makeEnv(); loadAll(env);
  const box = env.sandbox.document.createElement("div");
  assert.strictEqual(env.sandbox.mbCE_cot.data.render("about", box), true);
  assert.strictEqual(env.sandbox.mbCE_cot.data.render("rel", box), true);
  assert.strictEqual(env.sandbox.mbCE_cot.data.render("scene", box), true);
});

test("shell: P5 关于页签走 data 渲染钩子", () => {
  const env = makeEnv(); loadAll(env);
  const S = env.sandbox.mbCE_cot.shell;
  const box = env.sandbox.document.createElement("div");
  assert.strictEqual(S.tabs.filter(t => t.id === "about")[0].render(box), true);
});

test("R1: i18n.reason 汉化表", () => {
  const env = makeEnv(); loadAll(env);
  const I = env.sandbox.mbCE_cot.i18n;
  assert.strictEqual(I.reason("nan"), "非数字");
  assert.strictEqual(I.reason("empty"), "值为空");
  assert.strictEqual(I.reason("no-person"), "该对象不存在");
  assert.strictEqual(I.reason("range:-1000-1000"), "超出范围：-1000-1000");
  assert.strictEqual(I.reason("parent-missing:people.X"), "父级键缺失");
  assert.strictEqual(I.reason("unknown-code"), "unknown-code", "未知码保底原样");
  assert.strictEqual(I.reason(""), "失败");
  assert.strictEqual(I.t("key", "回退"), "回退");
});

test("R1: 生态层引用 01-core 的 i18n", () => {
  const env = makeEnv(); loadAll(env);
  assert.strictEqual(env.sandbox.mbCE_cot.eco.i18n, env.sandbox.mbCE_cot.i18n);
});

test("R4: relationship 标签写入/清空/拒绝 + 中文释义", () => {
  const env = makeEnv(); loadAll(env);
  const R = env.sandbox.mbCE_cot.rel;
  env.sandbox.State.variables.people = { "Alice": { attitude: {} } };
  let r = R.writeRelationship("Alice", "fuckbuddy");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.sandbox.State.variables.people.Alice.relationship, "fuckbuddy");
  assert.strictEqual(R.relLabel("fuckbuddy"), "fuckbuddy（炮友）");
  assert.strictEqual(R.relLabel("best friend"), "best friend（挚友）");
  assert.strictEqual(R.relLabel("自定义值"), "自定义值", "未知值原样");
  assert.strictEqual(R.relLabel(""), "（无标签）");
  assert.strictEqual(R.relLabel(undefined), "（无标签）");
  r = R.writeRelationship("Alice", "   ");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.sandbox.State.variables.people.Alice.relationship, "", "空串=清空");
  r = R.writeRelationship("Nobody", "x");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "no-person");
});

test("R5: $findr 字段写入（name + 数组）", () => {
  const env = makeEnv(); loadAll(env);
  const P = env.sandbox.mbCE_cot.places;
  env.sandbox.State.variables.findr = { name: "abc", tags: [], liked: [], disliked: [], matched: [] };
  let r = P.writeFindrField("name", "  myname ");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.findr.name, "myname", "trim");
  r = P.writeFindrField("tags", "Open, Romance, Poly");
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual([...env.variables.findr.tags], ["Open", "Romance", "Poly"], "数组写入");
  r = P.writeFindrField("liked", "Alice，Bob, ,Carol");
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual([...env.variables.findr.liked], ["Alice", "Bob", "Carol"], "中英文逗号+去空");
  assert.strictEqual(P.formatList(env.variables.findr.liked), "Alice, Bob, Carol");
  const emptyList = P.parseList("");
  assert.ok(Array.isArray(emptyList) && emptyList.length === 0, "空串 → 空数组（跨 realm 语义断言）");
});

test("R5: $findr 缺失拒绝 + i18n 汉化", () => {
  const env = makeEnv(); loadAll(env);
  const P = env.sandbox.mbCE_cot.places;
  const r = P.writeFindrField("tags", "Open");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "no-findr");
  assert.strictEqual(env.sandbox.mbCE_cot.i18n.reason("no-findr"), "未注册 Findr（请先游戏内注册）");
});

test("R5: 数值页分组折叠（4 组 details）", () => {
  const env = makeEnv(); loadAll(env);
  env.sandbox.State.variables.pcskills = { Charisma: 100 };
  const box = env.sandbox.document.createElement("div");
  const ok = env.sandbox.mbCE_cot.data.render("stats", box);
  assert.strictEqual(ok, true);
  const groupTitles = ["顶层数值与时间", "技能（$pcskills）", "身体（$pcstats）", "需求（$pcneeds）"];
  const details = box.children.filter(c => c.children && c.children.length > 0 && groupTitles.indexOf(c.children[0].textContent) >= 0);
  assert.strictEqual(details.length, 4, "4 个分组 details");
  const titles = details.map(c => c.children[0].textContent);
  assert.ok(titles.some(t => t === "顶层数值与时间"), "TOP 组标题");
  assert.ok(titles.some(t => t === "技能（$pcskills）"), "技能组标题");
  assert.ok(titles.some(t => t === "身体（$pcstats）"), "身体组标题");
  assert.ok(titles.some(t => t === "需求（$pcneeds）"), "需求组标题");
  assert.ok(details.every(c => c.open === "open"), "4 个分组默认展开");
});

test("R6: 页签记忆（恢复 + 切换持久化）", () => {
  const env = makeEnv();
  env.sandbox.localStorage.setItem("mbCE_cot_ui_tab", "rel");
  loadAll(env);
  const S = env.sandbox.mbCE_cot.shell;
  assert.strictEqual(S.activeTab(), "rel", "恢复上次页签");
  S.activateTab("scene");
  assert.strictEqual(S.activeTab(), "scene");
  assert.strictEqual(env.sandbox.localStorage.getItem("mbCE_cot_ui_tab"), "scene", "切换持久化");
});

test("R6: $people 深层字段（昵称/年龄）", () => {
  const env = makeEnv(); loadAll(env);
  const R = env.sandbox.mbCE_cot.rel;
  env.sandbox.State.variables.people = { "Alice": {} };
  let r = R.writePersonField("Alice", "nickname", " 小A ");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.people.Alice.nickname, "小A", "trim");
  r = R.writePersonField("Alice", "age", "18");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.people.Alice.age, 18);
  r = R.writePersonField("Alice", "age", "200");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "range:1-120");
  r = R.writePersonField("Alice", "age", "abc");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "nan");
  r = R.writePersonField("Nobody", "nickname", "x");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "no-person");
});

test("R6: Findr 标签 chip 选择器渲染", () => {
  const env = makeEnv(); loadAll(env);
  env.sandbox.State.variables.findr = { name: "u", tags: ["Open"], liked: [], disliked: [], matched: [] };
  const box = env.sandbox.document.createElement("div");
  const ok = env.sandbox.mbCE_cot.data.render("scene", box);
  assert.strictEqual(ok, true);
  // 收集所有 chip 按钮
  const chips = [];
  (function walk(n) { n.children.forEach(c => { if (c.className && c.className.indexOf("mbce-chip") === 0) { chips.push(c); } walk(c); }); })(box);
  assert.strictEqual(chips.length, 8, "8 个标签 chip");
  const openChip = chips.filter(c => c.textContent === "Open")[0];
  assert.ok(openChip && openChip.className.indexOf(" on") >= 0, "已选标签高亮");
});

test("R7: Person 更多字段（gender/label + name_known 双键）", () => {
  const env = makeEnv(); loadAll(env);
  const R = env.sandbox.mbCE_cot.rel;
  env.sandbox.State.variables.people = { "Alice": {} };
  let r = R.writePersonField("Alice", "gender", "female");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.people.Alice.gender, "female");
  r = R.writePersonField("Alice", "label", "college girl");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.people.Alice.label, "college girl");
  r = R.writePersonField("Alice", "gender", "");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "empty");
  r = R.markKnown("Alice", true);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.people.Alice.name_known, true);
  assert.strictEqual(env.variables.people.Alice.known, true, "双键同步");
  r = R.markKnown("Alice", false);
  assert.strictEqual(env.variables.people.Alice.name_known, false);
  assert.strictEqual(env.variables.people.Alice.known, false);
  r = R.markKnown("Nobody", true);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "no-person");
});

test("R7: NPC 技能编辑（自发现 + 容器建 + 越界拒绝）", () => {
  const env = makeEnv(); loadAll(env);
  const R = env.sandbox.mbCE_cot.rel;
  env.sandbox.State.variables.people = { "Alice": { skills: { Charisma: 80 } } };
  let r = R.writeSkill("Alice", "Physical", "40");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.people.Alice.skills.Physical, 40);
  r = R.writeSkill("Alice", "Intellectual", "200");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "range:0-100");
  r = R.writeSkill("Alice", "Intellectual", "abc");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "nan");
  // 容器缺失时先建
  env.sandbox.State.variables.people = { "Bob": {} };
  r = R.writeSkill("Bob", "Charisma", "50");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.people.Bob.skills.Charisma, 50);
  // 渲染：自发现技能键
  env.sandbox.State.variables.people = { "Alice": { skills: { Charisma: 80, Physical: 20 } } };
  const box = env.sandbox.document.createElement("div");
  const ok = env.sandbox.mbCE_cot.data.render("rel", box);
  assert.strictEqual(ok, true);
  let skillRows = 0;
  (function walk(n) {
    n.children.forEach(c => {
      if (c.className === "mbce-row" && c.children.length >= 3 && c.children[2].textContent === "保存") { skillRows++; }
      walk(c);
    });
  })(box);
  assert.strictEqual(skillRows >= 2, true, "自发现技能行渲染");
});

test("R7: 面板字号设置（持久化 + 恢复）", () => {
  const env = makeEnv(); loadAll(env);
  const S = env.sandbox.mbCE_cot.shell;
  assert.strictEqual(S.fontSize(), "14px", "默认 14px");
  S.setFont(1);
  assert.strictEqual(S.fontSize(), "15px");
  assert.strictEqual(env.sandbox.localStorage.getItem("mbCE_cot_ui_font"), "3");
  S.setFont(-2);
  assert.strictEqual(S.fontSize(), "13px");
  S.setFont(-1);
  assert.strictEqual(S.fontSize(), "12px", "下限逐档");
  S.setFont(-5);
  assert.strictEqual(S.fontSize(), "12px", "下限 clamp 不变");
  // 恢复：预置 fontIdx=1
  const env2 = makeEnv();
  env2.sandbox.localStorage.setItem("mbCE_cot_ui_font", "1");
  loadAll(env2);
  assert.strictEqual(env2.sandbox.mbCE_cot.shell.fontSize(), "13px", "恢复上次字号");
});

test("R8: relationship 枚举 chip + $crush 下拉渲染", () => {
  const env = makeEnv(); loadAll(env);
  env.sandbox.State.variables.people = { "Alice": { relationship: "best friend" } };
  const box = env.sandbox.document.createElement("div");
  const ok = env.sandbox.mbCE_cot.data.render("rel", box);
  assert.strictEqual(ok, true);
  let chips = [];
  let sel = null;
  (function walk(n) {
    n.children.forEach(c => {
      if (c.className && c.className.indexOf("mbce-chip") === 0) { chips.push(c); }
      if (c.className === "mbce-in" && c.children.length > 0 && typeof c.children[0].value === "string") { sel = sel || c; }
      walk(c);
    });
  })(box);
  assert.strictEqual(chips.length, 4, "4 个关系枚举 chip");
  const bf = chips.filter(c => c.getAttribute("data-rel") === "best friend")[0];
  assert.ok(bf && bf.className.indexOf(" on") >= 0, "当前值 chip 高亮");
  assert.ok(sel !== null, "存在下拉选择器");
});

test("R8: major/year 字段校验", () => {
  const env = makeEnv(); loadAll(env);
  const R = env.sandbox.mbCE_cot.rel;
  env.sandbox.State.variables.people = { "Alice": {} };
  let r = R.writePersonField("Alice", "major", "psychology");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.people.Alice.major, "psychology");
  r = R.writePersonField("Alice", "year", "3");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.people.Alice.year, 3);
  r = R.writePersonField("Alice", "year", "0");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "range:1-10");
  r = R.writePersonField("Alice", "year", "abc");
  assert.strictEqual(r.reason, "nan");
});

test("R8: 数值页折叠状态记忆（恢复）", () => {
  const env = makeEnv();
  env.sandbox.localStorage.setItem("mbCE_cot_ui_stats", '["top"]');
  loadAll(env);
  env.sandbox.State.variables.people = {};
  const box = env.sandbox.document.createElement("div");
  env.sandbox.mbCE_cot.data.render("stats", box);
  let topDet = null;
  (function walk(n) {
    n.children.forEach(c => {
      if (c.getAttribute && c.getAttribute("data-gid") === "top") { topDet = c; }
      walk(c);
    });
  })(box);
  assert.ok(topDet !== null, "存在 top 组");
  assert.ok(!topDet.open, "记忆的收起组默认收起");
});

test("R8: 关系页每 NPC 折叠块", () => {
  const env = makeEnv(); loadAll(env);
  env.sandbox.State.variables.people = { "Alice": {} };
  const box = env.sandbox.document.createElement("div");
  env.sandbox.mbCE_cot.data.render("rel", box);
  let sumTexts = [];
  (function walk(n) {
    n.children.forEach(c => {
      if (c.tagName === "summary" || (c.children && c.children.length === 0 && c.textContent === "Alice")) { sumTexts.push(c.textContent); }
      walk(c);
    });
  })(box);
  assert.ok(sumTexts.indexOf("Alice") >= 0, "NPC 折叠标题含名字");
});

test("R9: 数值页搜索过滤（输入框 + data-key 行）", () => {
  const env = makeEnv(); loadAll(env);
  env.sandbox.State.variables.people = {};
  const box = env.sandbox.document.createElement("div");
  env.sandbox.mbCE_cot.data.render("stats", box);
  let hasSearch = false, hasKeyRow = false;
  (function walk(n) {
    n.children.forEach(c => {
      if (c.className === "mbce-row" && c.children.length === 2 && c.children[1].type === "text") { hasSearch = true; }
      if (c.className === "mbce-row" && c.getAttribute("data-key") === "Charisma") { hasKeyRow = true; }
      walk(c);
    });
  })(box);
  assert.strictEqual(hasSearch, true, "存在过滤输入框");
  assert.strictEqual(hasKeyRow, true, "技能行带 data-key");
});

test("R9: 面板位置记忆（拖拽恢复）", () => {
  const env = makeEnv();
  env.sandbox.localStorage.setItem("mbCE_cot_ui_pos", '{"left":"120px","top":"80px"}');
  loadAll(env);
  const panel = env.sandbox.document.body.children.filter(c => c.id === "mbCE_cot_panel")[0];
  assert.ok(panel, "面板已注入");
  assert.strictEqual(panel.style.left, "120px", "恢复 left");
  assert.strictEqual(panel.style.top, "80px", "恢复 top");
});

test("R9: 关系页 NPC 折叠记忆（恢复）", () => {
  const env = makeEnv();
  env.sandbox.localStorage.setItem("mbCE_cot_ui_rel", '["Alice"]');
  loadAll(env);
  env.sandbox.State.variables.people = { "Alice": {}, "Bob": {} };
  const box = env.sandbox.document.createElement("div");
  env.sandbox.mbCE_cot.data.render("rel", box);
  let aliceDet = null, bobDet = null;
  (function walk(n) {
    n.children.forEach(c => {
      if (c.children && c.children.length > 1 && c.children[0] && c.children[0].textContent === "Alice") { aliceDet = c; }
      if (c.children && c.children.length > 1 && c.children[0] && c.children[0].textContent === "Bob") { bobDet = c; }
      walk(c);
    });
  })(box);
  assert.ok(aliceDet && !aliceDet.open, "记忆的收起 NPC 默认收起");
  assert.ok(bobDet && bobDet.open, "未收起 NPC 默认展开");
});

test("R10: PC 字段编辑（writePcField）", () => {
  const env = makeEnv(); loadAll(env);
  const D = env.sandbox.mbCE_cot.data;
  let r = D.writePcField("pcname", " 唐兴富 ");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.pcname, "唐兴富", "文本 trim");
  r = D.writePcField("pcage", "22");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(env.variables.pcage, 22);
  r = D.writePcField("pcage", "200");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "range:1-120");
  r = D.writePcField("pcmajor", "  ");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "empty");
});

test("R10: 角色页可编辑行 + 关系页 NPC 搜索框", () => {
  const env = makeEnv(); loadAll(env);
  env.sandbox.State.variables.people = { "Alice": {} };
  const box = env.sandbox.document.createElement("div");
  env.sandbox.mbCE_cot.data.render("char", box);
  let pcRows = 0;
  (function walk(n) {
    n.children.forEach(c => {
      if (c.className === "mbce-row" && c.children.length === 3 && c.children[2].textContent === "保存") { pcRows++; }
      walk(c);
    });
  })(box);
  assert.strictEqual(pcRows, 6, "PC 六字段可编辑行");
  const box2 = env.sandbox.document.createElement("div");
  env.sandbox.mbCE_cot.data.render("rel", box2);
  let hasFilter = false;
  (function walk(n) {
    n.children.forEach(c => {
      if (c.className === "mbce-row" && c.children.length === 2 && c.children[1].type === "text" && c.children[0].textContent === "过滤 NPC") { hasFilter = true; }
      if (c.getAttribute && c.getAttribute("data-name") === "Alice") { hasFilter = hasFilter; }
      walk(c);
    });
  })(box2);
  assert.strictEqual(hasFilter, true, "关系页 NPC 搜索框存在");
});

test("R10: 关于页自检详情（模块 stage）", () => {
  const env = makeEnv(); loadAll(env);
  const box = env.sandbox.document.createElement("div");
  const ok = env.sandbox.mbCE_cot.data.render("about", box);
  assert.strictEqual(ok, true);
  let diagText = "";
  (function walk(n) {
    n.children.forEach(c => {
      if (c.children && c.children.length > 0 && c.children[0].textContent === "自检详情") {
        diagText = c.children.map(x => x.textContent || "").join(" | ");
      }
      walk(c);
    });
  })(box);
  assert.ok(diagText.indexOf("模块：core=") >= 0, "显示模块 stage");
  assert.ok(diagText.indexOf("core=ok") >= 0, "stage=ok");
});

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log("  PASS " + name); }
  catch (e) { failed++; console.log("  FAIL " + name + " :: " + (e && e.message)); }
}
console.log(failed === 0 ? "ALL GREEN (" + tests.length + " tests)" : failed + " FAILED of " + tests.length);
process.exit(failed === 0 ? 0 : 1);
