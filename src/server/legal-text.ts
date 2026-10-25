const CHINESE_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const CHINESE_UNITS: Record<string, number> = {
  十: 10,
  百: 100,
  千: 1000,
};

export function chineseNumberToInteger(value: string): number | null {
  const normalizedValue = value.replace(/^第/, "").replace(/条$/, "");
  if (/^\d+$/.test(normalizedValue)) return Number(normalizedValue);

  let total = 0;
  let current = 0;
  let seen = false;

  for (const char of normalizedValue.replace(/[零〇]/g, "")) {
    if (char in CHINESE_DIGITS) {
      current = CHINESE_DIGITS[char];
      seen = true;
      continue;
    }
    const unit = CHINESE_UNITS[char];
    if (!unit) return null;
    total += (current || 1) * unit;
    current = 0;
    seen = true;
  }

  return seen ? total + current : null;
}

export function extractArticleNumber(question: string): number | null {
  const match = question.match(/第([零〇一二两三四五六七八九十百千\d]+)条/);
  return match ? chineseNumberToInteger(match[1]) : null;
}

export function extractLawMention(question: string): string | null {
  const quoted = question.match(/《([^》]{2,40})》/);
  if (quoted) return quoted[1].trim();
  const named = question.match(
    /(中华人民共和国[\u4e00-\u9fa5]{2,30}(?:法典|法|条例|规定|解释|办法))/,
  );
  return named?.[1] ?? null;
}

const LEGAL_TERMS = [
  "劳动合同",
  "劳动关系",
  "劳动仲裁",
  "经济补偿",
  "赔偿金",
  "社会保险",
  "工伤保险",
  "试用期",
  "竞业限制",
  "加班费",
  "年休假",
  "工资",
  "辞退",
  "解除",
  "终止",
  "工伤",
  "离婚",
  "抚养权",
  "抚养费",
  "夫妻共同财产",
  "共同债务",
  "彩礼",
  "继承",
  "遗嘱",
  "赡养",
  "个人信息",
  "隐私",
  "肖像权",
  "名誉权",
  "侵权",
  "损害赔偿",
  "交通事故",
  "交强险",
  "保险合同",
  "消费者",
  "退货",
  "欺诈",
  "网络购物",
  "定金",
  "订金",
  "违约金",
  "租赁",
  "押金",
  "借款",
  "利息",
  "民间借贷",
  "合同",
  "诉讼时效",
  "管辖",
  "证据",
  "执行",
  "行政处罚",
  "行政复议",
  "行政诉讼",
  "刑事",
  "犯罪",
  "诈骗",
  "盗窃",
  "取保候审",
  "公司",
  "股东",
  "股权",
  "清算",
  "破产",
  "知识产权",
  "著作权",
  "商标",
  "专利",
] as const;

export type LegalDomain = {
  id: string;
  label: string;
  triggers: string[];
  sourceTerms: string[];
  preferredLawTerms: string[];
  negativeLawTerms: string[];
};

const LEGAL_DOMAINS: LegalDomain[] = [
  {
    id: "rental",
    label: "房屋租赁",
    triggers: [
      "租房",
      "房东",
      "租客",
      "租金",
      "押金",
      "退租",
      "收房",
      "转租",
      "房屋租赁",
    ],
    sourceTerms: [
      "租赁",
      "承租人",
      "出租人",
      "押金",
      "租金",
      "房屋",
      "住房",
      "住所",
    ],
    preferredLawTerms: ["民法典", "住房租赁", "房屋租赁"],
    negativeLawTerms: ["融资租赁", "土地使用权", "建设工程", "劳动合同", "机动车"],
  },
  {
    id: "labor",
    label: "劳动用工",
    triggers: [
      "劳动合同",
      "辞退",
      "解雇",
      "裁员",
      "加班",
      "工资",
      "社保",
      "试用期",
      "离职",
      "经济补偿",
      "劳动仲裁",
      "工伤",
    ],
    sourceTerms: [
      "劳动合同",
      "劳动者",
      "用人单位",
      "工资",
      "加班",
      "社会保险",
      "经济补偿",
      "工伤",
      "工作时间",
    ],
    preferredLawTerms: ["劳动合同", "劳动争议", "工伤保险"],
    negativeLawTerms: ["融资租赁", "房屋租赁"],
  },
  {
    id: "consumer",
    label: "消费维权",
    triggers: [
      "网购",
      "消费",
      "退货",
      "退换",
      "欺诈",
      "商家",
      "商品",
      "假货",
      "食品",
      "过期",
      "预付卡",
    ],
    sourceTerms: [
      "消费者",
      "经营者",
      "商品",
      "退货",
      "赔偿",
      "电子商务",
      "食品安全",
      "欺诈",
      "网络交易",
    ],
    preferredLawTerms: [
      "消费者权益保护",
      "电子商务",
      "食品安全",
      "产品质量",
    ],
    negativeLawTerms: ["劳动合同", "房屋租赁"],
  },
  {
    id: "family",
    label: "婚姻家事",
    triggers: [
      "离婚",
      "结婚",
      "彩礼",
      "抚养",
      "赡养",
      "继承",
      "遗嘱",
      "夫妻",
      "婚前",
      "婚后",
      "共同财产",
    ],
    sourceTerms: [
      "夫妻",
      "婚姻",
      "离婚",
      "抚养",
      "赡养",
      "继承",
      "遗嘱",
      "共同财产",
      "配偶",
      "子女",
    ],
    preferredLawTerms: ["民法典", "婚姻家庭", "继承"],
    negativeLawTerms: ["融资租赁", "房屋租赁"],
  },
  {
    id: "traffic",
    label: "交通事故",
    triggers: [
      "交通事故",
      "车祸",
      "肇事",
      "交强险",
      "保险公司",
      "伤残",
      "事故责任",
    ],
    sourceTerms: [
      "交通事故",
      "机动车",
      "交强险",
      "道路",
      "肇事",
      "损害赔偿",
      "伤残",
    ],
    preferredLawTerms: ["道路交通安全", "交通事故", "保险法"],
    negativeLawTerms: ["劳动合同", "房屋租赁"],
  },
  {
    id: "lending",
    label: "借贷纠纷",
    triggers: [
      "借钱",
      "借款",
      "欠钱",
      "欠款",
      "借条",
      "利息",
      "民间借贷",
      "担保",
      "还款",
    ],
    sourceTerms: [
      "借款",
      "借贷",
      "利息",
      "借条",
      "还款",
      "保证",
      "担保",
      "债务",
    ],
    preferredLawTerms: ["民法典", "民间借贷", "担保"],
    negativeLawTerms: ["融资租赁", "房屋租赁"],
  },
  {
    id: "reputation",
    label: "名誉与人格权",
    triggers: [
      "羞辱",
      "侮辱",
      "诽谤",
      "辱骂",
      "骂我",
      "造谣",
      "名誉",
      "人格尊严",
      "犯了什么罪",
    ],
    sourceTerms: [
      "侮辱",
      "诽谤",
      "名誉",
      "人格尊严",
      "公然",
      "捏造事实",
      "治安管理处罚",
      "刑法",
    ],
    preferredLawTerms: ["刑法", "治安管理处罚", "民法典"],
    negativeLawTerms: ["融资租赁", "房屋租赁", "劳动合同"],
  },
];

export function detectLegalDomain(question: string): LegalDomain | null {
  const normalized = question.replace(/\s+/g, "");
  let best: LegalDomain | null = null;
  let bestScore = 0;

  for (const domain of LEGAL_DOMAINS) {
    const score = domain.triggers.reduce(
      (total, term) => total + (normalized.includes(term) ? term.length : 0),
      0,
    );
    if (score > bestScore) {
      best = domain;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : null;
}

export function domainRelevance(
  citation: { lawTitle: string; text: string; path: string[] },
  domain: LegalDomain,
) {
  if (domain.negativeLawTerms.some((term) => citation.lawTitle.includes(term))) {
    return 0;
  }

  const haystack = `${citation.lawTitle}\n${citation.path.join(" ")}\n${citation.text}`;
  let score = 0;

  for (const term of domain.preferredLawTerms) {
    if (citation.lawTitle.includes(term)) score += 70;
  }
  for (const term of domain.sourceTerms) {
    if (citation.lawTitle.includes(term)) score += 28;
    if (citation.path.join("").includes(term)) score += 10;
    if (haystack.includes(term)) score += 12;
  }

  return score;
}

const REMOVE_PHRASES = [
  "请问",
  "想问",
  "我想问",
  "我想知道",
  "麻烦",
  "咨询一下",
  "是否",
  "能否",
  "可以",
  "需要",
  "应该",
  "怎么办",
  "怎么",
  "怎样",
  "如何",
  "什么",
  "为什么",
  "一下",
  "一个",
  "这个",
  "那个",
  "如果",
  "因为",
  "但是",
  "而且",
  "然后",
  "现在",
  "目前",
  "公司",
  "我方",
  "对方",
] as const;

const FUNCTION_CHARS = /[我你他她它的了吗呢啊呀是在有和与及就都也还把被对为于中下上这那]/g;

export function buildSearchTokens(question: string, limit = 18) {
  const normalized = question.replace(/\s+/g, "").slice(0, 500);
  const tokens = new Set<string>();

  for (const term of LEGAL_TERMS) {
    if (normalized.includes(term)) tokens.add(term);
  }

  let residue = normalized;
  for (const phrase of REMOVE_PHRASES) {
    residue = residue.split(phrase).join("");
  }
  residue = residue
    .replace(/[《》]/g, "")
    .replace(/[，。！？、；：,.!?;:"'“”‘’（）()【】[\]\s]/g, "")
    .replace(FUNCTION_CHARS, "");

  for (let size = 5; size >= 3; size -= 1) {
    for (let index = 0; index <= residue.length - size; index += 1) {
      tokens.add(residue.slice(index, index + size));
      if (tokens.size >= limit) break;
    }
    if (tokens.size >= limit) break;
  }

  return [...tokens].filter((token) => token.length >= 2).slice(0, limit);
}

export function escapeFtsToken(token: string) {
  return `"${token.replace(/"/g, '""')}"`;
}

export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
