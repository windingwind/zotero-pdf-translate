import { getPref } from "./prefs";
import { TranslateTask } from "./task";

export function transformPromptWithContext(
  prefKey: string,
  langFrom: string,
  langTo: string,
  sourceText: string,
  data: Required<TranslateTask>,
): string {
  let prompt = getPref(prefKey) as string;

  // Pre-process sourceText with paragraph context if available
  let processedSource = sourceText;
  if (
    getPref("enableParagraphContext") &&
    data.contextText &&
    data.contextText.trim() !== sourceText.trim()
  ) {
    processedSource = `[Surrounding paragraph for context]:\n${data.contextText}\n\n[Text to translate]: ${sourceText}`;
  }

  if (getPref("attachPaperContext") && data.itemId) {
    const item = Zotero.Items.get(data.itemId);
    const topItem = item ? Zotero.Items.getTopLevel([item])[0] : null;
    if (topItem) {
      let contextInfo = "";
      const title = topItem.getField("title") as string;
      const abstract = topItem.getField("abstractNote") as string;

      if (title) {
        contextInfo += `Paper Title: ${title}`;
      }
      if (abstract) {
        contextInfo += title
          ? `\n\nPaper Abstract: ${abstract}`
          : `Paper Abstract: ${abstract}`;
      }

      if (contextInfo) {
        prompt = prompt.replace(
          "${sourceText}",
          `Context from the academic paper:\n${contextInfo}\n\nText to translate: ${processedSource}`,
        );
      }
    }
  }

  return prompt
    .replaceAll("${langFrom}", langFrom)
    .replaceAll("${langTo}", langTo)
    .replaceAll("${sourceText}", processedSource);
}
