async function deeplfree(text: string = undefined) {
  return await this.deepl("deeplfree", text);
}
async function deeplpro(text: string = undefined) {
  return await this.deepl("deeplfree", text);
}
async function deepl(engine: string, text: string) {
  let urls = {
    deeplfree: "https://api-free.deepl.com/v2/translate",
    deeplpro: "https://api.deepl.com/v2/translate",
  };
  let args = this.getArgs(engine, text);
  let req_body = `auth_key=${args.secret}&text=${
    args.text
  }&source_lang=${args.sl.split("-")[0].toUpperCase()}&target_lang=${args.tl
    .split("-")[0]
    .toUpperCase()}`;

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request("POST", urls[engine], {
        responseType: "json",
        body: req_body,
      });
    },
    (xhr) => {
      let tgt = xhr.response.translations[0].text;
      Zotero.debug(tgt);
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}

export { deepl, deeplfree, deeplpro };
