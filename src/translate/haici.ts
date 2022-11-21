async function getAppId(forceRefresh: boolean = false) {
  let appId = "";
  // Just in case the update fails
  let doRefresh = true;
  try {
    const appIdObj = JSON.parse(
      Zotero.Prefs.get("ZoteroPDFTranslate.haiciAppId") as string
    );
    Zotero.debug(appIdObj)
    if (
      !forceRefresh &&
      appIdObj &&
      appIdObj.appId &&
      new Date().getTime() - appIdObj.t < 60 * 60 * 1000
    ) {
      appId = appIdObj.appId;
      doRefresh = false;
    }
  } catch (e) {
    Zotero.debug(e)
  }
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
    if (xhr && xhr.response) {
      appId = xhr.response.match(/"(.+)"/)[1]
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.haiciAppId",
        JSON.stringify({
          t: new Date().getTime(),
          appId: appId
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
      try {
        let tgt = "";
        xhr.response.forEach(line => {
            tgt += line.TranslatedText
        });
        Zotero.debug(tgt);
        if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
        return tgt;
      } catch {
        return `Please retry later, because we get this response from api: \n${xhr.response}`
      }
    }
  );
}
export { haici };
