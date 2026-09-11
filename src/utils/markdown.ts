import { renderKatex } from "./mathRenderer";

/**
 * Small markdown renderer for chat answers.
 *
 * The model answers in markdown and LaTeX, which used to be shown as raw
 * text. There is no markdown dependency in the plugin, so this covers what
 * answers actually use: headings, emphasis, inline code, fenced code blocks,
 * lists, block quotes, rules, links and inline/display math (KaTeX, the same
 * configuration the math text box uses).
 *
 * Everything is escaped before any markup is inserted, so a model (or a
 * pasted prompt) cannot inject HTML.
 */

export interface MarkdownOptions {
  /**
   * Render LaTeX with KaTeX. Turn this off when the result is not shown in a
   * document that has the KaTeX stylesheet (e.g. a Zotero note).
   */
  math?: boolean;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Inline constructs, in the order they have to be tried: code spans first (so
 * that `$x$` or `**` inside them stay literal), then math, then links, then
 * emphasis.
 */
const INLINE_REGEX =
  /(`[^`\n]+`)|(\$\$[\s\S]*?\$\$)|(\\\[[\s\S]*?\\\])|(\$[^\n$]+\$)|(\\\([\s\S]*?\\\))|(\[[^\]\n]*\]\(https?:\/\/[^)\s]+\))|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(~~[^~\n]+~~)|(\*[^*\n]+\*)|(_[^_\n]+_)/g;

function renderInline(
  doc: Document,
  text: string,
  math: boolean,
  breaks = false,
): string {
  const plain = (segment: string) =>
    breaks ? escapeHtml(segment).replace(/\n/g, "<br/>") : escapeHtml(segment);
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  INLINE_REGEX.lastIndex = 0;

  while ((match = INLINE_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result += plain(text.slice(lastIndex, match.index));
    }
    const [
      full,
      code,
      displayDollar,
      displayBracket,
      inlineDollar,
      inlineParen,
      link,
      boldStar,
      boldUnderscore,
      strike,
      italicStar,
      italicUnderscore,
    ] = match;

    if (code) {
      result += `<code>${escapeHtml(code.slice(1, -1))}</code>`;
    } else if (displayDollar || displayBracket || inlineDollar || inlineParen) {
      let display = false;
      let latex = "";
      if (displayDollar) {
        display = true;
        latex = displayDollar.slice(2, -2);
      } else if (displayBracket) {
        display = true;
        latex = displayBracket.slice(2, -2);
      } else if (inlineDollar) {
        latex = inlineDollar.slice(1, -1);
      } else {
        latex = inlineParen!.slice(2, -2);
      }
      const rendered = math ? renderKatex(latex, display) : null;
      result += rendered ?? escapeHtml(full);
    } else if (link) {
      const parts = /^\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/.exec(link);
      result += parts
        ? `<a href="${escapeHtml(parts[2])}" rel="noreferrer noopener" target="_blank">${escapeHtml(parts[1] || parts[2])}</a>`
        : escapeHtml(link);
    } else if (boldStar || boldUnderscore) {
      result += `<strong>${escapeHtml((boldStar || boldUnderscore).slice(2, -2))}</strong>`;
    } else if (strike) {
      result += `<del>${escapeHtml(strike.slice(2, -2))}</del>`;
    } else if (italicStar || italicUnderscore) {
      result += `<em>${escapeHtml((italicStar || italicUnderscore).slice(1, -1))}</em>`;
    } else {
      result += escapeHtml(full);
    }
    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    result += plain(text.slice(lastIndex));
  }
  return result;
}

const FENCE_REGEX = /^\s*(```|~~~)\s*([^\s`]*)\s*$/;
const HEADING_REGEX = /^\s*(#{1,6})\s+(.*)$/;
const QUOTE_REGEX = /^\s*>\s?/;
const UL_REGEX = /^\s*[-*+]\s+(.*)$/;
const OL_REGEX = /^\s*\d+[.)]\s+(.*)$/;
const HR_REGEX = /^\s*([-*_])\s*(?:\1\s*){2,}$/;

function startsBlock(line: string): boolean {
  return (
    FENCE_REGEX.test(line) ||
    HEADING_REGEX.test(line) ||
    QUOTE_REGEX.test(line) ||
    UL_REGEX.test(line) ||
    OL_REGEX.test(line) ||
    HR_REGEX.test(line)
  );
}

/**
 * Render markdown to safe HTML.
 */
export function renderMarkdownToHTML(
  doc: Document,
  text: string,
  options: MarkdownOptions = {},
): string {
  if (!text) {
    return "";
  }
  const math = options.math !== false;
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let i = 0;

  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    const fence = FENCE_REGEX.exec(line);
    if (fence) {
      closeList();
      const marker = fence[1];
      const language = fence[2];
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) {
        body.push(lines[i]);
        i++;
      }
      i++; // closing fence
      const className = language
        ? ` class="language-${escapeHtml(language)}"`
        : "";
      out.push(
        `<pre><code${className}>${escapeHtml(body.join("\n"))}</code></pre>`,
      );
      continue;
    }

    if (!line.trim()) {
      closeList();
      i++;
      continue;
    }

    if (HR_REGEX.test(line)) {
      closeList();
      out.push("<hr/>");
      i++;
      continue;
    }

    const heading = HEADING_REGEX.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(doc, heading[2], math)}</h${level}>`);
      i++;
      continue;
    }

    if (QUOTE_REGEX.test(line)) {
      closeList();
      const body: string[] = [];
      while (i < lines.length && QUOTE_REGEX.test(lines[i])) {
        body.push(lines[i].replace(QUOTE_REGEX, ""));
        i++;
      }
      out.push(
        `<blockquote>${renderMarkdownToHTML(doc, body.join("\n"), options)}</blockquote>`,
      );
      continue;
    }

    const bullet = UL_REGEX.exec(line);
    const numbered = bullet ? null : OL_REGEX.exec(line);
    if (bullet || numbered) {
      const type = bullet ? "ul" : "ol";
      if (list !== type) {
        closeList();
        out.push(`<${type}>`);
        list = type;
      }
      out.push(`<li>${renderInline(doc, (bullet ?? numbered)![1], math)}</li>`);
      i++;
      continue;
    }

    closeList();
    const paragraph: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) {
      paragraph.push(lines[i]);
      i++;
    }
    out.push(`<p>${renderInline(doc, paragraph.join("\n"), math, true)}</p>`);
  }

  closeList();
  return out.join("");
}
