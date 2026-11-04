/* ============================================================================
 * 04-p2-data.js — MapleBirchCE-CoT P2 数值/角色页数据层与渲染
 * 键模型（StoryInit 取证）：
 *   $pcmoney=500；$pcskills={Charisma...13 键}；$pcstats={age...7 键}；
 *   $pcneeds={Food...13 键，1000 满值尺度}；$pcinclinations=[]；
 *   $people = NPC 名 -> 数据对象（relationship/special/style...）；
 *   时间键 $hour/$minute（0-23/0-59 校验）；跨天进位由游戏推进，CE 只改时分。
 * 纪律：全部写入走 adapter.writeVar（$mbCE_wrote 留痕）；范围校验拒绝越界。
 * ========================================================================== */
"use strict";
(function () {
  var M = window.mbCE_cot;
  if (!M || M.data) { return; } // 防重入

  var A = null; // 03 先加载

  var GROUPS = [
    {
      id: "skills", label: "技能", path: "pcskills",
      keys: [["Charisma", "魅力"], ["Willpower", "意志"], ["Exhibitionism", "暴露癖"], ["Voyeurism", "窥视癖"], ["Sexual Knowledge", "性知识"], ["Disinhibition", "放纵"], ["Dominance", "支配"], ["Submission", "顺从"], ["Hand", "手技"], ["Oral", "口技"], ["Vaginal", "阴道"], ["Anal", "肛"], ["Penetrative", "插入"]],
    },
    {
      id: "stats", label: "身体", path: "pcstats",
      keys: [["age", "年龄"], ["height", "身高"], ["plumpness", "丰满"], ["muscle", "肌肉"], ["breast size", "胸围"], ["penis size", "阴茎"], ["ass size", "臀"]],
    },
    {
      id: "needs", label: "需求", path: "pcneeds",
      keys: [["Food", "饱食"], ["Rest", "休息"], ["Relaxation", "放松"], ["Attention", "关注"], ["Bladder", "膀胱"], ["Hygiene", "卫生"], ["Composure", "镇定"], ["Release", "释放"], ["Arousal", "性奋"], ["Satisfaction", "满足"], ["Pain", "疼痛"], ["Humiliation", "羞辱"], ["Drunkenness", "醉意"]],
    },
  ];

  var TOP = {
    money: { path: "pcmoney", label: "金钱", type: "int" },
    day: { path: "day", label: "日（$day）", type: "int", min: 1, max: 31 },
    month: { path: "month", label: "月索引（$month，0=Autumber）", type: "int", min: 0, max: 11 },
    year: { path: "year", label: "年（$year）", type: "int", min: 1, max: 9999 },
    gameday: { path: "gameday", label: "游戏日（$gameday）", type: "int", min: 1, max: 9999 },
    gameyear: { path: "gameyear", label: "游戏年（$gameyear）", type: "int", min: 1, max: 9999 },
    hour: { path: "hour", label: "小时", type: "int", min: 0, max: 23 },
    minute: { path: "minute", label: "分钟", type: "int", min: 0, max: 59 },
  };

  function adapter() {
    if (!A) { A = M.adapter; }
    return A;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined) { n.textContent = text; }
    return n;
  }

  function applyEdit(path, subKey, raw) {
    var a = adapter();
    if (!a) { return { ok: false, reason: "no-adapter" }; }
    if (raw === "" || raw === null || raw === undefined) { return { ok: false, reason: "empty" }; }
    var v = Number(raw);
    if (!isFinite(v)) { return { ok: false, reason: "nan" }; }
    if (subKey === null || subKey === undefined) {
      var meta = TOP[path] || null;
      if (meta && (v < meta.min || v > meta.max)) { return { ok: false, reason: "range:" + meta.min + "-" + meta.max }; }
      return a.writeVar(meta ? meta.path : path, v);
    }
    var g = GROUPS.filter(function (g2) { return g2.id === path || g2.path === path; })[0];
    var full = (g ? g.path : path) + "." + subKey;
    return a.writeVar(full, v);
  }

  function readGroup(path) {
    var a = adapter();
    if (!a) { return null; }
    var base = a.readVar(path);
    if (!base || typeof base !== "object") { return {}; }
    return base;
  }

  function rowEl(label, value, onSave, key) {
    var wrap = el("div");
    wrap.className = "mbce-row";
    if (key !== undefined) { wrap.setAttribute("data-key", String(key)); }
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
        var msg = (r && r.reason) ? (M.i18n && M.i18n.reason ? M.i18n.reason(r.reason) : r.reason) : "失败";
        var st = M.shell && M.shell.statusEl;
        if (st) { st.textContent = "保存未生效：" + msg + "（写档留痕 $mbCE_wrote 可查）"; }
      }
    });
    wrap.appendChild(btn);
    return wrap;
  }

  function renderStats(box) {
    var a = adapter();
    if (!a) { box.appendChild(el("p", "mbce-plain", "适配层未就绪")); return true; }
    box.appendChild(el("p", "mbce-plain", "写入即时生效并留痕 $mbCE_wrote；读档可回退。"));
    // 搜索过滤（R9）：按键名/路径过滤所有行，输入即时过滤
    var rows = [];
    function makeRow(label, value, onSave, key) {
      var r = rowEl(label, value, onSave, key);
      rows.push(r);
      return r;
    }
    var sRow = el("div", "mbce-row");
    sRow.appendChild(el("span", "mbce-row-label", "过滤（按键名/路径）"));
    var sInp = el("input", "mbce-in");
    sInp.type = "text";
    sInp.addEventListener("input", function () {
      var q = sInp.value.trim().toLowerCase();
      rows.forEach(function (r) {
        var k = (r.getAttribute("data-key") || "").toLowerCase();
        r.style.display = (!q || k.indexOf(q) >= 0) ? "" : "none";
      });
    });
    sRow.appendChild(sInp);
    box.appendChild(sRow);
    // 分组折叠：每组一个 <details open>，标题可点击收起/展开；折叠状态记忆（R8）
    var statsLsKey = "mbCE_cot_ui_stats";
    function readClosedGroups() {
      try { var arr = JSON.parse(localStorage.getItem(statsLsKey) || "[]"); return Array.isArray(arr) ? arr : []; }
      catch (e) { return []; }
    }
    function groupBlock(title, gid) {
      var det = el("details");
      det.open = "open";
      det.setAttribute("data-gid", gid);
      if (readClosedGroups().indexOf(gid) >= 0) { det.open = ""; }
      det.addEventListener("toggle", function () {
        var arr = readClosedGroups();
        var isOpen = !!det.open;
        var i = arr.indexOf(gid);
        if (!isOpen && i < 0) { arr.push(gid); }
        if (isOpen && i >= 0) { arr.splice(i, 1); }
        try { localStorage.setItem(statsLsKey, JSON.stringify(arr)); } catch (e) {}
      });
      det.appendChild(el("summary", null, title));
      var body = el("div", "mbce-group");
      det.appendChild(body);
      box.appendChild(det);
      return body;
    }
    var topBody = groupBlock("顶层数值与时间", "top");
    Object.keys(TOP).forEach(function (k) {
      var meta = TOP[k];
      var cur = a.readVar(meta.path);
      topBody.appendChild(makeRow(meta.label + "（" + meta.path + "）", cur, function (raw) { return applyEdit(k, null, raw); }, meta.path));
    });
    GROUPS.forEach(function (g) {
      var body = groupBlock(g.label + "（$" + g.path + "）", g.id);
      var base = readGroup(g.path);
      g.keys.forEach(function (kv) {
        body.appendChild(makeRow(kv[1] + "（" + kv[0] + "）", base[kv[0]], function (raw) { return applyEdit(g.id, kv[0], raw); }, kv[0]));
      });
    });
    return true;
  }

  function renderChar(box) {
    var a = adapter();
    if (!a) { box.appendChild(el("p", "mbce-plain", "适配层未就绪")); return true; }
    var pc = el("div", "mbce-group");
    pc.appendChild(el("b", null, "PC 基本信息"));
    [["pcname", "姓名"], ["pcnickname", "昵称"], ["pcgender", "性别"], ["pcage", "年龄"], ["pcmajor", "专业"], ["pcspecies", "种族"]].forEach(function (kv) {
      var v = a.readVar(kv[0]);
      pc.appendChild(el("p", "mbce-plain", kv[1] + "：" + (v === undefined ? "（未初始化）" : String(v))));
    });
    box.appendChild(pc);
    var people = el("div", "mbce-group");
    people.appendChild(el("b", null, "认识的人（$people 自发现）"));
    var list = discoverPeople();
    if (list.length === 0) { people.appendChild(el("p", "mbce-plain", "（暂无，剧情推进后出现）")); }
    list.forEach(function (p) {
      var line = p.name;
      if (p.relationship !== undefined) { line += " · " + p.relationship; }
      if (p.special) { line += " · special"; }
      people.appendChild(el("p", "mbce-plain", line));
    });
    box.appendChild(people);
    return true;
  }

  function discoverPeople() {
    var a = adapter();
    if (!a) { return []; }
    var people = a.readVar("people");
    if (!people || typeof people !== "object") { return []; }
    var out = [];
    Object.keys(people).forEach(function (name) {
      var o = people[name];
      if (!o || typeof o !== "object") { return; }
      out.push({ name: name, relationship: o.relationship, special: o.special });
    });
    return out.sort(function (x, y) { return x.name < y.name ? -1 : 1; });
  }

  function render(tabId, box) {
    if (tabId === "stats") { return renderStats(box); }
    if (tabId === "char") { return renderChar(box); }
    return false; // 其他 tab 交给 shell 占位
  }

  M.data = {
    version: M.version,
    groups: GROUPS,
    top: TOP,
    applyEdit: applyEdit,
    readGroup: readGroup,
    discoverPeople: discoverPeople,
    render: render,
  };
})();
