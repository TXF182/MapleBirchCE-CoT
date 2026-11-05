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
  var uiTabKey = CID + "_ui_tab"; // 页签记忆（R6）
  var uiFontKey = CID + "_ui_font"; // 字号设置（R7）
  var uiPosKey = CID + "_ui_pos"; // 面板位置记忆（R9）
  var uiWidthKey = CID + "_ui_width"; // 面板宽度偏好（R11）
  var FONTS = ["12px", "13px", "14px", "15px", "16px"];
  var fontIdx = 2;
  var WIDTHS = ["300px", "340px", "380px"];
  var widthIdx = 1;

  var TABS = [
    { id: "char",  label: "角色", render: function (box) { return hookRender("char", box); } },
    { id: "stats", label: "数值", render: function (box) { return hookRender("stats", box); } },
    { id: "rel",   label: "关系", render: function (box) { return hookRender("rel", box); } },
    { id: "place", label: "地点", render: function (box) { return hookRender("place", box); } },
    { id: "scene", label: "场景", render: function (box) { return hookRender("scene", box); } },
    { id: "about", label: "关于", render: function (box) { return hookRender("about", box); } },
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
      "#" + panelId + " .mbce-chip { padding: 1px 8px; border: 1px solid #d9c27a; background: #fff; color: #6b5a2a; border-radius: 10px; cursor: pointer; font-size: 12px; }",
      "#" + panelId + " .mbce-chip.on { background: #c9a227; border-color: #c9a227; color: #fff; }",
      "#" + panelId + " .mbce-sub { margin: 6px 0 4px; padding-left: 6px; border-left: 2px solid #e6d69a; }",
      "#" + panelId + " .mbce-cats { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 8px; }",
      "#" + panelId + " .mbce-cat { padding: 2px 8px; border: 1px solid #d9c27a; background: #fff; color: #6b5a2a; border-radius: 10px; cursor: pointer; font-size: 12px; }",
      "#" + panelId + " .mbce-cat.on { background: #6b4f1a; border-color: #6b4f1a; color: #fff; }",
      "#" + panelId + " .mbce-tags { color: #9a8552; font-size: 11px; }",
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

  function activateTab(tabId) {
    var tab = TABS.filter(function (t) { return t.id === tabId; })[0];
    if (!tab) { tabId = "char"; }
    state.activeTab = tabId;
    var tabsEl = state.tabsEl;
    if (tabsEl) {
      Array.prototype.forEach.call(tabsEl.children, function (c) { c.className = "mbce-tab"; });
      Array.prototype.forEach.call(tabsEl.children, function (c) {
        if (c.textContent === tab.label) { c.className = "mbce-tab on"; }
      });
    }
    renderContent(tabId);
    try { localStorage.setItem(uiTabKey, tabId); } catch (e) {}
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
    var fsm = el("span", "mbce-head-fs", "A-");
    fsm.title = "减小字号";
    fsm.style.cursor = "pointer";
    fsm.style.marginLeft = "8px";
    fsm.addEventListener("click", function () { setFont(-1); });
    head.appendChild(fsm);
    var fsadd = el("span", "mbce-head-fs", "A+");
    fsadd.title = "增大字号";
    fsadd.style.cursor = "pointer";
    fsadd.style.marginLeft = "4px";
    fsadd.addEventListener("click", function () { setFont(1); });
    head.appendChild(fsadd);
    var wsm = el("span", "mbce-head-w", "W-");
    wsm.title = "面板变窄";
    wsm.style.cursor = "pointer";
    wsm.style.marginLeft = "8px";
    wsm.addEventListener("click", function () { setWidth(-1); });
    head.appendChild(wsm);
    var wsadd = el("span", "mbce-head-w", "W+");
    wsadd.title = "面板变宽";
    wsadd.style.cursor = "pointer";
    wsadd.style.marginLeft = "4px";
    wsadd.addEventListener("click", function () { setWidth(1); });
    head.appendChild(wsadd);
    var badge = el("span", "mbce-badge", "自检…");
    head.appendChild(badge);
    panel.appendChild(head);
    // 拖拽把手：标题栏
    head.style.cursor = "move";
    head.addEventListener("mousedown", function (e) {
      if (e.button !== 0) { return; }
      var rect = state.panel.getBoundingClientRect();
      dragState = { offX: e.clientX - rect.left, offY: e.clientY - rect.top };
      document.addEventListener("mousemove", onDragMove);
      document.addEventListener("mouseup", onDragUp);
      if (e.preventDefault) { e.preventDefault(); }
    });

    var tabs = el("div", "mbce-tabs");
    TABS.forEach(function (t) {
      var b = el("div", "mbce-tab", t.label);
      b.addEventListener("click", function () { activateTab(t.id); });
      tabs.appendChild(b);
    });
    panel.appendChild(tabs);
    state.tabsEl = tabs;

    var body = el("div", "mbce-body");
    panel.appendChild(body);
    var status = el("div", "mbce-status", "就绪：所有写入经 CoT 键适配器并留痕 $mbCE_wrote（可读档回退）。v0.7.0");
    panel.appendChild(status);

    document.body.appendChild(panel);
    state.panel = panel; state.content = body; state.badge = badge; state.status = status;
    var savedTab = "char";
    try { savedTab = localStorage.getItem(uiTabKey) || "char"; } catch (e) {}
    activateTab(savedTab);
    var savedFont = "2";
    try { savedFont = localStorage.getItem(uiFontKey) || "2"; } catch (e) {}
    var fi = parseInt(savedFont, 10);
    fontIdx = (!isNaN(fi) && fi >= 0 && fi < FONTS.length) ? fi : 2;
    applyFont();
    var savedWidth = "1";
    try { savedWidth = localStorage.getItem(uiWidthKey) || "1"; } catch (e) {}
    var wi = parseInt(savedWidth, 10);
    widthIdx = (!isNaN(wi) && wi >= 0 && wi < WIDTHS.length) ? wi : 1;
    applyWidth();
    // 面板位置记忆恢复（R9）
    try {
      var savedPos = localStorage.getItem(uiPosKey);
      if (savedPos) {
        var pos = JSON.parse(savedPos);
        if (pos && pos.left && pos.top) {
          panel.style.left = pos.left;
          panel.style.top = pos.top;
          panel.style.right = "auto";
          panel.style.bottom = "auto";
        }
      }
    } catch (e) {}
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

  // 字号设置（R7）：A-/A+ 循环 12-16px，持久化 mbCE_cot_ui_font
  function applyFont() {
    if (!state.panel) { return; }
    state.panel.style.fontSize = FONTS[fontIdx];
    try { localStorage.setItem(uiFontKey, String(fontIdx)); } catch (e) {}
  }
  function setFont(delta) {
    var n = fontIdx + delta;
    if (n < 0 || n >= FONTS.length) { return fontIdx; }
    fontIdx = n;
    applyFont();
    return fontIdx;
  }

  // 面板宽度偏好（R11）：W-/W+ 循环 300/340/380px，持久化 mbCE_cot_ui_width
  function applyWidth() {
    if (!state.panel) { return; }
    state.panel.style.width = WIDTHS[widthIdx];
    try { localStorage.setItem(uiWidthKey, String(widthIdx)); } catch (e) {}
  }
  function setWidth(delta) {
    var n = widthIdx + delta;
    if (n < 0 || n >= WIDTHS.length) { return widthIdx; }
    widthIdx = n;
    applyWidth();
    return widthIdx;
  }

  // 面板拖拽（R7）：按住标题栏拖动，改 left/top（清 right/bottom）
  var dragState = null;
  function onDragMove(e) {
    if (!dragState) { return; }
    state.panel.style.left = (e.clientX - dragState.offX) + "px";
    state.panel.style.top = (e.clientY - dragState.offY) + "px";
    state.panel.style.right = "auto";
    state.panel.style.bottom = "auto";
  }
  function onDragUp() {
    dragState = null;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragUp);
    try {
      var l = state.panel.style.left;
      if (l) { localStorage.setItem(uiPosKey, JSON.stringify({ left: state.panel.style.left, top: state.panel.style.top })); }
    } catch (e) {}
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
    activateTab: activateTab,
    activeTab: function () { return state.activeTab; },
    setFont: setFont,
    fontSize: function () { return FONTS[fontIdx]; },
    setWidth: setWidth,
    panelWidth: function () { return WIDTHS[widthIdx]; },
    statusEl: null,
    tabs: TABS,
  };

  ready(init);
})();
