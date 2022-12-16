import { str2dom } from "../base";

async function collinsdict(text: string = undefined) {
  let args = this.getArgs("collinsdict", text);
  const dictURL =
    "https://www.collinsdictionary.com/zh/dictionary/english-chinese/";

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        dictURL + encodeURIComponent(args.text),
        { responseType: "text" }
      );
    },
    (xhr) => {
      if (xhr.responseURL.includes("?q="))
        return "";

      const doc: Document = str2dom(xhr.response); // parse responsive html doc
      Array.prototype.forEach.call(doc.querySelectorAll("script"), (e) =>
        e.remove()
      );

      const phoneticElements = doc.querySelectorAll(".type-");
      this._Addon._audioSourceURLs = Array.prototype.map.call(
        phoneticElements,
        (e) => [
          e.innerText.trim(),
          e.querySelector("a").getAttribute("data-src-mp3")
        ]
      );
      // script in innerText
      const explanationText: string = Array.prototype.map
        .call(doc.querySelectorAll(".hom"), (e) =>
          e.innerText.replace(/&nbsp;/g, " ").replace(/[0-9]\./g, "\n$&")
        )
        .join("");

      const result = explanationText; // insert phonetic symbol to result
      if (!text) 
        Zotero.ZoteroPDFTranslate._translatedText = result;
      return result;
    }
  );
}
export { collinsdict };
