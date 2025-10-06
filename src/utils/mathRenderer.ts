import katex from "katex";

// Unified, robust math rendering helpers
// Avoid lookbehind for broader engine compatibility by capturing a non-escape prefix
// Order: display (“$$ … $$”, "\\[ … \"] first), then inline “$ … $” (no newline), then "\\( … \")
const MATH_REGEX =
  /(^|[^\\])\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|(^|[^\\])\$(?!\$)([^\n]*?)\$(?!\$)|\\\(([\s\S]*?)\\\)/g;
const DEFAULT_KATEX_OPTIONS = {
  throwOnError: false,
  errorColor: "#cc0000",
  strict: false,
} as const;

export function containsMath(text: string): boolean {
  if (!text) return false;
  const TEST_REGEX =
    /(^|[^\\])\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|(^|[^\\])\$[^\n]*?\$|\\\([\s\S]*?\\\)/;
  return TEST_REGEX.test(text);
}

export function escapeHtml(doc: Document, text: string): string {
  const div = doc.createElement("div");
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, "<br></br>");
}

export function renderMathInText(doc: Document, text: string): string {
  if (!text) return "";
  if (!containsMath(text)) return escapeHtml(doc, text);

  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MATH_REGEX.exec(text)) !== null) {
    const [
      full,
      dispPrefix,
      dispDollar,
      dispBracket,
      inlinePrefix,
      inlineDollar,
      inlineParen,
    ] = match;

    const prefixLen = dispPrefix || inlinePrefix ? 1 : 0;
    const plainEnd = match.index + prefixLen;
    if (plainEnd > lastIndex) {
      result += escapeHtml(doc, text.slice(lastIndex, plainEnd));
    }

    let displayMode = false;
    let latex = "";
    if (typeof dispDollar !== "undefined") {
      displayMode = true;
      latex = String(dispDollar).trim();
    } else if (typeof dispBracket !== "undefined") {
      displayMode = true;
      latex = String(dispBracket).trim();
    } else if (typeof inlineDollar !== "undefined") {
      displayMode = false;
      latex = String(inlineDollar).trim();
    } else if (typeof inlineParen !== "undefined") {
      displayMode = false;
      latex = String(inlineParen).trim();
    }

    try {
      const rendered = katex.renderToString(latex, {
        ...DEFAULT_KATEX_OPTIONS,
        displayMode,
      });
      result += rendered;
    } catch (e) {
      result += escapeHtml(doc, full.slice(prefixLen));
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    result += escapeHtml(doc, text.slice(lastIndex));
  }

  return result;
}

export function renderMathInElement(element: HTMLElement, text: string): void {
  if (!element) return;
  element.innerHTML = renderMathInText(element.ownerDocument, text);
}
