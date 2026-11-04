/* ============================================================================
 * 06-p4-places.js — MapleBirchCE-CoT P4 场景/地点页
 * 键模型（取证）：
 *   $location = Twine passage 名（地点 id；loc:XXX tag → $location = XXX.substring(3)；
 *     people_at_location 用 Story.get(HousingRoom|loc).tags 解析地点）
 *   已知地点（people_at_location 内嵌 + 采样）：Campus/BlodgettGym/ChamberlainHall/
 *     EmersonBuilding/HallowellBuilding/SmithLibrary/SummitMarket/ThoreauBuilding/
 *     BangCoffee/HousingRoom/YourDorm/NutmegSt/RiverRat
 *   $previouslocation、$locationblock（区域）
 *   $peopleatlocation = NPC 名数组（setup.people_at_location() 计算）
 *   $weather = setup.Weather.state() 对象（todaysWeather/yesterdaysWeather，只读展示；
 *     时间推进时游戏重建快照 V.weather = setup.Weather.state()，直改不持久）
 *   $preencountertags = 场景标签数组（遭遇结束重置 []）；$lastloc / $lastloctags（地点标签数组）
 *   $findr = 玩家 Findr 状态（{name, tags[], liked[], disliked[], matched[]}，注册时创建；
 *     setup.Findr 为方法容器 username/uses/on_now/people_on/likes_tags/npc_tags/get_new_match）
 * 纪律：地点跳转/标签清空/Findr 状态走 adapter 留痕；weather 只读；$findr 缺失拒绝写入。
 * ========================================================================== */
"use strict";
(function () {
  var M = window.mbCE_cot;
  if (!M || !M.data || M.places) { return; } // 依赖 04 数据层，防重入

  var D = M.data;
  var KNOWN_LOCATIONS = [
    "Campus", "ChamberlainHall", "EmersonBuilding", "HallowellBuilding", "SmithLibrary",
    "SummitMarket", "ThoreauBuilding", "BangCoffee", "BlodgettGym",
    "HousingRoom", "YourDorm", "NutmegSt", "RiverRat",
  ];
  // $findr 可编辑字段（玩家 Findr 状态；tags 有效值提示来自 setup.Findr.likes_tags 检查的标签集）
  var FIND_FIELDS = [["name", "用户名"], ["tags", "主页标签"], ["liked", "已喜欢（NPC 名）"], ["disliked", "不喜欢（NPC 名）"], ["matched", "已匹配（NPC 名）"]];
  var FIND_TAG_HINTS = ["Open", "Poly", "Romance", "Hookups", "Dominant", "Submissive", "Exhibitionist", "Voyeur"];

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

  function setLocation(name) {
    var a = adapter();
    if (!a) { return { ok: false, reason: "no-adapter" }; }
    var v = (name === undefined || name === null) ? "" : String(name).trim();
    if (!v) { return { ok: false, reason: "empty" }; }
    return a.writeVar("location", v);
  }

  function clearPreencounterTags() {
    var a = adapter();
    if (!a) { return { ok: false, reason: "no-adapter" }; }
    return a.writeVar("preencountertags", []);
  }

  // 逗号分隔文本 ↔ 数组（支持中英文逗号、去空白、去空项）
  function parseList(s) {
    if (s === undefined || s === null) { return []; }
    return String(s).split(/[,，]/).map(function (x) { return x.trim(); }).filter(function (x) { return x !== ""; });
  }
  function formatList(arr) {
    if (!arr || !Array.isArray(arr)) { return ""; }
    return arr.join(", ");
  }

  function readFindr() {
    var a = adapter();
    if (!a) { return null; }
    var f = a.readVar("findr");
    return (f && typeof f === "object") ? f : null;
  }

  function writeFindrField(field, raw) {
    var a = adapter();
    if (!a) { return { ok: false, reason: "no-adapter" }; }
    if (raw === undefined || raw === null) { return { ok: false, reason: "empty" }; }
    var f = readFindr();
    if (!f) { return { ok: false, reason: "no-findr" }; }
    if (field === "name") {
      var v = String(raw).trim();
      if (!v) { return { ok: false, reason: "empty" }; }
      return a.writeVar("findr.name", v);
    }
    if (["tags", "liked", "disliked", "matched"].indexOf(field) < 0) { return { ok: false, reason: "empty" }; }
    return a.writeVar("findr." + field, parseList(raw));
  }

  function renderPlace(box) {
    var a = adapter();
    if (!a) { box.appendChild(el("p", "mbce-plain", "适配层未就绪")); return true; }

    var cur = el("div", "mbce-group");
    cur.appendChild(el("b", null, "当前地点"));
    var loc = a.readVar("location");
    var prev = a.readVar("previouslocation");
    cur.appendChild(el("p", "mbce-plain", "$location = " + (loc === undefined ? "（未初始化）" : String(loc))));
    if (prev !== undefined) { cur.appendChild(el("p", "mbce-plain", "$previouslocation = " + String(prev))); }
    box.appendChild(cur);

    var jump = el("div", "mbce-group");
    jump.appendChild(el("b", null, "地点跳转（$location = passage 名）"));
    KNOWN_LOCATIONS.forEach(function (name) {
      var row = el("div", "mbce-row");
      row.appendChild(el("span", "mbce-row-label", name));
      var btn = el("button", "mbce-btn", "前往");
      btn.addEventListener("click", function () {
        var r = setLocation(name);
        if (!r.ok) { statusMsg(r.reason); }
        else {
          loc = a.readVar("location");
          var p = cur.getElementsByTagName("p")[0];
          if (p) { p.textContent = "$location = " + String(loc); }
        }
      });
      row.appendChild(btn);
      jump.appendChild(row);
    });
    var freeRow = el("div", "mbce-row");
    freeRow.appendChild(el("span", "mbce-row-label", "自定义地点"));
    var inp = el("input", "mbce-in");
    inp.type = "text";
    inp.value = "";
    freeRow.appendChild(inp);
    var btn = el("button", "mbce-btn", "前往");
    btn.addEventListener("click", function () {
      var r = setLocation(inp.value);
      if (!r.ok) { statusMsg(r.reason); }
      else {
        inp.value = "";
        loc = a.readVar("location");
        var p = cur.getElementsByTagName("p")[0];
        if (p) { p.textContent = "$location = " + String(loc); }
      }
    });
    freeRow.appendChild(btn);
    jump.appendChild(freeRow);
    box.appendChild(jump);

    var pals = el("div", "mbce-group");
    pals.appendChild(el("b", null, "在场人物（$peopleatlocation）"));
    var pal = a.readVar("peopleatlocation");
    if (!pal || !Array.isArray(pal) || pal.length === 0) { pals.appendChild(el("p", "mbce-plain", "（无）")); }
    else { pals.appendChild(el("p", "mbce-plain", pal.join(" · "))); }
    box.appendChild(pals);

    var weather = el("div", "mbce-group");
    weather.appendChild(el("b", null, "天气（$weather，只读）"));
    weather.appendChild(el("p", "mbce-plain", "游戏时间推进会自动重建天气快照（V.weather = setup.Weather.state()），直改不持久，故只读。"));
    var wx = a.readVar("weather");
    if (wx && typeof wx === "object") {
      if (wx.todaysWeather !== undefined) { weather.appendChild(el("p", "mbce-plain", "今日：" + String(wx.todaysWeather))); }
      if (wx.yesterdaysWeather !== undefined) { weather.appendChild(el("p", "mbce-plain", "昨日：" + String(wx.yesterdaysWeather))); }
    } else {
      weather.appendChild(el("p", "mbce-plain", "（未初始化）"));
    }
    box.appendChild(weather);
    return true;
  }

  function renderScene(box) {
    var a = adapter();
    if (!a) { box.appendChild(el("p", "mbce-plain", "适配层未就绪")); return true; }

    var tagsBox = el("div", "mbce-group");
    tagsBox.appendChild(el("b", null, "场景标签（$preencountertags）"));
    var tags = a.readVar("preencountertags");
    if (!tags || !Array.isArray(tags) || tags.length === 0) { tagsBox.appendChild(el("p", "mbce-plain", "（空）")); }
    else { tagsBox.appendChild(el("p", "mbce-plain", tags.join(" · "))); }
    var clr = el("button", "mbce-btn", "清空标签");
    clr.addEventListener("click", function () {
      var r = clearPreencounterTags();
      if (r.ok) { tagsBox.getElementsByTagName("p")[0].textContent = "（空）"; }
      else { statusMsg(r.reason); }
    });
    tagsBox.appendChild(clr);
    box.appendChild(tagsBox);

    var last = el("div", "mbce-group");
    last.appendChild(el("b", null, "上次地点"));
    var lastloc = a.readVar("lastloc");
    if (lastloc !== undefined) { last.appendChild(el("p", "mbce-plain", "$lastloc = " + String(lastloc))); }
    var lasttags = a.readVar("lastloctags");
    if (lasttags && Array.isArray(lasttags) && lasttags.length) { last.appendChild(el("p", "mbce-plain", "$lastloctags = " + lasttags.join(" · "))); }
    box.appendChild(last);

    var findr = el("div", "mbce-group");
    findr.appendChild(el("b", null, "Findr 玩家状态（$findr）"));
    var f = readFindr();
    if (!f) {
      findr.appendChild(el("p", "mbce-plain", "（未注册 —— 先在游戏内完成 Findr 注册，状态变量 $findr 才会创建）"));
    } else {
      FIND_FIELDS.forEach(function (kv) {
        var field = kv[0], label = kv[1];
        var row = el("div", "mbce-row");
        row.appendChild(el("span", "mbce-row-label", label + "（findr." + field + "）"));
        var inp = el("input", "mbce-in");
        inp.type = "text";
        var cur = f[field];
        inp.value = (field === "name") ? String(cur === undefined || cur === null ? "" : cur) : formatList(cur);
        row.appendChild(inp);
        var btn = el("button", "mbce-btn", "保存");
        btn.addEventListener("click", function () {
          var r = writeFindrField(field, inp.value);
          if (r && r.ok) {
            inp.value = (field === "name") ? String(r.to) : formatList(r.to);
          } else { statusMsg((r && r.reason) ? r.reason : "失败"); }
        });
        row.appendChild(btn);
        findr.appendChild(row);
      });
      findr.appendChild(el("p", "mbce-plain", "tags 可用值：" + FIND_TAG_HINTS.join(" / ") + "（数组字段用逗号分隔，如 Open, Romance）"));
    }
    var note = el("p", "mbce-plain", "说明：setup.Findr 为方法容器（username/uses/on_now/people_on/likes_tags/npc_tags/get_new_match），NPC 是否在线上由游戏实时计算，无需也不可直改。");
    findr.appendChild(note);
    box.appendChild(findr);
    return true;
  }

  M.places = {
    version: M.version,
    knownLocations: KNOWN_LOCATIONS,
    setLocation: setLocation,
    clearPreencounterTags: clearPreencounterTags,
    parseList: parseList,
    formatList: formatList,
    readFindr: readFindr,
    writeFindrField: writeFindrField,
    renderPlace: renderPlace,
    renderScene: renderScene,
  };

  var origRender = M.data.render;
  M.data.render = function (tabId, box) {
    if (tabId === "place") { return renderPlace(box); }
    if (tabId === "scene") { return renderScene(box); }
    return origRender(tabId, box);
  };
})();
