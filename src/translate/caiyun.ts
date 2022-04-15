async function caiyun() {
  let args = this.getArgs();
  let param = `${args.sl.split("-")[0]}2${args.tl.split("-")[0]}`;

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "POST",
        "http://api.interpreter.caiyunai.com/v1/translator",
        {
          headers: {
            "content-type": "application/json",
            "x-authorization": `token ${args.secret}`,
          },
          body: JSON.stringify({
            source: [args.text],
            trans_type: param,
            request_id: new Date().valueOf() / 10000,
            detect: true,
          }),
          responseType: "json",
        }
      );
    },
    (xhr) => {
      let tgt = xhr.response.target[0];
      Zotero.debug(tgt);
      Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return true;
    }
  );
}

export { caiyun };
