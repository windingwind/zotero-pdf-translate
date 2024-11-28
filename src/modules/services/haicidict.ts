import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
  const xhr = await Zotero.HTTP.request("GET", `https://dict.cn/${data.raw}`, {
    responseType: "text",
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  const res = xhr.response as string;
  try {
    const doc = new DOMParser().parseFromString(res, "text/html");

    const audioList: Array<{ text: string; url: string }> = [];
    for (const span of doc.querySelectorAll<HTMLSpanElement>(
      "div.phonetic > span",
    )) {
      const text = span.innerText.replace(/\s+/g, " ").trim();
      for (const item of span.querySelectorAll("i")) {
        audioList.push({
          text: `${text} ${item.title}`,
          url: `https://audio.dict.cn/${item.getAttribute("naudio")}`,
        });
      }
    }
    data.audio = audioList;
    const items = Array.from(
      doc.querySelectorAll<HTMLLIElement>("ul.dict-basic-ul > li"),
    )
      .filter((item) => !item.querySelector("script"))
      .map((item) => item.innerText.replace(/\s+/g, " ").trim())
      .filter((item) => Boolean(item));
    data.result = `${items.join("\n")}\n`;
  } catch (e) {
    throw "Parse error";
  }
};
