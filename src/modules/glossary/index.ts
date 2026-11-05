/**
 * 自成长术语库（不内置，翻译时积累，后续读取并修正）。
 *
 * 存储：Zotero.DataDirectory/glossary.json
 * 结构：[{ en, zh, domain?, confidence?, count }]
 *  - en: 源语言术语（英文）
 *  - zh: 目标语言对应
 *  - domain: 领域标注（如 rock-mechanics / 通用）
 *  - confidence: 置信度 0-1（越高越可信，自成长时取较高值）
 *  - count: 命中次数（自成长排序依据）
 *
 * 接口：
 *  - readGlossary()     读取全部术语
 *  - appendGlossary()   翻译产出 gloss[] 写回（合并 + count++ / 新增）
 *  - lookupGlossary()   在源文本中命中术语（注入 prompt / 术语替换）
 *  - buildGlossaryText()格式化术语映射文本（注入 prompt）
 */

export interface GlossaryTerm {
  en: string;
  zh: string;
  domain?: string;
  confidence?: number;
  count?: number;
}

const FILE = "glossary.json";

function glossaryPath(): string {
  return OS.Path.join(String(Zotero.DataDirectory), FILE);
}

async function readRaw(): Promise<GlossaryTerm[]> {
  const path = glossaryPath();
  try {
    const content = (await OS.File.read(path, {
      encoding: "utf-8",
    })) as string;
    if (!content) return [];
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    // 文件不存在或解析失败 → 空库
    return [];
  }
}

async function writeRaw(terms: GlossaryTerm[]): Promise<void> {
  const path = glossaryPath();
  try {
    await OS.File.writeAtomic(path, JSON.stringify(terms, null, 2), {
      encoding: "utf-8",
    });
  } catch (e) {
    // 写失败不阻塞翻译主流程，仅告警
    ztoolkit.log(`[glossary] write failed: ${e}`);
  }
}

export async function readGlossary(): Promise<GlossaryTerm[]> {
  const terms = await readRaw();
  // 按 count 降序，高置信度优先
  return terms.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
}

export async function appendGlossary(
  gloss: Array<{ en: string; zh: string; domain?: string; confidence?: number }>,
): Promise<void> {
  if (!gloss || !gloss.length) return;
  const terms = await readRaw();
  for (const g of gloss) {
    if (!g.en || !g.zh) continue;
    const existing = terms.find(
      (t) =>
        t.en.toLowerCase() === g.en.toLowerCase() &&
        t.zh.toLowerCase() === g.zh.toLowerCase(),
    );
    if (existing) {
      existing.count = (existing.count ?? 1) + 1;
      // 置信度取更高值，领域补充
      existing.confidence = Math.max(
        existing.confidence ?? 0,
        g.confidence ?? 0.5,
      );
      if (g.domain && !existing.domain) existing.domain = g.domain;
    } else {
      terms.push({
        en: g.en,
        zh: g.zh,
        domain: g.domain || "通用",
        confidence: g.confidence ?? 0.5,
        count: 1,
      });
    }
  }
  // 防无限膨胀：上限 2000 条，超出按 count 保留
  const capped = terms.sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 2000);
  await writeRaw(capped);
}

/** 在源文本中命中术语（用于注入 prompt / 术语替换）。返回命中项（按 count 降序）。 */
export function lookupGlossary(
  sourceText: string,
  terms: GlossaryTerm[],
): GlossaryTerm[] {
  if (!sourceText || !terms.length) return [];
  const lower = sourceText.toLowerCase();
  return terms
    .filter((t) => t.en && lower.includes(t.en.toLowerCase()))
    .slice(0, 50);
}

/** 格式化为"术语：en = zh（领域，置信度）"的提示文本，注入 prompt。 */
export function buildGlossaryText(terms: GlossaryTerm[]): string {
  if (!terms.length) return "";
  return terms
    .map(
      (t) =>
        `${t.en} = ${t.zh}（${t.domain || "通用"}，置信度 ${Math.round(
          (t.confidence ?? 0.5) * 100,
        )}%）`,
    )
    .join("\n");
}
