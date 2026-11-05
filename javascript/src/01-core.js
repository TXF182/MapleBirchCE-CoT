/* ============================================================================
 * 01-core.js — MapleBirchCE-CoT 核心常量与运行时根（版本双源：boot.json 同步）
 * P1：mbCE_cot 运行时根 + stage 自检状态机；shell/adapter 由 02/03 注入。
 * ========================================================================== */
"use strict";

const MCE_VERSION = "0.7.2"; // 双源：boot.json version 必须一致

// R13 中文词表（来源：游戏 setup.* 键 + ModI18N 中文对照；专名保留英文键作 tooltip）
const MCE_SKILL_ZH = {
  "Charisma": "魅力", "Willpower": "意志力", "Exhibitionism": "暴露癖", "Voyeurism": "窥淫癖",
  "Sexual Knowledge": "性知识", "Disinhibition": "放纵", "Dominance": "支配", "Submission": "顺从",
  "Hand": "手技", "Oral": "口技", "Vaginal": "阴道", "Anal": "肛", "Physical": "体能",
  "Intellectual": "智力", "Artistic": "艺术", "Photography": "摄影", "Masturbation": "自慰",
};
const MCE_INCL_ZH = { // R15：98 键全量中文（游戏侧无中文词条，本表为 CE 自建语义译名；值即游戏 setup.inclinations 键）
  "Lewd Exhibitionist": "淫荡暴露者", "Cautious Exhibitionist": "谨慎暴露者",
  "Proud Exhibitionist": "骄傲暴露者", "Helpless Exhibitionist": "无助暴露者",
  "Dogging Enthusiast": "野合爱好者", "Forward": "主动", "Dominant": "支配",
  "Accommodating": "配合顺从", "Submissive": "顺从", "Free Use": "任人取用",
  "Dominant Vibe": "支配气场", "Soft Dom": "温和支配", "Hard to Resist": "难以抗拒",
  "Submissive Vibe": "顺从气场", "Brat": "顽劣撒娇", "Switch": "攻受皆可",
  "Masochist": "受虐癖", "Sadist": "施虐癖", "Humiliation Kink": "羞辱癖",
  "Risktaker": "冒险者", "Breeding Kink": "播种癖", "Careful": "谨慎",
  "Cumslut": "精液瘾", "Facializer": "颜射癖", "Seen It All": "见多识广",
  "Voyeur": "窥淫癖", "Peeper": "偷窥者", "Intimate Witness": "亲密旁观者",
  "Squirter": "潮吹", "Pee-Squirter": "喷尿", "Watersports Enthusiast": "黄金浴爱好者",
  "Golden Showerer": "黄金浴受体", "Overactive Bladder": "膀胱敏感", "Breaker": "破防者",
  "Attentive Lover": "体贴情人", "Hair Trigger": "一点就着", "Takes Patience": "需耐心",
  "Edgemaster": "边缘控制", "Tantric Willpower": "坦陀罗意志", "Eager": "热切",
  "Anal Fetish": "肛交癖", "Oral Fixation": "口交癖", "Sensitive Nipples": "敏感乳头",
  "Foot Enthusiast": "恋足", "Fuckbuddy": "炮友", "Casual Hookup": "随意约炮",
  "Hatefuck": "恨意性爱", "Slut": "淫妇", "Always Horny": "永远发情",
  "Chaste": "守贞", "Nature Prevails": "本性难移", "Whore": "娼妇",
  "Findom": "财务支配", "Whore Connoisseur": "娼妓鉴赏家", "Paypig": "付款猪",
  "Taker": "索取者", "Target": "被索取者", "Underwear Connoisseur": "内衣鉴赏家",
  "Natural Odor": "自然体味", "Loner": "独行者", "Gregarious": "群居动物",
  "Pleaser": "讨好型", "Particular": "挑剔", "Confident": "自信",
  "Insecure": "不自信", "Shy": "害羞", "Stoner": "飞叶子",
  "Toy Enthusiast": "玩具爱好者", "Fur Enthusiast": "兽人爱好者", "Bully": "欺凌者",
  "Kind": "善良", "Trichophilia": "恋发癖", "Slob": "邋遢",
  "Cheater": "不忠", "Loyal": "忠诚", "Retail Therapy": "购物疗法",
  "Lucky": "幸运", "Unlucky": "倒霉", "Iron Will": "钢铁意志",
  "Easily Pressured": "易被施压", "Asexual": "无性恋", "Aromantic": "无浪漫",
  "Polyamorous": "多元恋", "Open Relationships": "开放关系", "Demisexual": "半性恋",
  "Pescetarian": "鱼素", "Vegetarian": "素食", "Vegan": "纯素",
  "Likes Standing Position": "喜站姿", "Likes Doggy Style": "喜后入",
  "Likes Missionary": "喜传教士", "Likes Spooning": "喜侧卧", "Likes Cowgirl": "喜女上",
  "Knowledge from Eden": "伊甸之知", "Knowledge from the Deep": "深渊之知",
  "Chicken or the Egg": "先有鸡还是先有蛋", "No Rest for the Wicked": "恶人无宁日",
  "Earned Reward": "应得奖赏",
};
const MCE_INCL_COMMON = [ // R15：常用倾向（角色页默认展示的 20 项；完整 98 项在「完整倾向清单」折叠里）
  "Open Relationships", "Polyamorous", "Demisexual", "Asexual", "Aromantic",
  "Insecure", "Shy", "Confident", "Kind", "Loyal",
  "Gregarious", "Loner", "Vegetarian", "Vegan", "Pescetarian",
  "Cheater", "Particular", "Pleaser", "Careful", "Eager",
];
const MCE_LOC_ZH = { // R15：地点 passage 专名 → 中文显示名（来源：ModI18N database_maps.js 的 name 字段实测）
  "Campus": "校园", "ChamberlainHall": "钱伯兰大厅", "EmersonBuilding": "埃默森大楼",
  "HallowellBuilding": "哈洛韦尔大楼", "SmithLibrary": "史密斯图书馆", "SummitMarket": "顶峰市场",
  "ThoreauBuilding": "梭罗大楼", "BangCoffee": "邦咖啡", "BlodgettGym": "布洛杰特体育馆",
  "HousingRoom": "", "YourDorm": "你的宿舍", "NutmegSt": "豆蔻街", "RiverRat": "河鼠",
};
const MCE_CAT_ZH = { // 人物分类（对应游戏「人物」面板原版 tab）
  "fav": "⭐ 关注的人", "rom": "♥ 浪漫伴侣", "crush": "💘 暗恋", "friend": "😊 朋友",
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
  inclCommon: MCE_INCL_COMMON,
  locZh: MCE_LOC_ZH,
  catZh: MCE_CAT_ZH,
  // R15 渲染优化：页签 DOM 缓存命中统计（关于页「自检」展示，便于诊断卡顿）
  perf: { cacheHit: 0, cacheMiss: 0, lastBuildMs: 0 },
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
