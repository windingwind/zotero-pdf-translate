export default {
  microsoft: async function () {
    let args = this.getArgs();
    req_body = JSON.stringify([
      {
        text: args.text,
      },
    ]);

    return await this.requestTranslate(
      async () => {
        return await Zotero.HTTP.request(
          "POST",
          `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${args.tl}`,
          {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              Host: "api.cognitive.microsofttranslator.com",
              "Content-Length": req_body.length,
              "Ocp-Apim-Subscription-Key": args.secret,
            },
            responseType: "json",
            body: req_body,
          }
        );
      },
      (xhr) => {
        let tgt = xhr.response[0].translations[0].text;
        Zotero.debug(tgt);
        Zotero.ZoteroPDFTranslate._translatedText = tgt;
        return true;
      }
    );
  },
};
