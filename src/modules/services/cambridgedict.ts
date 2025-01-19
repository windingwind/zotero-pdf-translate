import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
  const base_url: string = `https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${encodeURIComponent(data.raw)}`;
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
      block.querySelectorAll(".dpron-i").forEach((value: Element) => {
        const data = {
          text: `${regions.get(value.querySelector(".region")?.textContent ?? "")} ${value.querySelector(".dpron")?.textContent}`,
          url:
            "https://dictionary.cambridge.org" +
            (value.querySelector("source")?.getAttribute("src") ?? ""),
        };
        if (!urls.includes(data.url)) {
          audioList.push(data);
          urls.push(data.url);
        }
      });
      result += block.querySelector(".posgram")?.textContent + "\n";
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
