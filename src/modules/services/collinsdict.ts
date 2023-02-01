import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  const xhr = await Zotero.HTTP.request(
    "GET",
    "https://www.collinsdictionary.com/zh/dictionary/english-chinese/" +
      encodeURIComponent(data.raw),
    { responseType: "text" }
  );

  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  if (xhr.responseURL.includes("?q=")) {
    throw "No result found error";
  }

  const doc = ztoolkit
    .getDOMParser()
    .parseFromString(xhr.response, "text/html");
  Array.prototype.forEach.call(doc.querySelectorAll("script"), (e) =>
    e.remove()
  );

  const phoneticElements = Array.from(
    doc.querySelectorAll(".type-")
  ) as HTMLElement[];
  data.audio = phoneticElements.map((e) => ({
    text: e.innerText.trim(),
    url: e.querySelector("a")?.getAttribute("data-src-mp3") || "",
  }));
  // script in innerText
  const explanationText: string = Array.prototype.map
    .call(doc.querySelectorAll(".hom"), (e: HTMLSpanElement) =>
      e.innerText.replace(/&nbsp;/g, " ").replace(/[0-9]\./g, "\n$&")
    )
    .join("");

  data.result = explanationText;
};
