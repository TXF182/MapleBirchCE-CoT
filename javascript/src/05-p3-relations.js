/* ============================================================================
 * 05-p3-relations.js — MapleBirchCE-CoT P3 关系/恋爱页
 * 键模型（取证）：
 *   $people[NPC].attitude = 数值轴对象：attitude["friendship"|"romance"|"lust"]
 *     （setup.people.set_attitude 写入；alter_attitude 范围 clamp -1000..1000；
 *      romance 上限实际受 setup.Relationships.max_romance 约束，P3 通用 -1000..1000）
 *   $people[NPC].relationship = 关系标签（best friend / fuckbuddy / hatefuck / submissive，
 *     可编辑：枚举快捷提示 + 自定义文本，展示带中文释义；partner 仍只读）
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
  // 已取证枚举（scan11b 实证样本；游戏可能含更多值，编辑用自定义文本兜底）
  var REL_LABELS = {
    "best friend": "挚友",
    "fuckbuddy": "炮友",
    "hatefuck": "相爱相杀",
    "submissive": "服从",
  };
  var REL_HINTS = ["best friend", "fuckbuddy", "hatefuck", "submissive"];

  function relLabel(v) {
    if (v === undefined || v === null || v === "") { return "（无标签）"; }
    return (REL_LABELS[v] !== undefined) ? v + "（" + REL_LABELS[v] + "）" : v;
  }

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

  // R13 关注切换：$favoritepeople 是数组（游戏内 push/splice 维护）
  function toggleFavorite(name) {
    var a = adapter();
    if (!a) { return { ok: false, reason: "no-adapter" }; }
    if (!name) { return { ok: false, reason: "empty" }; }
    var cur = a.readVar("favoritepeople");
    var arr = Array.isArray(cur) ? cur.slice(0) : [];
    var i = arr.indexOf(String(name));
    var fav = true;
    if (i >= 0) { arr.splice(i, 1); fav = false; } else { arr.push(String(name)); }
    var r = a.writeVar("favoritepeople", arr);
    if (r.ok) { r.fav = fav; r.to = arr; }
    return r;
  }

  function writeRelationship(person, raw) {
    var a = adapter();
    if (!a) { return { ok: false, reason: "no-adapter" }; }
    if (raw === undefined || raw === null) { return { ok: false, reason: "empty" }; }
    var v = String(raw).trim(); // 空串 = 清空标签
    var base = a.readVar("people." + person);
    if (!base || typeof base !== "object") { return { ok: false, reason: "no-person" }; }
    return a.writeVar("people." + person + ".relationship", v);
  }

  // $people 深层字段（Person 实例属性，直改留痕）
  //   nickname/label/gender = 文本；age = 1-120；gender 仅改字段，身体部件/代词/标签不随动（构造时定）
  function writePersonField(person, field, raw) {
    var a = adapter();
    if (!a) { return { ok: false, reason: "no-adapter" }; }
    if (raw === undefined || raw === null) { return { ok: false, reason: "empty" }; }
    var base = a.readVar("people." + person);
    if (!base || typeof base !== "object") { return { ok: false, reason: "no-person" }; }
    if (field === "nickname" || field === "gender" || field === "label" || field === "major") {
      var v = String(raw).trim();
      if (!v) { return { ok: false, reason: "empty" }; }
      return a.writeVar("people." + person + "." + field, v);
    }
    if (field === "age") {
      var n = Number(raw);
      if (!isFinite(n)) { return { ok: false, reason: "nan" }; }
      if (n < 1 || n > 120) { return { ok: false, reason: "range:1-120" }; }
      return a.writeVar("people." + person + ".age", n);
    }
    if (field === "year") {
      var y = Number(raw);
      if (!isFinite(y)) { return { ok: false, reason: "nan" }; }
      if (y < 1 || y > 10) { return { ok: false, reason: "range:1-10" }; }
      return a.writeVar("people." + person + ".year", y);
    }
    return { ok: false, reason: "empty" };
  }

  // name_known 双键（模仿 setup.people.make_known 语义：name_known + known 同步写）
  function markKnown(person, known) {
    var a = adapter();
    if (!a) { return { ok: false, reason: "no-adapter" }; }
    var base = a.readVar("people." + person);
    if (!base || typeof base !== "object") { return { ok: false, reason: "no-person" }; }
    var r1 = a.writeVar("people." + person + ".name_known", !!known);
    var r2 = a.writeVar("people." + person + ".known", !!known);
    if (r1.ok && r2.ok) { return r1; }
    return r1.ok ? r2 : r1;
  }

  // NPC 技能（Person.skills = {技能名: 0-100}，键来自 setup.Skills.all_skills()=mainskills+otherskills；
  // 游戏命令直改 pdata.skills[skill]；这里自发现现有键渲染，容器缺失先建）
  var SKILL_RANGE_MIN = 0, SKILL_RANGE_MAX = 100;
  function writeSkill(person, key, raw) {
    var a = adapter();
    if (!a) { return { ok: false, reason: "no-adapter" }; }
    if (raw === undefined || raw === null) { return { ok: false, reason: "empty" }; }
    var base = a.readVar("people." + person);
    if (!base || typeof base !== "object") { return { ok: false, reason: "no-person" }; }
    if (!base.skills || typeof base.skills !== "object") {
      var r0 = a.writeVar("people." + person + ".skills", {});
      if (!r0.ok) { return r0; }
    }
    var v = Number(raw);
    if (!isFinite(v)) { return { ok: false, reason: "nan" }; }
    if (v < SKILL_RANGE_MIN || v > SKILL_RANGE_MAX) { return { ok: false, reason: "range:0-100" }; }
    return a.writeVar("people." + person + ".skills." + key, v);
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
    // crush 下拉选择（$people 键，change 即时写；文本输入保留供自定义）
    var cSelRow = el("div", "mbce-row");
    cSelRow.appendChild(el("span", "mbce-row-label", "选择 NPC"));
    var cSel = el("select", "mbce-in");
    var names = D.discoverPeople().map(function (p) { return p.name; });
    var allNames = names.slice();
    if (curCrush && allNames.indexOf(String(curCrush)) < 0) { allNames.unshift(String(curCrush)); }
    if (allNames.length === 0) { allNames.push(""); }
    allNames.forEach(function (nm) {
      var opt = el("option", null, nm);
      opt.value = nm;
      if (nm === String(curCrush || "")) { opt.selected = true; }
      cSel.appendChild(opt);
    });
    cSel.addEventListener("change", function () {
      var r = setCrush(cSel.value);
      if (r && r.ok) { cInp.value = String(r.to); }
      else { statusMsg((r && r.reason) ? r.reason : "失败"); }
    });
    cSelRow.appendChild(cSel);
    crushBox.appendChild(cSelRow);
    box.appendChild(crushBox);

    var list = D.discoverPeople();
    if (list.length === 0) { box.appendChild(el("p", "mbce-plain", "（暂无认识的人，剧情推进后出现）")); return true; }
    // NPC 搜索过滤（R10）：按 NPC 名即时过滤折叠块
    var dets = [];
    var nRow = el("div", "mbce-row");
    nRow.appendChild(el("span", "mbce-row-label", "过滤 NPC"));
    var nInp = el("input", "mbce-in");
    nInp.type = "text";
    nInp.addEventListener("input", function () {
      applyPersonFilter();
    });
    nRow.appendChild(nInp);
    box.appendChild(nRow);
    // R13 人物分类筛选：优先调用游戏原生分类函数（all_romantic_partners/all_friends/...）
    function gamePeopleApi() {
      try {
        var S = (typeof Setup !== "undefined" && Setup) || (typeof setup !== "undefined" && setup) || null;
        if (S && S.people && typeof S.people === "object") { return S.people; }
      } catch (e) {}
      return null;
    }
    function callNameList(fname, args) {
      var P = gamePeopleApi();
      if (!P || typeof P[fname] !== "function") { return []; }
      try { var r = P[fname].apply(P, args || []); return Array.isArray(r) ? r : []; } catch (e) { return []; }
    }
    var catMap = {};
    function markCat(names, id) {
      (names || []).forEach(function (n) {
        if (!n) { return; }
        (catMap[String(n)] = catMap[String(n)] || {})[id] = true;
      });
    }
    var favs = a.readVar("favoritepeople");
    markCat(Array.isArray(favs) ? favs : [], "fav");
    markCat(callNameList("all_romantic_partners", []), "rom");
    var crushV = a.readVar("crush");
    if (crushV) { markCat([String(crushV)], "crush"); }
    markCat(callNameList("all_friends", []), "friend");
    markCat(callNameList("all_acquaintances", [true]), "acq");
    markCat(callNameList("all_admirers", []), "admire");
    markCat(callNameList("all_special", []), "special");
    markCat(callNameList("all_faculty", []), "faculty");
    markCat(callNameList("all_coworkers", []), "cowork");
    markCat(callNameList("all_exes", []), "ex");
    var PA = gamePeopleApi();
    if (PA && typeof PA.is_rival === "function") {
      list.forEach(function (pp) {
        try { if (PA.is_rival(pp.name)) { markCat([pp.name], "rival"); } } catch (e) {}
      });
    }
    var CAT_IDS = ["fav", "rom", "crush", "friend", "acq", "admire", "special", "faculty", "cowork", "ex", "rival"];
    var CAT_ICON = { fav: "⭐", rom: "♥", crush: "💘", friend: "😊", acq: "👋", admire: "💗", special: "🤝", faculty: "🎓", cowork: "💼", ex: "💔", rival: "👿" };
    var catRow = el("div", "mbce-cats");
    var curCat = "";
    // R14：筛选后空结果提示（避免点了分类后一片空白）
    var emptyHint = el("p", "mbce-plain", "（当前筛选无匹配人物，共 " + list.length + " 人）");
    emptyHint.style.display = "none";
    function applyPersonFilter() {
      var q = nInp.value.trim().toLowerCase();
      var shown = 0;
      dets.forEach(function (d) {
        var nm = (d.getAttribute("data-name") || "").toLowerCase();
        var cats = (d.getAttribute("data-cats") || "");
        var okQ = !q || nm.indexOf(q) >= 0;
        var okC = !curCat || (" " + cats + " ").indexOf(" " + curCat + " ") >= 0;
        d.style.display = (okQ && okC) ? "" : "none";
        if (okQ && okC) { shown++; }
      });
      var active = (q || curCat);
      emptyHint.style.display = (!shown && active) ? "" : "none";
      emptyHint.textContent = (!shown && active) ? ("（当前筛选无匹配人物，共 " + dets.length + " 人）") : "";
    }
    var allChip = el("button", "mbce-cat on", "全部（" + list.length + "）");
    allChip.addEventListener("click", function () { curCat = ""; refreshCatChips(); applyPersonFilter(); });
    catRow.appendChild(allChip);
    var catChips = [allChip];
    CAT_IDS.forEach(function (id) {
      var cnt = list.filter(function (p) { return catMap[p.name] && catMap[p.name][id]; }).length;
      var c = el("button", "mbce-cat", ((M.catZh && M.catZh[id]) || id) + "（" + cnt + "）");
      c.setAttribute("data-cat", id);
      c.addEventListener("click", function () {
        curCat = (curCat === id) ? "" : id;
        refreshCatChips();
        applyPersonFilter();
      });
      catChips.push(c);
      catRow.appendChild(c);
    });
    function refreshCatChips() {
      catChips.forEach(function (c) {
        var id = c.getAttribute("data-cat") || "";
        c.className = "mbce-cat" + ((id === "" && curCat === "") || id === curCat ? " on" : "");
      });
    }
    box.appendChild(catRow);
    box.appendChild(el("p", "mbce-plain", "分类来自游戏原生判定（关注/浪漫/朋友/认识/仰慕/特殊/教职工/同事/前任/对手）；无判定的显示在「全部」。"));
    box.appendChild(emptyHint);
    // 每 NPC 折叠状态记忆（R9）：mbCE_cot_ui_rel 存收起 NPC 名
    var relLsKey = "mbCE_cot_ui_rel";
    function readClosedRel() {
      try { var arr = JSON.parse(localStorage.getItem(relLsKey) || "[]"); return Array.isArray(arr) ? arr : []; }
      catch (e) { return []; }
    }
    var closedRel = readClosedRel();
    list.forEach(function (p) {
      // 分组优化：每 NPC 一个折叠块（默认展开）
      var det = el("details");
      det.open = (closedRel.indexOf(p.name) >= 0) ? "" : "open";
      det.setAttribute("data-name", p.name);
      dets.push(det);
      det.addEventListener("toggle", function () {
        var arr = readClosedRel();
        var isOpen = !!det.open;
        var i = arr.indexOf(p.name);
        if (!isOpen && i < 0) { arr.push(p.name); }
        if (isOpen && i >= 0) { arr.splice(i, 1); }
        try { localStorage.setItem(relLsKey, JSON.stringify(arr)); } catch (e) {}
      });
      var head = p.name;
      if (p.relationship !== undefined) { head += " · " + relLabel(p.relationship); }
      if (p.special) { head += " · 特殊"; }
      var pCats = catMap[p.name] || {};
      var icons = CAT_IDS.filter(function (id) { return pCats[id]; }).map(function (id) { return CAT_ICON[id]; }).join("");
      if (icons) { head += "  " + icons; }
      det.setAttribute("data-cats", CAT_IDS.filter(function (id) { return pCats[id]; }).join(" "));
      det.appendChild(el("summary", null, head));
      var g = el("div", "mbce-group");
      det.appendChild(g);
      var info = a.readVar("people." + p.name);
      if (info) {
        var pts = [];
        if (info.partnerType !== undefined) { pts.push("partnerType=" + info.partnerType); }
        if (info.partner !== undefined) { pts.push("partner=" + info.partner); }
        if (pts.length) { g.appendChild(el("p", "mbce-plain", pts.join(" · "))); }
      }
      // R13 关注切换（$favoritepeople 为数组，游戏内用 push/splice 维护）
      var favBox = el("div", "mbce-row");
      var favCur = a.readVar("favoritepeople");
      var isFav = Array.isArray(favCur) && favCur.indexOf(p.name) >= 0;
      var favBtn = el("button", "mbce-btn", isFav ? "取消关注 ⭐" : "关注 ⭐");
      favBtn.addEventListener("click", function () {
        var r = toggleFavorite(p.name);
        if (r && r.ok) {
          favBtn.textContent = r.fav ? "取消关注 ⭐" : "关注 ⭐";
          statusMsg(r.fav ? "已加入关注（$favoritepeople）" : "已取消关注（$favoritepeople）");
        } else { statusMsg((r && r.reason) ? r.reason : "失败"); }
      });
      favBox.appendChild(favBtn);
      g.appendChild(favBox);
      var relRow = el("div", "mbce-row");
      relRow.appendChild(el("span", "mbce-row-label", "关系标签（relationship）"));
      var relInp = el("input", "mbce-in");
      relInp.type = "text";
      relInp.value = (info && info.relationship !== undefined) ? String(info.relationship) : "";
      relRow.appendChild(relInp);
      var relBtn = el("button", "mbce-btn", "保存");
      relBtn.addEventListener("click", function () {
        var r = writeRelationship(p.name, relInp.value);
        if (r && r.ok) { relInp.value = String(r.to); refreshRelChips(); }
        else { statusMsg((r && r.reason) ? r.reason : "失败"); }
      });
      relRow.appendChild(relBtn);
      g.appendChild(relRow);
      // relationship 枚举 chip（点击即时写，再点取消=清除）
      var curRel = (info && info.relationship !== undefined) ? String(info.relationship) : "";
      function refreshRelChips() {
        Array.prototype.forEach.call(relChips.children, function (c) {
          c.className = "mbce-chip" + (c.getAttribute("data-rel") === curRel ? " on" : "");
        });
      }
      var relChips = el("div", "mbce-row");
      REL_HINTS.forEach(function (tag) {
        var c = el("button", "mbce-chip" + (curRel === tag ? " on" : ""), tag);
        c.title = REL_LABELS[tag] || tag;
        c.setAttribute("data-rel", tag);
        c.addEventListener("click", function () {
          var target = (curRel === tag) ? "" : tag;
          var r = writeRelationship(p.name, target);
          if (r && r.ok) { curRel = String(r.to); relInp.value = curRel; refreshRelChips(); }
          else { statusMsg((r && r.reason) ? r.reason : "失败"); }
        });
        relChips.appendChild(c);
      });
      var clrRel = el("button", "mbce-btn", "清除标签");
      clrRel.addEventListener("click", function () {
        var r = writeRelationship(p.name, "");
        if (r && r.ok) { curRel = ""; relInp.value = ""; refreshRelChips(); }
        else { statusMsg((r && r.reason) ? r.reason : "失败"); }
      });
      relChips.appendChild(clrRel);
      g.appendChild(relChips);
      g.appendChild(el("p", "mbce-plain", "点击枚举标签即时保存（再点取消）；也可在上方输入自定义文本。"));
      var att = null;
      if (info && info.attitude && typeof info.attitude === "object") { att = info.attitude; }
      // $people 深层字段：昵称 + 年龄
      var nickRow = el("div", "mbce-row");
      nickRow.appendChild(el("span", "mbce-row-label", "昵称（nickname）"));
      var nickInp = el("input", "mbce-in");
      nickInp.type = "text";
      nickInp.value = (info && info.nickname !== undefined) ? String(info.nickname) : "";
      nickRow.appendChild(nickInp);
      var nickBtn = el("button", "mbce-btn", "保存");
      nickBtn.addEventListener("click", function () {
        var r = writePersonField(p.name, "nickname", nickInp.value);
        if (r && r.ok) { nickInp.value = String(r.to); }
        else { statusMsg((r && r.reason) ? r.reason : "失败"); }
      });
      nickRow.appendChild(nickBtn);
      g.appendChild(nickRow);
      var ageRow = el("div", "mbce-row");
      ageRow.appendChild(el("span", "mbce-row-label", "年龄（age，1-120）"));
      var ageInp = el("input", "mbce-in");
      ageInp.type = "number";
      ageInp.value = (info && info.age !== undefined) ? String(info.age) : "";
      ageRow.appendChild(ageInp);
      var ageBtn = el("button", "mbce-btn", "保存");
      ageBtn.addEventListener("click", function () {
        var r = writePersonField(p.name, "age", ageInp.value);
        if (r && r.ok) { ageInp.value = String(r.to); }
        else { statusMsg((r && r.reason) ? r.reason : "失败"); }
      });
      ageRow.appendChild(ageBtn);
      g.appendChild(ageRow);
      // 性别 + 标签（文本；gender 仅改字段，身体部件/代词不随动）
      [["gender", "性别（gender）"], ["label", "标签（label）"]].forEach(function (kv) {
        var row = el("div", "mbce-row");
        row.appendChild(el("span", "mbce-row-label", kv[1]));
        var inp = el("input", "mbce-in");
        inp.type = "text";
        inp.value = (info && info[kv[0]] !== undefined) ? String(info[kv[0]]) : "";
        row.appendChild(inp);
        var btn = el("button", "mbce-btn", "保存");
        btn.addEventListener("click", function () {
          var r = writePersonField(p.name, kv[0], inp.value);
          if (r && r.ok) { inp.value = String(r.to); }
          else { statusMsg((r && r.reason) ? r.reason : "失败"); }
        });
        row.appendChild(btn);
        g.appendChild(row);
      });
      g.appendChild(el("p", "mbce-plain", "注：gender 仅改字段，身体部件/代词/标签在构造时定，不随动。"));
      // 专业 + 学年（R8）
      [["major", "专业（major）"], ["year", "学年（year，1-10）"]].forEach(function (kv) {
        var row = el("div", "mbce-row");
        row.appendChild(el("span", "mbce-row-label", kv[1]));
        var inp = el("input", "mbce-in");
        inp.type = (kv[0] === "year") ? "number" : "text";
        inp.value = (info && info[kv[0]] !== undefined) ? String(info[kv[0]]) : "";
        row.appendChild(inp);
        var btn = el("button", "mbce-btn", "保存");
        btn.addEventListener("click", function () {
          var r = writePersonField(p.name, kv[0], inp.value);
          if (r && r.ok) { inp.value = String(r.to); }
          else { statusMsg((r && r.reason) ? r.reason : "失败"); }
        });
        row.appendChild(btn);
        g.appendChild(row);
      });
      // 已知状态（make_known 语义双键）
      var knownRow = el("div", "mbce-row");
      var curKnown = !!(info && info.name_known);
      knownRow.appendChild(el("span", "mbce-row-label", "已知状态（name_known=" + (curKnown ? "true" : "false") + "）"));
      var kBtn = el("button", "mbce-btn", curKnown ? "标记为未知" : "标记为已知");
      kBtn.addEventListener("click", function () {
        var r = markKnown(p.name, !curKnown);
        if (r && r.ok) {
          kBtn.textContent = curKnown ? "标记为已知" : "标记为未知";
          curKnown = !curKnown;
        } else { statusMsg((r && r.reason) ? r.reason : "失败"); }
      });
      knownRow.appendChild(kBtn);
      g.appendChild(knownRow);
      // NPC 技能（自发现，折叠默认收起）
      var sk = el("details");
      sk.appendChild(el("summary", null, "技能（skills，点击展开）"));
      var skBody = el("div", "mbce-group");
      sk.appendChild(skBody);
      var skData = (info && info.skills && typeof info.skills === "object") ? info.skills : null;
      var skKeys = skData ? Object.keys(skData) : [];
      if (skKeys.length === 0) { skBody.appendChild(el("p", "mbce-plain", "（无技能数据）")); }
      else {
        skKeys.forEach(function (key) {
          var row = el("div", "mbce-row");
          row.appendChild(el("span", "mbce-row-label", key));
          var inp = el("input", "mbce-in");
          inp.type = "number";
          inp.value = String(skData[key]);
          row.appendChild(inp);
          var btn = el("button", "mbce-btn", "保存");
          btn.addEventListener("click", function () {
            var r = writeSkill(p.name, key, inp.value);
            if (r && r.ok) { inp.value = String(r.to); }
            else { statusMsg((r && r.reason) ? r.reason : "失败"); }
          });
          row.appendChild(btn);
          skBody.appendChild(row);
        });
      }
      g.appendChild(sk);
      ATT_TYPES.forEach(function (kv) {
        g.appendChild(rowEl(kv[1] + "（attitude." + kv[0] + "）", att ? att[kv[0]] : undefined, function (raw) { return writeAttitude(p.name, kv[0], raw); }));
      });
      // 全字段查看器（R11）：只读 JSON；R15 懒渲染——展开时才 stringify（人物对象可能很大，是首渲染卡顿主因）
      var full = el("details");
      full.appendChild(el("summary", null, "查看全部字段（只读 JSON）"));
      var fBody = el("div", "mbce-group");
      full.appendChild(fBody);
      var fBuilt = false;
      function buildFull() {
        if (fBuilt) { return; }
        fBuilt = true;
        try {
          fBody.appendChild(el("p", "mbce-plain", JSON.stringify(info, null, 2)));
        } catch (e) {
          fBody.appendChild(el("p", "mbce-plain", "（该 NPC 对象含循环引用/函数，无法 JSON 展示）"));
        }
      }
      full._mbceBuild = buildFull; // 暴露给单测（测试桩的 addEventListener 是 no-op）
      full.addEventListener("toggle", function () { if (full.open) { buildFull(); } });
      g.appendChild(full);
      box.appendChild(det);
    });
    return true;
  }

  M.rel = {
    version: M.version,
    writeAttitude: writeAttitude,
    setCrush: setCrush,
    toggleFavorite: toggleFavorite,
    writeRelationship: writeRelationship,
    writePersonField: writePersonField,
    markKnown: markKnown,
    writeSkill: writeSkill,
    relLabel: relLabel,
    render: renderRel,
  };

  var origRender = M.data.render;
  M.data.render = function (tabId, box) {
    if (tabId === "rel") { return renderRel(box); }
    return origRender(tabId, box);
  };
})();
