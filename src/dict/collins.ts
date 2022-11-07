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
          // Since this is En-Zh dict, error prompt is in Chinese.
          return "";
  
        const parser = Components.classes[
          "@mozilla.org/xmlextras/domparser;1"
        ].createInstance(Components.interfaces.nsIDOMParser);
        const doc: Document = parser.parseFromString(xhr.response, "text/html"); // parse responsive html doc
        Array.prototype.forEach.call(doc.querySelectorAll("script"), (e) =>
          e.remove()
        );
  
        const phoneticElements = doc.querySelectorAll(".type-");
        const phoneticText = `[${Array.prototype.map
          .call(doc.querySelectorAll(".type-"), (e) => {
            return e.innerText.trim();
          })
          .join("")}]`;
  
        // script in innerText
        const explanationText: string = Array.prototype.map
          .call(doc.querySelectorAll(".hom"), (e) => {
            console.log(e);
  
            return e.innerText
              .replace(/&nbsp;/g, " ")
              .replace(/[0-9]\./g, "\n$&");
          })
          .join("");
  
        const result = `${phoneticText}\n${explanationText}`; // insert phonetic symbol to result
  
        // TODO: wait for pr #224
        const audioURL: string[] = Array.prototype.map.call(
          phoneticElements,
          (e) => {
            e.querySelectorAll("a")[0].getAttribute("data-src-mp3");
          }
        );
  
        if (!text) Zotero.ZoteroPDFTranslate._translatedText = result;
        return result;
      }
    );
  }
  export { collinsdict };