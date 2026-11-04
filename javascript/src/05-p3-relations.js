/* ============================================================================
 * 05-p3-relations.js — MapleBirchCE-CoT P3 关系/恋爱页
 * 键模型（取证）：
 *   $people[NPC].attitude = 数值轴对象：attitude["friendship"|"romance"|"lust"]
 *     （setup.people.set_attitude 写入；alter_attitude 范围 clamp -1000..1000；
 *      romance 上限实际受 setup.Relationships.max_romance 约束，P3 通用 -1000..1000）
 *   $people[NPC].relationship = 关系标签（best friend / fuckbuddy / hatefuck / submissive，只读展示）
 *   $people[NPC].partnerType / .partner = 恋爱状态（partner=="PC" 表示与玩家恋爱，只读展示）
 *   $crush = PC 暗恋对象 NPC 名（可编辑/清空）
 * 纪律：写入走 adapter.writeVar 留痕；attitude 容器缺失时先建容器再写子键；
 *       越界/非数字/对象缺失拒绝并回显原因。
 * ========================================================================== */
"use strict";
(function () {
  var M = window.mbCE_cot;
  if (!M || !M.data || M.rel) { return; } // 依赖 04 数据层，防重入

  var D = M.data;
  var ATT_TYPES = [["friendship", "友谊"], ["romance", "恋爱"], ["lust", "性欲"]];
  var RANGE_MIN = -1000, RANGE_MAX = 1000;

  function adapter() { return M.adapter; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined) { n.textContent = text; }
    return n;
  }

  function statusMsg(reason) {
    var st = M.shell && M.shell.statusEl;
    if (st) { st.textContent = "保存未生效：" + (M.i18n && M.i18n.reason ? M.i18n.reason(reason) : reason) + "（$mbCE_wrote 可查）"; }
  }

  function writeAttitude(person, type, raw) {
    var a = adapter();
    if (!a) { return { ok: false, reason: "no-adapter" }; }
    if (raw === "" || raw === null || raw === undefined) { return { ok: false, reason: "empty" }; }
    var v = Number(raw);
    if (!isFinite(v)) { return { ok: false, reason: "nan" }; }
    if (v < RANGE_MIN || v > RANGE_MAX) { return { ok: false, reason: "range:-1000-1000" }; }
    var base = a.readVar("people." + person);
    if (!base || typeof base !== "object") { return { ok: false, reason: "no-person" }; }
    if (!base.attitude || typeof base.attitude !== "object") {
      var r0 = a.writeVar("people." + person + ".attitude", {});
      if (!r0.ok) { return r0; }
    }
    return a.writeVar("people." + person + ".attitude." + type, v);
  }

  function setCrush(name) {
    var a = adapter();
    if (!a) { return { ok: false, reason: "no-adapter" }; }
    var v = (name === undefined || name === null) ? "" : String(name).trim();
    return a.writeVar("crush", v);
  }

  function rowEl(label, value, onSave) {
    var wrap = el("div", "mbce-row");
    wrap.appendChild(el("span", "mbce-row-label", label));
    var inp = el("input", "mbce-in");
    inp.type = "number";
    inp.value = (value === undefined || value === null) ? "" : String(value);
    wrap.appendChild(inp);
    var btn = el("button", "mbce-btn", "保存");
    btn.addEventListener("click", function () {
      var r = onSave(inp.value);
      if (r && r.ok) { inp.value = String(r.to); }
      else {
        inp.value = (value === undefined || value === null) ? "" : String(value);
        statusMsg((r && r.reason) ? r.reason : "失败");
      }
    });
    wrap.appendChild(btn);
    return wrap;
  }

  function renderRel(box) {
    var a = adapter();
    if (!a) { box.appendChild(el("p", "mbce-plain", "适配层未就绪")); return true; }

    var crushBox = el("div", "mbce-group");
    crushBox.appendChild(el("b", null, "暗恋对象（$crush，值 = NPC 名）"));
    var curCrush = a.readVar("crush");
    var cRow = el("div", "mbce-row");
    cRow.appendChild(el("span", "mbce-row-label", "crush"));
    var cInp = el("input", "mbce-in");
    cInp.type = "text";
    cInp.value = (curCrush === undefined || curCrush === null) ? "" : String(curCrush);
    cRow.appendChild(cInp);
    var cBtn = el("button", "mbce-btn", "保存");
    cBtn.addEventListener("click", function () {
      var r = setCrush(cInp.value);
      if (r && r.ok) { cInp.value = String(r.to); }
      else { statusMsg((r && r.reason) ? r.reason : "失败"); }
    });
    cRow.appendChild(cBtn);
    var cClr = el("button", "mbce-btn", "清空");
    cClr.addEventListener("click", function () {
      var r = setCrush("");
      if (r && r.ok) { cInp.value = ""; }
    });
    cRow.appendChild(cClr);
    crushBox.appendChild(cRow);
    box.appendChild(crushBox);

    var list = D.discoverPeople();
    if (list.length === 0) { box.appendChild(el("p", "mbce-plain", "（暂无认识的人，剧情推进后出现）")); return true; }
    list.forEach(function (p) {
      var g = el("div", "mbce-group");
      var head = p.name;
      if (p.relationship !== undefined) { head += " · " + p.relationship; }
      if (p.special) { head += " · 特殊"; }
      g.appendChild(el("b", null, head));
      var info = a.readVar("people." + p.name);
      if (info) {
        var pts = [];
        if (info.partnerType !== undefined) { pts.push("partnerType=" + info.partnerType); }
        if (info.partner !== undefined) { pts.push("partner=" + info.partner); }
        if (pts.length) { g.appendChild(el("p", "mbce-plain", pts.join(" · "))); }
      }
      var att = null;
      if (info && info.attitude && typeof info.attitude === "object") { att = info.attitude; }
      ATT_TYPES.forEach(function (kv) {
        g.appendChild(rowEl(kv[1] + "（attitude." + kv[0] + "）", att ? att[kv[0]] : undefined, function (raw) { return writeAttitude(p.name, kv[0], raw); }));
      });
      box.appendChild(g);
    });
    return true;
  }

  M.rel = {
    version: M.version,
    writeAttitude: writeAttitude,
    setCrush: setCrush,
    render: renderRel,
  };

  var origRender = M.data.render;
  M.data.render = function (tabId, box) {
    if (tabId === "rel") { return renderRel(box); }
    return origRender(tabId, box);
  };
})();
