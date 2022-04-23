async function youdao(text: string = undefined) {
  let args = this.getArgs("youdao", text);
  let param = `${args.sl.toUpperCase().replace("-", "_")}2${args.tl
    .toUpperCase()
    .replace("-", "_")}`;

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        `http://fanyi.youdao.com/translate?&doctype=json&type=${param}&i=${encodeURIComponent(
          args.text
        )}`,
        { responseType: "json" }
      );
    },
    (xhr) => {
      let res = xhr.response.translateResult;
      let tgt = "";
      for (let i in res) {
        for (let j in res[i]) {
          tgt += res[i][j].tgt;
        }
      }
      Zotero.debug(tgt);
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}
export { youdao };
