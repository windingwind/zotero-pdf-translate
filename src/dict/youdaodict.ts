async function youdaodict(text: string = undefined) {
  let args = this.getArgs("youdaodict", text);

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        `https://www.youdao.com/w/${encodeURIComponent(args.text)}/`,
        { responseType: "text" }
      );
    },
    (xhr) => {
      let res = xhr.response;
      res = res.replace(/(\r\n|\n|\r)/gm, "");
      res = res.match(
        /<div id="phrsListTab.*webTrans" class="trans-wrapper trans-tab">/gm
      );

      let tgt = "";
      if (res.length > 0) {
        tgt = res[0].replace(/<[^>]*>?/gm, "\n");
        tgt = tgt.replace(/\n\s*\n/g, "\n");
        tgt = tgt.replace(/\s\s+/g, " ");
        tgt = tgt.trim();
      }

      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}
export { youdaodict };
