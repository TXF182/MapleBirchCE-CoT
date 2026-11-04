/* ============================================================================
 * 07-p5-eco.js — MapleBirchCE-CoT P5 CoT 生态适配
 * 生态检测（运行时，try/catch 全部容错）：
 *   window.modI18N      —— 汉化/多语言 mod 检测标记（earlyload 读 readZipStream）
 *   window.modUtils     —— loader 暴露（ModUtils.version）
 *   window.modSC2DataManager —— loader 数据管理
 *   setup.mbStageCE     —— 本模组自检键（03 设置）
 * 官方内置 16 mod（CoT 0.8.2i HTML 取证）：见 OFFICIAL_MODS。
 * I18n 钩子：M.i18n = { enabled, t(key, fallback) }；P5 原文直通，接 i18n.json 留待后续。
 * ========================================================================== */
"use strict";
(function () {
  var M = window.mbCE_cot;
  if (!M || M.eco) { return; } // 防重入

  var OFFICIAL_MODS = [
    "ModLoaderGui", "ConflictChecker", "ImageLoaderHookCore", "ModSubUiAngularJs",
    "BeautySelectorAddon", "CheckGameVersionCot", "ImageLoaderHook2BeautySelectorAddon",
    "TweeReplacerLinker", "TweeReplacer", "I18nTweeReplacer", "I18nTweeList", "I18nScriptList",
    "ReplacePatcher", "ModuleCssReplacer", "TweePrefixPostfixAddon", "SweetAlert2Mod",
  ];

  var DEPS = [
    { modName: "ModLoader", version: ">=2.101.1" },
    { modName: "GameVersion", version: "=0.8.2-i" },
  ];

  function detect() {
    var out = { i18n: false, modUtils: null, sc2dm: false, self: "?" };
    try { out.i18n = !!window.modI18N; } catch (e) {}
    try { out.modUtils = (window.modUtils && window.modUtils.version) ? String(window.modUtils.version) : null; } catch (e) {}
    try { out.sc2dm = !!window.modSC2DataManager; } catch (e) {}
    try { out.self = (window.Setup && window.Setup.mbStageCE) ? "ok" : "missing"; } catch (e) {}
    return out;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined) { n.textContent = text; }
    return n;
  }

  function renderAbout(box) {
    var d = detect();
    var g = el("div", "mbce-group");
    g.appendChild(el("b", null, "生态检测"));
    g.appendChild(el("p", "mbce-plain", "modI18N：" + (d.i18n ? "已加载" : "未检测到") + "（CE 面板中文写死，不依赖 i18n.json）"));
    g.appendChild(el("p", "mbce-plain", "ModUtils：" + (d.modUtils || "不可用") + "（要求 >=2.101.1）"));
    g.appendChild(el("p", "mbce-plain", "modSC2DataManager：" + (d.sc2dm ? "可用" : "不可用")));
    g.appendChild(el("p", "mbce-plain", "自检键 setup.mbStageCE：" + d.self));
    g.appendChild(el("p", "mbce-plain", "运行版本：MapleBirchCE-CoT " + M.version + " · 目标 CoT " + M.targetGameVersion));
    box.appendChild(g);

    var dep = el("div", "mbce-group");
    dep.appendChild(el("b", null, "依赖声明（boot.json）"));
    DEPS.forEach(function (x) { dep.appendChild(el("p", "mbce-plain", x.modName + " " + x.version)); });
    box.appendChild(dep);

    var mods = el("div", "mbce-group");
    mods.appendChild(el("b", null, "CoT 0.8.2i 官方内置 mod（" + OFFICIAL_MODS.length + " 个）"));
    mods.appendChild(el("p", "mbce-plain", OFFICIAL_MODS.join(" · ")));
    box.appendChild(mods);

    var note = el("div", "mbce-group");
    note.appendChild(el("b", null, "使用说明"));
    note.appendChild(el("p", "mbce-plain", "写入即时生效并留痕 $mbCE_wrote；读档可回退。加载：Mod 管理器 → MapleBirchCE-CoT-<v>.mod.zip → 刷新 → 右下金色悬浮球。"));
    box.appendChild(note);
    return true;
  }

  M.eco = {
    version: M.version,
    detect: detect,
    i18n: M.i18n, // 引用 01-core 的 i18n 基础（t + reason 汉化表）
    renderAbout: renderAbout,
    officialMods: OFFICIAL_MODS,
    deps: DEPS,
  };

  var origRender = M.data.render;
  M.data.render = function (tabId, box) {
    if (tabId === "about") { return renderAbout(box); }
    return origRender(tabId, box);
  };
})();
