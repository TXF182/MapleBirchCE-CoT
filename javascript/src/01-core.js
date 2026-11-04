/* ============================================================================
 * 01-core.js — MapleBirchCE-CoT 核心常量与运行时根（版本双源：boot.json 同步）
 * P1：mbCE_cot 运行时根 + stage 自检状态机；shell/adapter 由 02/03 注入。
 * ========================================================================== */
"use strict";

const MCE_VERSION = "0.2.0"; // 双源：boot.json version 必须一致

window.mbCE_cot = {
  version: MCE_VERSION,
  game: "CoT",
  targetGameVersion: "0.8.2i",
  modName: "MapleBirchCE-CoT",
  startedAt: new Date().toISOString(),
  stage: { core: "ok", adapter: "pending", shell: "pending", keys: "pending" },
  adapter: null, // 03-cot-adapter.js 注入
  shell: null,   // 02-shell.js 注入
};
