/* ============================================================================
 * 03-cot-adapter.js — CoT 变量读写适配层（全新实现，针对 CoT 键模型）
 * 键模型（StoryInit 取证）：顶层 $pcname/$pcgender/$pcage/$pcmoney/
 *   $pcskills/$pcstats/$pcneeds/$pcinclinations；时间 $day/$month/$hour/
 *   $minute/$year/$gameday/$gameyear；$varsversion=71；$pc 对象由脚本维护。
 * 纪律（DoL 经验复用）：
 *   - 父级对象缺失 → 拒绝写入；绝不写 undefined；写入留痕 $mbCE_wrote。
 *   - 自检键 setup.mbStageCE（方案 P1 门）。
 * ========================================================================== */
"use strict";
(function () {
  var M = window.mbCE_cot;
  if (!M || M.adapter) { return; } // 防重入

  // P1 已验证键目录（读通道）。P2 起扩展为三源对照映射表。
  var CATALOG = {
    pcname: "pcname", pcnickname: "pcnickname", pcgender: "pcgender", pcage: "pcage",
    money: "pcmoney", pcskills: "pcskills", pcstats: "pcstats", pcneeds: "pcneeds",
    pcinclinations: "pcinclinations",
    day: "day", month: "month", hour: "hour", minute: "minute",
    year: "year", gameday: "gameday", gameyear: "gameyear",
  };

  function varsStore() {
    try {
      if (window.State && window.State.variables) { return window.State.variables; }
      if (window.V) { return window.V; }
    } catch (e) {}
    return null;
  }

  function readVar(path) {
    var s = varsStore();
    if (!s) { return undefined; }
    var parts = String(path).split(".");
    var cur = s;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) { return undefined; }
      cur = cur[parts[i]];
    }
    return cur;
  }

  function writeVar(path, value) {
    if (value === undefined) { return { ok: false, reason: "undefined-value" }; }
    var s = varsStore();
    if (!s) { return { ok: false, reason: "no-store" }; }
    var parts = String(path).split(".");
    var cur = s;
    for (var i = 0; i < parts.length - 1; i++) {
      if (cur == null || typeof cur !== "object") {
        return { ok: false, reason: "parent-missing:" + parts.slice(0, i + 1).join(".") };
      }
      cur = cur[parts[i]];
    }
    var last = parts[parts.length - 1];
    if (cur == null || typeof cur !== "object") { return { ok: false, reason: "parent-missing" }; }
    var before = cur[last];
    cur[last] = value;
    try {
      if (!Array.isArray(s.mbCE_wrote)) { s.mbCE_wrote = []; }
      s.mbCE_wrote.push({ k: path, from: before, to: value, at: Date.now() });
    } catch (e) {}
    return { ok: true, key: path, from: before, to: value };
  }

  function check() {
    var res = { version: M.version, stage: M.stage, catalog: {} };
    for (var k in CATALOG) {
      if (Object.prototype.hasOwnProperty.call(CATALOG, k)) {
        res.catalog[k] = readVar(CATALOG[k]);
      }
    }
    var s = varsStore();
    res.wroteCount = (s && Array.isArray(s.mbCE_wrote)) ? s.mbCE_wrote.length : 0;
    return res;
  }

  function setStageKey() {
    try {
      var st = (typeof window.Setup !== "undefined") ? window.Setup : null;
      if (!st && typeof Setup !== "undefined") { st = Setup; }
      if (!st) { return false; }
      st.mbStageCE = {
        version: M.version,
        stage: "P1",
        game: M.game,
        targetGameVersion: M.targetGameVersion,
        at: Date.now(),
        checks: check(),
      };
      M.stage.keys = "ok";
      return true;
    } catch (e) { return false; }
  }

  M.adapter = {
    version: M.version,
    catalog: CATALOG,
    readVar: readVar,
    writeVar: writeVar,
    check: check,
  };
  M.stage.adapter = "ok";

  if (!setStageKey()) {
    var n = 0;
    var timer = setInterval(function () {
      n++;
      if (setStageKey() || n > 10) { clearInterval(timer); }
    }, 500);
  }

  if (M.shell && typeof M.shell.refresh === "function") { M.shell.refresh(); }
})();
