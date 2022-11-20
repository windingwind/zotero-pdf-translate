async function haici(text: string = undefined) {
    let args = this.getArgs("haici", text);
    return await this.requestTranslate(
      async () => {
        // secret
        let xhr = await Zotero.HTTP.request(
            "GET",
            "http://capi.dict.cn/fanyi.php",
            {
              headers: {
                "Referer": "http://fanyi.dict.cn/"
              },
              responseType: "text"
            }
        );
        let appId = xhr.response.match(/"(.+)"/)[1];
        return await Zotero.HTTP.request(
          "GET",
          `http://api.microsofttranslator.com/V2/Ajax.svc/TranslateArray?appId=${
            appId
            }&from=${args.sl}&to=${args.tl}&texts=["${
            encodeURIComponent(
                args.text
            )
          }"]`,
          { responseType: "json" }
        );
      },
      (xhr) => {
        let tgt = "";
        xhr.response.forEach(line => {
            tgt += line.TranslatedText
        });
        Zotero.debug(tgt);
        if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
        return tgt;
      }
    );
  }
  export { haici };
  