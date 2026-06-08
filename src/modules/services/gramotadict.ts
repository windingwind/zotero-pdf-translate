import { TranslateService } from "./base";

const translate: TranslateService["translate"] = async function (data) {
  const word = data.raw.trim();

  Zotero.debug("[GramotaDict] looking up: " + word);

  const xhr = await Zotero.HTTP.request(
    "GET",
    `https://gramota.ru/poisk?query=${encodeURIComponent(word)}&mode=all`,
    { responseType: "text" },
  );

  Zotero.debug("[GramotaDict] response status: " + xhr?.status);

  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  const doc = new DOMParser().parseFromString(xhr.response, "text/html");

  const metaWidget = doc.querySelector(".meta-dictionary-widget");
  Zotero.debug("[GramotaDict] meta-widget found: " + !!metaWidget);

  if (!metaWidget) {
    throw "Слово не найдено в словарях";
  }

  const title = metaWidget.querySelector(".title")?.textContent?.trim() || word;

  const crHlEl = metaWidget.querySelector(".hl-line .cr-hl");
  const crHlText = crHlEl?.textContent?.trim() || "";

  const definitions: string[] = [];
  const items = metaWidget.querySelectorAll<Element>(
    ".numbered .order-list .item",
  );
  items.forEach((item) => {
    const number = item.querySelector(".number")?.textContent?.trim() || "";
    const content = item.querySelector(".content");
    if (content) {
      const clone = content.cloneNode(true) as Element;
      clone.querySelectorAll(".grey-badge").forEach((badge) => {
        const text = badge.textContent?.trim() || "";
        badge.replaceWith(`(${text})`);
      });
      const text = clone.textContent?.trim()?.replace(/\s+/g, " ") || "";
      if (text) {
        definitions.push(number ? `${number} ${text}` : text);
      }
    }
  });

  let result = title;
  if (crHlText) result += `\n${crHlText}`;
  if (definitions.length > 0) result += `\n\n${definitions.join("\n")}`;

  Zotero.debug("[GramotaDict] result: " + result);

  data.result = result;
};

export const GramotaDict: TranslateService = {
  id: "gramotadict",
  type: "word",
  translate,
};
