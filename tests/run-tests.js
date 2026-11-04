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
const ORDER = ["01-core.js", "02-shell.js", "03-cot-adapter.js"];

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
  assert.strictEqual(M.version, "0.2.0");
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
  assert.strictEqual(c.version, "0.2.0");
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
  assert.strictEqual(st.version, "0.2.0");
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

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log("  PASS " + name); }
  catch (e) { failed++; console.log("  FAIL " + name + " :: " + (e && e.message)); }
}
console.log(failed === 0 ? "ALL GREEN (" + tests.length + " tests)" : failed + " FAILED of " + tests.length);
process.exit(failed === 0 ? 0 : 1);
