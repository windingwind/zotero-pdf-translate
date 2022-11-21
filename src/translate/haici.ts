async function getAppId(forceRefresh: boolean = false) {
  let appId = "";
  // Just in case the update fails
  let doRefresh = true;
  try {
    const appIdObj = JSON.parse(
      Zotero.Prefs.get("ZoteroPDFTranslate.haiciAppId") as string
    );
    if (
      !forceRefresh &&
      appIdObj &&
      appIdObj.appId &&
      new Date().getTime() - appIdObj.t < 60 * 60 * 1000
    ) {
      appId = appIdObj.appId;
      doRefresh = false;
    }
  } catch (e) {}
  if (doRefresh) {
    const xhr = await Zotero.HTTP.request(
      "GET",
      "http://capi.dict.cn/fanyi.php",
      {
        headers: {
          "Referer": "http://fanyi.dict.cn/"
        },
        responseType: "text"
      }
    );
    if (xhr && xhr.response && xhr.response.code === 200) {
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.haiciAppId",
        JSON.stringify({
          t: new Date().getTime(),
          appId: xhr.response.match(/"(.+)"/)[1]
        })
      );
    }
  }
  return appId;
}

async function haici(text: string = undefined) {
    let args = this.getArgs("haici", text);
    return await this.requestTranslate(
      async () => {
        return await Zotero.HTTP.request(
          "GET",
          `http://api.microsofttranslator.com/V2/Ajax.svc/TranslateArray?appId=${
              await getAppId()
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
  