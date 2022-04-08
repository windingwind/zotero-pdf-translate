export default {
  deeplfree: async function () {
    return await this.deepl("https://api-free.deepl.com/v2/translate");
  },
  deeplpro: async function () {
    return await this.deepl("https://api.deepl.com/v2/translate");
  },
  deepl: async function (api_url) {
    let args = this.getArgs();
    req_body = `auth_key=${args.secret}&text=${args.text}&source_lang=${args.sl
      .split("-")[0]
      .toUpperCase()}&target_lang=${args.tl.split("-")[0].toUpperCase()}`;

    return await this.requestTranslate(
      async () => {
        return await Zotero.HTTP.request("POST", api_url, {
          responseType: "json",
          body: req_body,
        });
      },
      (xhr) => {
        let tgt = xhr.response.translations[0].text;
        Zotero.debug(tgt);
        Zotero.ZoteroPDFTranslate._translatedText = tgt;
        return true;
      }
    );
  },
};
