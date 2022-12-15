import { str2dom } from "../base";

async function webliodict(text: string = undefined) {
  let args = this.getArgs("webliodict", text);

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        `https://ejje.weblio.jp/content/${encodeURIComponent(args.text)}/`,
        { responseType: "text" }
      );
    },
    (xhr) => {
      let res = xhr.response;
      const doc: Document = str2dom(res), translations: string[][] = [];

      const process = (ele: Element) => {
        return Array.prototype.map.call(ele.children, (e: HTMLElement) =>
          e.innerText.trim()
        );
      };

      translations.push(
        process(doc.querySelector(".descriptionWrp").children[0])
      );
      doc.querySelector(".descriptionWrp").remove();

      Array.prototype.forEach.call(
        doc.querySelector(".summaryM").children,
        (e: Element) => translations.push(process(e))
      );

      Array.prototype.map
        .call(doc.querySelectorAll(".intrst"), (e: Element) =>
          e.querySelector("tr")
        )
        .forEach((e: Element) => {
          translations.push(process(e));
        });
      const tgt = translations
        .filter((t) => t)
        .map((t) => t.join(":"))
        .join("\n");
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}
export { webliodict };
