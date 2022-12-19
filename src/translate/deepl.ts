async function deeplfree(text: string = undefined) {
  return await this.deepl("deeplfree", text);
}
async function deeplpro(text: string = undefined) {
  return await this.deepl("deeplpro", text);
}
async function deepl(engine: string, text: string) {
  const urls = {
    deeplfree: "https://api-free.deepl.com/v2/translate",
    deeplpro: "https://api.deepl.com/v2/translate",
  };
  const args = this.getArgs(engine, text);
  const reqBody = `auth_key=${args.secret}&text=${
    encodeURIComponent(args.text)
  }&source_lang=${args.sl.split("-")[0].toUpperCase()}&target_lang=${args.tl
    .split("-")[0]
    .toUpperCase()}`;

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request("POST", urls[engine], {
        responseType: "json",
        body: reqBody,
      });
    },
    (xhr) => {
      const tgt = xhr.response.translations[0].text;
      Zotero.debug(tgt);
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}

export { deepl, deeplfree, deeplpro };
