/**
 * 结构化三步翻译提示词：障碍判断 → 障碍拆解 → 最终翻译。
 *
 * 强制 JSON 输出（配合 response_format: json_object），不依赖模型自然语言自述。
 * 输出 schema：
 * {
 *   "obstacles": [{ "type", "severity", "span", "description" }],
 *   "breakdown": ["..."],
 *   "translation": "...",
 *   "gloss": [{ "en", "zh", "domain", "confidence" }]
 * }
 */

export interface ObstacleItem {
  type: string;
  severity: string;
  span?: string;
  description?: string;
}

export interface StructuredResult {
  obstacles: ObstacleItem[];
  breakdown: string[];
  translation: string;
  gloss: Array<{
    en: string;
    zh: string;
    domain?: string;
    confidence?: number;
  }>;
}

const OBSTACLE_TYPES = [
  "术语障碍",
  "句法障碍",
  "指代障碍",
  "逻辑障碍",
  "语境障碍",
  "文本损坏",
  "作者写作瑕疵",
];

const SYSTEM_TEMPLATE = `你是一位精通科技文献翻译与术语学的专家，尤其擅长岩石力学/岩土工程领域的中英互译。你的任务是三步完成翻译，并严格以 JSON 输出。

# 第一步：障碍判断
分析源文本，判断存在哪些翻译障碍（可多选）：
${OBSTACLE_TYPES.map((t, i) => `${i + 1}. ${t}`).join("\n")}
- 术语障碍：术语/专有名词不统一、有标准译名却未使用、新造术语
- 句法障碍：长句结构复杂、从句嵌套、歧义切分
- 指代障碍：代词/指代对象不明确（it/this/that/this process 等）
- 逻辑障碍：因果/转折/条件逻辑链断裂或需重排
- 语境障碍：依赖上下文（前后文）才能确定语义，孤立翻译会错
- 文本损坏：OCR 错误、缺字、乱码、公式/符号破损
- 作者写作瑕疵：作者表述本身含混、重复、冗余

# 第二步：障碍拆解
对每个已判断的障碍，给出具体拆解：障碍发生在哪、为什么是障碍、如何解决。写成字符串数组（每项一个障碍的解决方案）。

# 第三步：最终翻译
结合障碍拆解，给出准确、符合目标语言习惯、保留原意的翻译。若源文本有术语，同时给出术语映射 gloss 列表（en=源语言术语，zh=目标语言译名，domain=领域，confidence=你对这个译名的置信度 0-1）。

# 输出要求
只输出一个合法 JSON 对象，不要 Markdown 代码块，不要额外文字。字段：
{
  "obstacles": [{"type": "障碍类型", "severity": "高|中|低", "span": "对应原文片段", "description": "说明"}],
  "breakdown": ["障碍拆解说明1", "..."],
  "translation": "最终译文",
  "gloss": [{"en": "term", "zh": "译名", "domain": "领域", "confidence": 0.9}]
}
若无障碍，obstacles 为空数组；breakdown 可只给翻译策略。`;

export function buildStructuredPrompt(params: {
  langFrom: string;
  langTo: string;
  sourceText: string;
  context?: string;
  glossaryText?: string;
}): { system: string; user: string } {
  const { langFrom, langTo, sourceText, context, glossaryText } = params;
  const parts: string[] = [];
  parts.push(`翻译方向：${langFrom} → ${langTo}`);
  parts.push(`源文本（在 🔤 内）：\n🔤 ${sourceText} 🔤`);
  if (context) {
    parts.push(`上下文（供语境/指代/逻辑障碍判断，非翻译对象）：\n${context}`);
  }
  if (glossaryText) {
    parts.push(
      `已有术语库（翻译时必须优先使用这些译名，不得另造）：\n${glossaryText}`,
    );
  }
  parts.push("请严格按 system 要求输出 JSON。");
  return { system: SYSTEM_TEMPLATE, user: parts.join("\n\n") };
}

/** 容错解析 LLM 返回的 JSON 结果（剥离可能的 markdown 围栏/多余文本）。 */
export function parseStructuredResult(raw: string): StructuredResult | null {
  if (!raw) return null;
  let text = raw.trim();
  // 去掉可能的 ```json ... ``` 围栏
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // 取第一个 { 到最后一个 }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  const jsonText = text.slice(start, end + 1);
  try {
    const obj = JSON.parse(jsonText);
    if (!obj || typeof obj !== "object") return null;
    return {
      obstacles: Array.isArray(obj.obstacles) ? obj.obstacles : [],
      breakdown: Array.isArray(obj.breakdown) ? obj.breakdown : [],
      translation: String(obj.translation ?? ""),
      gloss: Array.isArray(obj.gloss) ? obj.gloss : [],
    };
  } catch (e) {
    return null;
  }
}
