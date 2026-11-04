# ============================================================================
# dev.ps1 — MapleBirchCE-CoT 开发闭环入口（P1：语法 → 单测 → 打包 verifier）
# 实机冒烟（moli）按用户指令停用为默认门禁，仅按需调用 tools\cot_smoke.ps1
# ============================================================================
$ErrorActionPreference = "Stop"
$repo = $PSScriptRoot   # dev.ps1 位于仓库根

Write-Host "== [1/3] 语法检查（node --check） =="
Get-ChildItem -LiteralPath (Join-Path $repo "javascript\src") -Filter "*.js" | Sort-Object Name | ForEach-Object {
    node --check $_.FullName
    Write-Host "  OK $($_.Name)"
}

Write-Host "== [2/3] 单元测试（node tests\run-tests.js） =="
node (Join-Path $repo "tests\run-tests.js")
if ($LASTEXITCODE -ne 0) { throw "单测失败" }

Write-Host "== [3/3] 打包 + verifier 4/4 + SHA256 =="
& (Join-Path $repo "tools\pack.ps1")
if ($LASTEXITCODE -ne 0) { throw "打包校验失败" }

Write-Host "== dev.ps1 全链 PASS =="
