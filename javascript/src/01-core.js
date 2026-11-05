/* ============================================================================
 * 01-core.js — MapleBirchCE-CoT 核心常量与运行时根（版本双源：boot.json 同步）
 * P1：mbCE_cot 运行时根 + stage 自检状态机；shell/adapter 由 02/03 注入。
 * ========================================================================== */
"use strict";

const MCE_VERSION = "0.7.0"; // 双源：boot.json version 必须一致

// R13 中文词表（来源：游戏 setup.* 键 + ModI18N 中文对照；专名保留英文键作 tooltip）
const MCE_SKILL_ZH = {
  "Charisma": "魅力", "Willpower": "意志力", "Exhibitionism": "暴露癖", "Voyeurism": "窥淫癖",
  "Sexual Knowledge": "性知识", "Disinhibition": "放纵", "Dominance": "支配", "Submission": "顺从",
  "Hand": "手技", "Oral": "口技", "Vaginal": "阴道", "Anal": "肛", "Physical": "体能",
  "Intellectual": "智力", "Artistic": "艺术", "Photography": "摄影", "Masturbation": "自慰",
};
const MCE_INCL_ZH = { // 常用倾向中文（其余 98 键为游戏专名，保留英文 + 完整清单见游戏「角色倾向」页）
  "Open Relationships": "开放关系", "Polyamorous": "多元恋", "Demisexual": "半性恋",
  "Asexual": "无性恋", "Aromantic": "无浪漫", "Insecure": "不自信", "Shy": "害羞",
  "Confident": "自信", "Kind": "善良", "Loyal": "忠诚", "Gregarious": "合群", "Loner": "独行",
  "Vegetarian": "素食", "Vegan": "纯素", "Pescetarian": "鱼素", "Cheater": "不忠",
  "Particular": "挑剔", "Pleaser": "讨好型", "Careful": "谨慎", "Eager": "热切",
};
const MCE_CAT_ZH = { // 人物分类（对应游戏「人物」面板原版 tab）
  "fav": "⭐ 关注的人", "rom": "♥ 浪漫伴侣", "crush": "💗 暗恋", "friend": "😊 朋友",
  "acq": "👋 认识的人", "admire": "💗 仰慕者", "special": "🤝 特殊人物",
  "faculty": "🎓 教职工", "cowork": "💼 同事", "ex": "💔 前任", "rival": "👿 对手",
};

window.mbCE_cot = {
  version: MCE_VERSION,
  game: "CoT",
  targetGameVersion: "0.8.2i",
  modName: "MapleBirchCE-CoT",
  startedAt: new Date().toISOString(),
  stage: { core: "ok", adapter: "pending", shell: "pending", keys: "pending" },
  adapter: null, // 03-cot-adapter.js 注入
  shell: null,   // 02-shell.js 注入
  // R13 中文词表（供各页渲染用）
  skillZh: MCE_SKILL_ZH,
  inclZh: MCE_INCL_ZH,
  catZh: MCE_CAT_ZH,
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
