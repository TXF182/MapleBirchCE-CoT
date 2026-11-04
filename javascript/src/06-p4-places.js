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
 *   $weather = setup.Weather.state() 对象（todaysWeather/yesterdaysWeather，只读展示）
 *   $preencountertags = 场景标签数组（遭遇结束重置 []）；$lastloc / $lastloctags（地点标签数组）
 * 纪律：地点跳转/标签清空走 adapter 留痕；数组只读展示；场景页 Findr 读 setup（try/catch）。
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
      if (!r.ok) { statusMsg(r.reason); inp.value = ""; }
      else {
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
    weather.appendChild(el("b", null, "天气（$weather 对象，只读）"));
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
    findr.appendChild(el("b", null, "Findr（约会软件，setup 只读）"));
    try {
      var F = window.Setup && window.Setup.Findr;
      if (F) {
        var parts = [];
        if (F.on_now !== undefined) { parts.push("on_now=" + String(F.on_now)); }
        if (F.people_on && Array.isArray(F.people_on)) { parts.push("people_on=" + F.people_on.length); }
        findr.appendChild(el("p", "mbce-plain", parts.length ? parts.join(" · ") : "（无运行数据）"));
      } else {
        findr.appendChild(el("p", "mbce-plain", "（setup.Findr 不可用）"));
      }
    } catch (e) {
      findr.appendChild(el("p", "mbce-plain", "（读取失败）"));
    }
    box.appendChild(findr);
    return true;
  }

  M.places = {
    version: M.version,
    knownLocations: KNOWN_LOCATIONS,
    setLocation: setLocation,
    clearPreencounterTags: clearPreencounterTags,
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
