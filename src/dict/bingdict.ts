async function bingdict(text: string = undefined) {
  let args = this.getArgs("bingdict", text);

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        `https://cn.bing.com/dict/search?q=${encodeURIComponent(args.text)}/`,
        { responseType: "text" }
      );
    },
    (xhr) => {
      let res = xhr.response;
      res = res.match(/<meta name=\"description\" content=\"(.+) \" ?\/>/gm)[0];

      let tgt = "";
      for (let line of res.split("，").slice(1)) {
        Zotero.debug(line);
        if (line.indexOf("网络释义") > -1) {
          tgt += line.slice(0, line.lastIndexOf("；"));
        } else {
          tgt += line + "\n";
        }
      }

      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}
export { bingdict };
