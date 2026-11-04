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
const ORDER = ["01-core.js", "02-shell.js", "03-cot-adapter.js", "04-p2-data.js", "05-p3-relations.js", "06-p4-places.js", "07-p5-eco.js"];

function makeEl() {
  const children = [];
  const cls = { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } };
  return {
    id: "", className: "", textContent: "", innerHTML: "", title: "", style: {}, children,
    classList: cls,
    addEventListener() {}, appendChild(n) { children.push(n); return n; },
    setAttribute() {}, remove() {},
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
  assert.strictEqual(M.version, "0.6.1");
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
  assert.strictEqual(c.version, "0.6.1");
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
  assert.strictEqual(st.version, "0.6.1");
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

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log("  PASS " + name); }
  catch (e) { failed++; console.log("  FAIL " + name + " :: " + (e && e.message)); }
}
console.log(failed === 0 ? "ALL GREEN (" + tests.length + " tests)" : failed + " FAILED of " + tests.length);
process.exit(failed === 0 ? 0 : 1);
