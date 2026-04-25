const MAX_PARAGRAPH_LENGTH = 2000;

/**
 * Extract the surrounding paragraph for a text selection in the PDF reader.
 *
 * Access the PDF viewer's DOM text layer (rendered by PDF.js), locate the
 * selected text within the page, and extract the surrounding paragraph.
 */
export async function extractParagraphContext(
  reader: _ZoteroTypes.ReaderInstance,
  annotation: any,
  selectedText: string,
): Promise<string | undefined> {
  try {
    const pageText = getPageTextFromReader(reader, annotation);
    if (!pageText) return undefined;

    const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
    const normalizedPage = normalize(pageText);
    const normalizedSelection = normalize(selectedText);

    const matchIndex = normalizedPage.indexOf(normalizedSelection);
    if (matchIndex === -1) return undefined;

    const paragraphStart = findParagraphStart(normalizedPage, matchIndex);
    const paragraphEnd = findParagraphEnd(normalizedPage, matchIndex + normalizedSelection.length);

    let paragraph = normalizedPage.slice(paragraphStart, paragraphEnd).trim();

    if (!paragraph || paragraph === normalizedSelection) return undefined;

    if (paragraph.length > MAX_PARAGRAPH_LENGTH) {
      const relStart = matchIndex - paragraphStart;
      const relEnd = relStart + normalizedSelection.length;
      const center = Math.floor((relStart + relEnd) / 2);
      const halfLen = Math.floor(MAX_PARAGRAPH_LENGTH / 2);
      const start = Math.max(0, center - halfLen);
      const end = Math.min(paragraph.length, start + MAX_PARAGRAPH_LENGTH);
      paragraph = paragraph.slice(start, end);
    }

    return paragraph;
  } catch (e) {
    ztoolkit.log(`[paragraphExtractor] error: ${e}`);
    return undefined;
  }
}

/**
 * Access the PDF viewer's document through the reader's internal structure.
 *
 * Zotero 8: reader._internalReader._primaryView._iframeWindow
 * Zotero 7: reader._iframeWindow
 */
function getPageTextFromReader(
  reader: _ZoteroTypes.ReaderInstance,
  annotation: any,
): string | undefined {
  const readerAny = reader as any;

  const paths = [
    () => readerAny?._internalReader?._primaryView?._iframeWindow,
    () => readerAny?._internalReader?._primaryView?._iframe?.contentWindow,
    () => readerAny?._iframeWindow,
  ];

  for (const getWindow of paths) {
    try {
      const win = getWindow();
      if (win?.document) {
        const result = extractTextFromDocument(win.document, annotation);
        if (result) return result;
      }
    } catch {}
  }

  return undefined;
}

/**
 * Extract text from a PDF.js document's .textLayer elements, using the
 * annotation's pageIndex to locate the correct page.
 */
function extractTextFromDocument(
  doc: Document,
  annotation: any,
): string | undefined {
  const pages = doc.querySelectorAll(".page");
  if (!pages.length) return undefined;

  let targetPage: HTMLElement | null = null;

  // Locate the target page by annotation position
  const pageIndex = annotation?.position?.pageIndex;
  if (typeof pageIndex === "number") {
    const targetNum = String(pageIndex + 1);
    for (const page of pages) {
      const el = page as HTMLElement;
      if (el.dataset.pageNumber === targetNum) {
        targetPage = el;
        break;
      }
    }
  }

  // Fallback: first visible page with a text layer
  if (!targetPage) {
    for (const page of pages) {
      const el = page as HTMLElement;
      if (el.offsetHeight > 0) {
        const tl = el.querySelector(".textLayer");
        if (tl?.textContent?.trim()) {
          targetPage = el;
          break;
        }
      }
    }
  }

  if (!targetPage) return undefined;

  const textLayer = targetPage.querySelector(".textLayer");
  const spans = textLayer?.querySelectorAll("span");
  if (!spans?.length) return undefined;

  // Build text, inserting paragraph breaks on significant vertical gaps
  let text = "";
  let lastTop: number | null = null;

  for (const span of spans) {
    const el = span as HTMLElement;
    const top = el.offsetTop;

    if (lastTop !== null) {
      const gap = Math.abs(top - lastTop);
      if (gap > parseFloat(el.style.fontSize || "12") * 1.5) {
        text += "\n\n";
      } else if (gap > 2) {
        text += " ";
      }
    }

    text += el.textContent || "";
    lastTop = top;
  }

  return text.trim() || undefined;
}

function findParagraphStart(text: string, pos: number): number {
  let i = pos;
  while (i > 0) {
    if (text[i - 1] === "\n" && (i < 2 || text[i - 2] === "\n")) return i;
    i--;
  }
  return 0;
}

function findParagraphEnd(text: string, pos: number): number {
  let i = pos;
  while (i < text.length) {
    if (text[i] === "\n" && i + 1 < text.length && text[i + 1] === "\n") return i;
    i++;
  }
  return text.length;
}
