import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  const xhr = await Zotero.HTTP.request(
    "GET",
    `https://ejje.weblio.jp/content/${encodeURIComponent(data.raw)}/`,
    { responseType: "text" }
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  let res = xhr.response;
  const doc: Document = ztoolkit
    .getDOMParser()
    .parseFromString(res, "text/html");
  const translations: string[][] = [];

  const process = (ele: Element | undefined) => {
    if (!ele) {
      return [];
    }
    return Array.from(ele.children).map((e) =>
      (e as HTMLElement).innerText.trim()
    );
  };

  translations.push(process(doc.querySelector(".descriptionWrp")?.children[0]));
  doc.querySelector(".descriptionWrp")?.remove();

  Array.prototype.forEach.call(
    doc.querySelector(".summaryM")?.children,
    (e: Element) => translations.push(process(e))
  );

  Array.from(doc.querySelectorAll(".intrst"))
    .map((e: Element) => e.querySelector("tr"))
    .forEach((e) => {
      e && translations.push(process(e));
    });
  data.result = translations
    .filter((t) => t)
    .map((t) => t.join(":"))
    .join("\n");
};
