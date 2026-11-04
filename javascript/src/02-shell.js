/* ============================================================================
 * 02-shell.js — MapleBirchCE-CoT 悬浮球 + 面板壳（全新实现，仅形态参考 DoL 版）
 * P1 骨架：金色悬浮球、双层标签六页占位布局、说明折叠、状态栏提示、
 *          自检徽标（读 window.mbCE_cot.stage / adapter.check()）。
 * 纪律：CSS 全部按 id 作用域；注入失败降级不打断游戏；防重入。
 * ========================================================================== */
"use strict";
(function () {
  var M = window.mbCE_cot;
  if (!M || M.shell) { return; } // 防重入

  var CID = "mbCE_cot";
  var cssId = CID + "_css";
  var fabId = CID + "_fab";
  var panelId = CID + "_panel";
  var rootId = CID + "_root";
  var uiLsKey = CID + "_ui";

  var TABS = [
    { id: "char",  label: "角色", render: function (box) { return hookRender("char", box); } },
    { id: "stats", label: "数值", render: function (box) { return hookRender("stats", box); } },
    { id: "rel",   label: "关系", render: function (box) { return hookRender("rel", box); } },
    { id: "place", label: "地点" },
    { id: "scene", label: "场景" },
    { id: "about", label: "关于" },
  ];

  function hookRender(tabId, box) {
    var d = window.mbCE_cot && window.mbCE_cot.data;
    if (d && typeof d.render === "function") {
      var r = d.render(tabId, box);
      if (r !== false) { return true; }
    }
    return false;
  }

  var state = { fab: null, panel: null, content: null, badge: null, status: null, activeTab: "char", inited: false };

  function ready(fn) {
    var jq = window.jQuery || window.$;
    if (typeof jq === "function") {
      try { jq(function () { fn(); }); return; } catch (e) { /* 落到下方兜底 */ }
    }
    if (document.readyState === "complete" || document.readyState === "interactive") {
      try { fn(); } catch (e) { setTimeout(fn, 0); }
      return;
    }
    document.addEventListener("DOMContentLoaded", fn);
  }

  function injectCss() {
    if (document.getElementById(cssId)) { return; }
    var css = [
      "#" + rootId + " * { box-sizing: border-box; }",
      "#" + fabId + " { position: fixed; right: 22px; bottom: 22px; z-index: 2147483001; width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg,#f5d76e,#c9a227); color:#5a4300; font: 700 15px/52px Arial, sans-serif; text-align: center; cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,.35); user-select: none; }",
      "#" + fabId + ":hover { filter: brightness(1.08); }",
      "#" + panelId + " { position: fixed; right: 22px; bottom: 84px; z-index: 2147483000; width: 340px; max-height: 72vh; overflow: hidden; background: #fdfaf1; color: #3a2c10; border: 1px solid #d9c27a; border-radius: 12px; box-shadow: 0 8px 28px rgba(0,0,0,.4); font: 14px/1.6 Arial, sans-serif; display: none; flex-direction: column; }",
      "#" + panelId + ".open { display: flex; }",
      "#" + panelId + " .mbce-head { padding: 10px 12px; background: #6b4f1a; color: #ffe9a8; border-radius: 11px 11px 0 0; }",
      "#" + panelId + " .mbce-head b { font-size: 15px; }",
      "#" + panelId + " .mbce-badge { float: right; font-size: 12px; background: #3f7d3f; color: #eaffea; border-radius: 8px; padding: 0 8px; }",
      "#" + panelId + " .mbce-badge.err { background: #a33; }",
      "#" + panelId + " .mbce-tabs { display: flex; flex-wrap: wrap; border-bottom: 1px solid #e3d3a0; background: #f4ead0; }",
      "#" + panelId + " .mbce-tab { flex: 1 1 16%; min-width: 44px; padding: 7px 0; text-align: center; cursor: pointer; color: #6b5a2a; }",
      "#" + panelId + " .mbce-tab.on { background: #fff; color: #a07500; font-weight: 700; border-bottom: 2px solid #c9a227; }",
      "#" + panelId + " .mbce-body { padding: 10px 12px; overflow-y: auto; }",
      "#" + panelId + " .mbce-status { padding: 6px 12px; border-top: 1px dashed #d9c27a; color: #6b5a2a; font-size: 12px; }",
      "#" + panelId + " .mbce-fold summary { cursor: pointer; color: #8a6d1f; font-size: 12px; }",
      "#" + panelId + " .mbce-fold p { margin: 6px 0 0; font-size: 12px; color: #5c4a20; }",
      "#" + panelId + " .mbce-plain { color: #7a6a3c; font-size: 13px; }",
      "#" + panelId + " .mbce-group { margin: 7px 0; }",
      "#" + panelId + " .mbce-group b { color: #6b4f1a; }",
      "#" + panelId + " .mbce-row { display: flex; align-items: center; gap: 6px; margin: 3px 0; }",
      "#" + panelId + " .mbce-row-label { flex: 1 1 auto; font-size: 12px; color: #5c4a20; }",
      "#" + panelId + " .mbce-in { width: 84px; padding: 2px 6px; border: 1px solid #d9c27a; border-radius: 4px; background: #fff; color: #3a2c10; }",
      "#" + panelId + " .mbce-btn { padding: 2px 10px; border: 1px solid #c9a227; background: #f5d76e; color: #5a4300; border-radius: 4px; cursor: pointer; }",
    ].join("\n");
    var el = document.createElement("style");
    el.id = cssId;
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined) { n.textContent = text; }
    return n;
  }

  function renderContent(tabId) {
    var box = state.content;
    if (!box) { return; }
    var tab = TABS.filter(function (t) { return t.id === tabId; })[0];
    box.innerHTML = "";
    if (tab && typeof tab.render === "function") {
      if (tab.render(box)) { return; }
    }
    if (tabId === "about") {
      box.appendChild(el("p", "mbce-plain", "MapleBirch CE · CoT 全局调试面板（骨架版）"));
      var fold = el("details", "mbce-fold");
      var sum = el("summary", null, "关于本版本");
      fold.appendChild(sum);
      var info = [
        "版本 " + M.version,
        "目标 " + M.game + " " + M.targetGameVersion,
        "决策：D1 新仓库 / D2 0.8.2i / D4 先不发 / D5 全新游戏 / D6 冒烟非默认门禁",
        "自检键：setup.mbStageCE（游戏内可查）",
        "写档留痕：$mbCE_wrote",
      ].join("\n");
      fold.appendChild(el("p", null, info));
      box.appendChild(fold);
      return;
    }
    var map = { char: "角色页（P2 数值/角色页实现）", stats: "数值页（P2 实现）", rel: "关系页（P3 实现）", place: "地点页（P4 实现）", scene: "场景页（P4 实现）" };
    box.appendChild(el("p", "mbce-plain", "「" + TABS.filter(function (t) { return t.id === tabId; })[0].label + "」" + (map[tabId] || "待实现")));
  }

  function updateBadge() {
    if (!state.badge) { return; }
    var a = M.adapter;
    var ok = false;
    try { ok = !!a && typeof a.check === "function" && !!a.check().catalog; } catch (e) { ok = false; }
    var stage = M.stage;
    var text = "自检:";
    text += (stage.core === "ok" ? "core✓" : "core✗");
    text += (stage.adapter === "ok" ? " adapter✓" : " adapter·");
    text += (stage.shell === "ok" ? " shell✓" : " shell·");
    text += (ok ? "" : "（等剧情初始化）");
    state.badge.textContent = text;
    state.badge.className = "mbce-badge" + (stage.shell === "error" ? " err" : "");
  }

  function buildPanel() {
    if (state.panel) { return; }
    var panel = el("div");
    panel.id = panelId;
    var head = el("div", "mbce-head");
    head.appendChild(el("b", null, "MapleBirch CE · CoT"));
    var badge = el("span", "mbce-badge", "自检…");
    head.appendChild(badge);
    panel.appendChild(head);

    var tabs = el("div", "mbce-tabs");
    TABS.forEach(function (t) {
      var b = el("div", "mbce-tab" + (t.id === "char" ? " on" : ""), t.label);
      b.addEventListener("click", function () {
        state.activeTab = t.id;
        Array.prototype.forEach.call(tabs.children, function (c) { c.className = "mbce-tab"; });
        b.className = "mbce-tab on";
        renderContent(t.id);
      });
      tabs.appendChild(b);
    });
    panel.appendChild(tabs);

    var body = el("div", "mbce-body");
    panel.appendChild(body);
    var status = el("div", "mbce-status", "P1 骨架：数值修改将写入存档并留痕 $mbCE_wrote，可读档回退");
    panel.appendChild(status);

    document.body.appendChild(panel);
    state.panel = panel; state.content = body; state.badge = badge; state.status = status;
    renderContent("char");
    var saved = "off";
    try { saved = localStorage.getItem(uiLsKey) || "off"; } catch (e) {}
    if (saved === "on") { toggle(true); }
  }

  function buildFab() {
    if (state.fab) { return; }
    var fab = el("div");
    fab.id = fabId;
    fab.textContent = "CE";
    fab.title = "MapleBirch CE · CoT（骨架版 " + M.version + "）";
    fab.addEventListener("click", function () { toggle(); });
    document.body.appendChild(fab);
    state.fab = fab;
  }

  function toggle(force) {
    if (!state.panel) { return; }
    var open = force !== undefined ? !!force : !state.panel.classList.contains("open");
    if (open) { state.panel.classList.add("open"); } else { state.panel.classList.remove("open"); }
    try { localStorage.setItem(uiLsKey, open ? "on" : "off"); } catch (e) {}
    updateBadge();
    return open;
  }

  function init() {
    if (state.inited) { return; }
    try {
      injectCss();
      buildFab();
      buildPanel();
      M.shell.statusEl = state.status;
      M.stage.shell = "ok";
    } catch (e) {
      M.stage.shell = "error";
      try { console.warn("[MapleBirchCE-CoT] shell init failed:", e && e.message); } catch (e2) {}
    }
    state.inited = true;
    updateBadge();
  }

  M.shell = {
    version: M.version,
    init: init,
    open: toggle,
    refresh: updateBadge,
    statusEl: null,
    tabs: TABS,
  };

  ready(init);
})();
