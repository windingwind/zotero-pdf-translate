import { TranslateTaskProcessor } from "../../utils/task";
import { LANG_CODE, matchLanguage } from "../../utils/config";

export default <TranslateTaskProcessor>async function (data) {
  let from = matchLanguage(data.langfrom).name.toLowerCase();
  let to = data.langto.toLowerCase();
  if (to.includes("zh")) {
    if (to.includes("cn")) {
      to = "chinese-simplified";
    } else {
      to = "chinese-traditional";
    }
  } else {
    let to = matchLanguage(data.langto).name;
  }
  const base_url: string = `https://dictionary.cambridge.org/dictionary/${from}-${to}/${encodeURIComponent(data.raw)}`;
  const xhr = await Zotero.HTTP.request("GET", base_url, {
    responseType: "text",
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  let res = xhr.response;
  const doc = new DOMParser().parseFromString(res, "text/html");
  const audioList: Array<{ text: string; url: string }> = [];
  const regions: Map<string, string> = new Map();
  regions.set("uk", "英");
  regions.set("us", "美");
  const urls: Array<string> = [];
  let result: string = "";

  doc
    .querySelectorAll(".entry-body__el")
    .forEach((block: Element, index: number) => {
      block
        .querySelectorAll(".pos-header .dpron-i")
        .forEach((value: Element) => {
          const audio = {
            text: `${regions.get(value.querySelector(".region")?.textContent ?? "")} ${value.querySelector(".dpron")?.textContent}`,
            url:
              "https://dictionary.cambridge.org" +
              (value.querySelector("source")?.getAttribute("src") ?? ""),
          };
          if (!urls.includes(audio.url)) {
            audioList.push(audio);
            urls.push(audio.url);
          }
        });
      result += block.querySelector(".posgram")?.textContent ?? "" + "\n";
      block.querySelectorAll(".dsense").forEach((value: Element, i: number) => {
        let guideword =
          value
            .querySelector(".guideword")
            ?.textContent?.replace(/\s+/g, " ") ?? "";
        let def_en = value.querySelector(".def")?.textContent;
        let def_zh = value.querySelector(".trans")?.textContent;

        result += `\t${i + 1}.${guideword} ${def_en}\n\t${def_zh}\n\n`;
      });
    });
  data.result = result;
  data.audio = audioList;
};
