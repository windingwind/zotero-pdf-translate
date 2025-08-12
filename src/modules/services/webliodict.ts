import { TranslateService } from "./base";

const translate: TranslateService["translate"] = async function (data) {
  const xhr = await Zotero.HTTP.request(
    "GET",
    `https://ejje.weblio.jp/content/${encodeURIComponent(data.raw)}/`,
    { responseType: "text" },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  const res = xhr.response;
  const doc: Document = new DOMParser().parseFromString(res, "text/html");
  const translations: string[][] = [];

  const process = (ele: Element | undefined) => {
    if (!ele) {
      return [];
    }
    return Array.from(ele.children).map((e) =>
      (e as HTMLElement).innerText.trim(),
    );
  };

  translations.push(process(doc.querySelector(".descriptionWrp")?.children[0]));
  doc.querySelector(".descriptionWrp")?.remove();

  Array.prototype.forEach.call(
    doc.querySelector(".summaryM")?.children,
    (e: Element) => translations.push(process(e)),
  );

  for (const e of doc.querySelectorAll<Element>(".intrst")) {
    const tableRow = (e as HTMLElement)?.querySelector<HTMLTableRowElement>(
      "tr",
    );
    if (tableRow) {
      translations.push(process(tableRow));
    }
  }

  data.result = translations
    .filter((t) => t)
    .map((t) => t.join(":"))
    .join("\n");
};

export const WeblioDict: TranslateService = {
  id: "webliodict",
  type: "word",
  supportLang: "en2ja",

  translate,
};
