import { getPrefJSON, setPref } from "../../utils/prefs";
import { TranslateService } from "./base";

const translate = <TranslateService["translate"]>async function (data) {
  const xhr = await Zotero.HTTP.request(
    "GET",
    `http://api.microsofttranslator.com/V2/Ajax.svc/TranslateArray?appId=${await getAppId()}&from=${
      data.langfrom
    }&to=${data.langto}&texts=["${encodeURIComponent(
      data.raw.replace(/"/g, '\\"'),
    )}"]`,
    { responseType: "json" },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  try {
    let tgt = "";
    xhr.response.forEach((line: { TranslatedText: string }) => {
      tgt += line.TranslatedText;
    });
    data.result = tgt;
  } catch {
    throw `Service error: ${xhr.response}`;
  }
};

async function getAppId(forceRefresh: boolean = false) {
  let appId = "";
  // Just in case the update fails
  let doRefresh = true;
  try {
    const appIdObj = getPrefJSON("haiciAppId");
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
    ztoolkit.log(e);
  }
  if (doRefresh) {
    const xhr = await Zotero.HTTP.request(
      "GET",
      "http://capi.dict.cn/fanyi.php",
      {
        headers: {
          Referer: "http://fanyi.dict.cn/",
        },
        responseType: "text",
      },
    );
    if (xhr && xhr.response) {
      appId = xhr.response.match(/"(.+)"/)[1];
      setPref(
        "haiciAppId",
        JSON.stringify({
          t: new Date().getTime(),
          appId: appId,
        }),
      );
    }
  }
  return appId;
}

export const Haici: TranslateService = {
  id: "haici",
  type: "sentence",
  translate,
  getConfig() {
    return [];
  },
};
