async function collinsdict(text: string = undefined) {
  let args = this.getArgs("collinsdict", text);
  const dictURL = "https://www.collinsdictionary.com/zh/dictionary/english-chinese/";

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET", 
        dictURL + encodeURIComponent(args.text), 
        { responseType: "text" }
      );
    },
    (xhr) => {
      if (xhr.responseURL.includes("?q="))  // Since this is En-Zh dict, error prompt is in Chinese.
        return args.text + " ：词典中没有这个单词";

      const parser = Components.classes[
        "@mozilla.org/xmlextras/domparser;1"
      ].createInstance(Components.interfaces.nsIDOMParser);
      const doc: Document = parser.parseFromString(xhr.response, "text/html");  // parse responsive html doc
      const hom: HTMLDivElement = doc.querySelector(".hom");  // div that contains the result
      
      // script in innerText
      const str: string = hom.innerHTML.replace(/<script.+<\/script>/g, "").replace(/&nbsp;/g, " ");
      const dom: Document = parser.parseFromString(str, "text/html");  // parse this for result
      let result = dom.body.innerText.replace(/\n/g, "");  // strip \n of advertisement in website
      if (/[0-9]\./.test(result))  // has many meanings
        result = result.replace(/[0-9]\./g, "\n$&");  // wrap

      const phonetic: HTMLSpanElement = doc.querySelector(".type-");
      result = `/${phonetic.innerText.trim()}/\t${result}`;  // insert phonetic symbol to result

      // TODO: wait for pr #224
      const audioURL = phonetic.getElementsByTagName("a")[0].getAttribute("data-src-mp3");

      if (!text) 
        Zotero.ZoteroPDFTranslate._translatedText = result;
      return result;
    }
  );
}
export { collinsdict };
