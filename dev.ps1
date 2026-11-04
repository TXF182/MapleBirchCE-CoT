# ============================================================================
# dev.ps1 — MapleBirchCE-CoT 开发闭环入口（P0 骨架占位）
# P1 起承载：单元测试 → 静态取证核验 → 打包 verifier + SHA256 → 复制 zip 装进消费端 cot-game\
# 实机冒烟（moli）按用户指令停用为默认门禁，仅按需调用 tools\cot_smoke.ps1
# ============================================================================
$ErrorActionPreference = "Stop"
Write-Host "MapleBirchCE-CoT dev.ps1 — 当前 Phase 0（骨架）。P1 起接入 build/syntax/smoke/regression/E2E/gender 全链。"
