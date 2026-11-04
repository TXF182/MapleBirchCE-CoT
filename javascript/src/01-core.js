/* ============================================================================
 * 01-core.js — MapleBirchCE-CoT 核心常量与运行时根（版本双源：boot.json 同步）
 * P1：mbCE_cot 运行时根 + stage 自检状态机；shell/adapter 由 02/03 注入。
 * ========================================================================== */
"use strict";

const MCE_VERSION = "0.6.7"; // 双源：boot.json version 必须一致

window.mbCE_cot = {
  version: MCE_VERSION,
  game: "CoT",
  targetGameVersion: "0.8.2i",
  modName: "MapleBirchCE-CoT",
  startedAt: new Date().toISOString(),
  stage: { core: "ok", adapter: "pending", shell: "pending", keys: "pending" },
  adapter: null, // 03-cot-adapter.js 注入
  shell: null,   // 02-shell.js 注入
  // i18n 基础（P5 生态层引用）：t 原文直通，reason 把用户可见的错误码汉化
  i18n: {
    enabled: false,
    t: function (key, fallback) {
      return (fallback === undefined || fallback === null) ? key : fallback;
    },
    reasons: {
      "no-adapter": "适配层未就绪",
      "no-store": "存档存储不可用",
      "undefined-value": "值为 undefined（拒绝写入）",
      "empty": "值为空",
      "nan": "非数字",
      "no-person": "该对象不存在",
      "no-findr": "未注册 Findr（请先游戏内注册）",
      "parent-missing": "父级键缺失",
    },
    reason: function (code) {
      if (!code) { return "失败"; }
      if (code.indexOf("range:") === 0) { return "超出范围：" + code.slice(6); }
      var head = code.split(":")[0];
      return (this.reasons[head] !== undefined) ? this.reasons[head] : code;
    },
  },
};
