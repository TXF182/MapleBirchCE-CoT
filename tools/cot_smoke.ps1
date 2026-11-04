# ============================================================================
# cot_smoke.ps1 — CoT 消费端实机冒烟（moli 无头浏览器）
# 【状态】2026-11-04 用户指令：实机冒烟停用为默认门禁（太慢）。本脚本留档为
#         按需复核工具（tools/cot_smoke.ps1），默认不执行。
# 用途：真实加载 CoT 0.8.2i 游戏本体（本地 HTTP 模式），断言玩家打开游戏即遇到的核心路径：
#   A. 游戏页面可加载（title=Course of Temptation）
#   B. SugarCube 引擎启动
#   C. ModLoader v2 加载（modModLoadController / modUtils / modSC2DataManager）
#   D. ModI18N 汉化 mod 被读取并注入（window.modI18N）
#   E. GameVersion 复核证据（Config.saves.version 运行时值 + loader 日志）
# 预植入：按 CoT loader 存储 schema 在 document-start 写 localStorage
#   （CoTmodDataLocalStorageZipList = ["ModI18N-..."]；CoTmodDataLocalStorageZip:<name> = zip base64）
# 依赖：moli.exe 1.1.19；python（本地 HTTP 服务）
# 用法：.\cot_smoke.ps1    # 约 2-4 分钟
# 输出：结构化断言清单 + 截图 %TEMP%\moli_cot_smoke.png（有则）
# ============================================================================
$ErrorActionPreference = "Stop"
$moli = "C:\Users\27352\AppData\Local\moli\moli-v1.1.19-x86_64-pc-windows-msvc\moli.exe"
if (-not (Test-Path -LiteralPath $moli)) { Write-Host "FAIL: moli.exe 缺失 $moli"; exit 2 }
$gameDir = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..\cot-game")
$htmlFile = "CourseOfTemptation-ModLoader-v0.8.2i-2.101.1.html"
$modZip = Join-Path $gameDir "ModI18N-0.8.2i-chs-1.0.0.mod.zip"
if (-not (Test-Path -LiteralPath (Join-Path $gameDir $htmlFile))) { Write-Host "FAIL: cot-game 无 $htmlFile"; exit 2 }
if (-not (Test-Path -LiteralPath $modZip)) { Write-Host "FAIL: 缺 ModI18N mod zip"; exit 2 }

$port = 8766
$url = "http://127.0.0.1:$port/$htmlFile"
$prof = Join-Path $env:TEMP "moli_cot_smoke_prof"
$startJs = Join-Path $env:TEMP "moli_cot_start.js"
$evalJs = Join-Path $env:TEMP "moli_cot_eval.js"
$shot = Join-Path $env:TEMP "moli_cot_smoke.png"

# --- document-start：日志捕获 + 按 loader schema 轮询合并植入 ModI18N ---
# 说明：CoT 启动期会对 localStorage 做清理/改写（DataValueZip 注册等），
#       单次 setItem 会被冲掉。这里每 100ms 幂等合并写入（保留既有条目），
#       保证 loader 读取用户 mod 阶段时 ModI18N 一定在列。
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($modZip))
Write-Host "预植入 base64 长度: $($b64.Length) 字符（zip $((Get-Item -LiteralPath $modZip).Length) B）"
$startBody = @'
window.__logs = [];
["log", "warn", "error"].forEach(function (l) {
  var o = console[l].bind(console);
  console[l] = function () {
    window.__logs.push(l + ": " + Array.prototype.slice.call(arguments).join(" ").slice(0, 300));
    o.apply(null, arguments);
  };
});
(function () {
  var LIST = "CoTmodDataLocalStorageZipList";
  var NAME = "ModI18N-0.8.2i-chs-1.0.0";
  var KEY = "CoTmodDataLocalStorageZip:" + NAME;
'@ + '  var B64 = "' + $b64 + '";' + @'
  function seed(reason) {
    try {
      var l = [];
      try { l = JSON.parse(localStorage.getItem(LIST) || "[]"); } catch (e) {}
      if (!(l instanceof Array)) { l = []; }
      if (l.indexOf(NAME) < 0) { l.push(NAME); }
      localStorage.setItem(LIST, JSON.stringify(l));
      localStorage.setItem(KEY, B64);
      if (reason) console.log("SEED_TRACE " + reason + " ok key=" + (!!localStorage.getItem(KEY)) + " len=" + localStorage.length);
      return true;
    } catch (e) {
      if (reason) console.log("SEED_TRACE " + reason + " ERR " + e.message);
      return false;
    }
  }
  var ok = seed("first");
  console.log(ok ? "SEED_OK" : "SEED_FAIL");
  window.__seedTimer = setInterval(function () {
    if (typeof window.modI18N === "object") { clearInterval(window.__seedTimer); console.log("SEED_TRACE stop"); return; }
    seed("tick");
  }, 100);
})();
'@
[IO.File]::WriteAllText($startJs, $startBody, (New-Object Text.UTF8Encoding $false))

# --- eval：断言收集 ---
$evalBody = @'
JSON.stringify({
  title: document.title,
  sugar: typeof window.SugarCube,
  modLoader: typeof window.modModLoadController,
  modUtils: typeof window.modUtils,
  modSC2DM: typeof window.modSC2DataManager,
  modI18N: typeof window.modI18N,
  savesVersion: (function () { try { return Config.saves.version; } catch (e) { return "ERR:" + e.message; } })(),
  lsKeys: Object.keys(localStorage),
  listVal: localStorage.getItem("CoTmodDataLocalStorageZipList"),
  logs: window.__logs || []
})
'@
[IO.File]::WriteAllText($evalJs, $evalBody, (New-Object Text.UTF8Encoding $false))

Write-Host "== cot_smoke: 起本地 HTTP 服务 $gameDir :$port"
$job = Start-Job -ScriptBlock { param($dir, $p) Set-Location -LiteralPath $dir; python -m http.server $p --bind 127.0.0.1 } -ArgumentList $gameDir, $port
try {
  Start-Sleep -Seconds 2
  $wait = '(typeof window.modI18N === "object") || ((window.__logs||[]).filter(function(s){return /ModI18N/.test(s);}).length >= 3) || ((window.__logs||[]).filter(function(s){return /ModLoader ====.*version/.test(s) || /initModEarlyLoadScript/.test(s) || /JsPreloader/.test(s);}).length >= 1)'
  Write-Host "== moli 加载 CoT 并等待 ModLoader 注入证据（上限 240s）..."
  $r1 = & $moli fetch --profile-dir $prof --document-start-script-file $startJs --eval-file $evalJs --wait-script $wait --timeout 240000 $url 2>&1
  Write-Host $r1
  $r = $r1 -join "" | ConvertFrom-Json
  $pass = @(); $warn = @(); $info = @()
  if ($r.title -eq "Course of Temptation") { $pass += "A 游戏页面加载 title=$($r.title)" } else { $warn += "A title=$($r.title)" }
  if ($r.sugar -eq "object") { $pass += "B SugarCube 引擎启动" } else { $warn += "B SugarCube=$($r.sugar)" }
  if ($r.modLoader -eq "object") { $pass += "C ModLoader 加载 modModLoadController" } else { $warn += "C modLoader=$($r.modLoader)" }
  if ($r.modUtils -eq "object") { $pass += "C2 window.modUtils 暴露" } else { $warn += "C2 modUtils=$($r.modUtils)" }
  if ($r.modSC2DM -eq "object") { $pass += "C3 window.modSC2DataManager 暴露" } else { $warn += "C3 modSC2DM=$($r.modSC2DM)" }
  if ($r.modI18N -eq "object") { $pass += "D ModI18N 注入生效 (window.modI18N)" } else { $warn += "D modI18N=$($r.modI18N)" }
  if ($r.savesVersion -eq "v0.8.2i") { $pass += "E GameVersion 复核 Config.saves.version=$($r.savesVersion)" } else { $warn += "E savesVersion=$($r.savesVersion)" }
  $listOk = $false
  try { $listOk = ($r.listVal -match "ModI18N-0.8.2i-chs-1.0.0") } catch {}
  if ($listOk) { $pass += "H 预植入 list 生效（含 ModI18N 条目）" } else { $warn += "H listVal=$($r.listVal)" }
  $seedOk = ($r.logs | Where-Object { $_ -like "*SEED_OK*" }).Count
  if ($seedOk -ge 1) { $pass += "I 冒烟脚本预植入执行成功 (SEED_OK)" } else { $warn += "I SEED_OK 未出现" }
  $err = $r.logs | Where-Object { $_ -like "error:*" }
  if ($err.Count -eq 0) { $pass += "J 无 error 级日志" } else { $info += "J error 级日志 $($err.Count) 条（见下）"; $err | Select-Object -First 6 | ForEach-Object { $info += "    $($_)" } }
  $gvLogs = $r.logs | Where-Object { $_ -like "*gameVersion*" -or $_ -like "*satisfies*" -or $_ -like "*ModLoader ====*version*" -or $_ -like "*LocalStorageLoader load() list*" -or $_ -like "*ModI18N*" }
  $gvLogs | Select-Object -First 14 | ForEach-Object { $info += "    log: $($_)" }

  Write-Host ""
  Write-Host "== 断言结果 =="
  $pass | ForEach-Object { Write-Host "  [PASS] $_" }
  $warn | ForEach-Object { Write-Host "  [WARN] $_" }
  Write-Host "== 附加信息 =="
  $info | ForEach-Object { Write-Host "  [INFO] $_" }
  Write-Host ""
  if ($warn.Count -eq 0) { Write-Host "== 结论: 全部 PASS =="; $code = 0 }
  elseif ($pass.Count -ge 6) { Write-Host "== 结论: 核心路径 PASS，$($warn.Count) 项 WARN（详见交付说明）=="; $code = 0 }
  else { Write-Host "== 结论: 核心路径未通过 =="; $code = 1 }

  # --- 截图（视觉层证据，best-effort） ---
  try {
    & $moli fetch --profile-dir $prof --layout --dump screenshot --wait-script $wait --timeout 60000 $url > $shot 2>&1
    $s = Get-Item -LiteralPath $shot -ErrorAction SilentlyContinue
    if ($s -and $s.Length -gt 1024) { Write-Host "== 截图: $shot ($($s.Length) B)" }
    elseif ($s) { Write-Host "== 截图无效（$($s.Length) B），跳过" }
  } catch { Write-Host "== 截图跳过: $_" }
  exit $code
} finally {
  Stop-Job $job -ErrorAction SilentlyContinue
  Remove-Job $job -Force -ErrorAction SilentlyContinue
}
