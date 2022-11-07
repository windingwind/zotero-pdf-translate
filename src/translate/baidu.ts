async function baidu(text: string = undefined) {
  let args = this.getArgs("baidu", text);
  const params = args.secret.split("#");
  let appid = params[0];
  let key = params[1];
  let action = "0";
  if (params.length >= 3) {
    action = params[2];
  }
  let salt = new Date().getTime();
  let sign = Zotero.Utilities.Internal.md5(
    appid + args.text + salt + key,
    false
  );
  `from=${args.sl.split("-")[0]}&to=${args.tl.split("-")[0]}`;
  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        `http://api.fanyi.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(
          args.text
        )}&appid=${appid}&from=${args.sl.split("-")[0]}&to=${
          args.tl.split("-")[0]
        }&salt=${salt}&sign=${sign}&action=${action}`,
        {
          responseType: "json",
        }
      );
    },
    (xhr) => {
      if (xhr.response.error_code) {
        throw `${xhr.response.error_code}:${xhr.response.error_msg}`;
      }
      let tgt = "";
      for (let i = 0; i < xhr.response.trans_result.length; i++) {
        tgt += xhr.response.trans_result[i].dst;
      }
      Zotero.debug(tgt);
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}

export { baidu };