import { getPref } from "../../utils/prefs";
import { TranslateService } from "./base";

const translate = <TranslateService["translate"]>async function (data) {
  const url = getPref("deeplcustom.endpoint") as string;
  const reqBody = JSON.stringify({
    text: data.raw,
    source_lang: data.langfrom.split("-")[0].toUpperCase(),
    target_lang: data.langto.split("-")[0].toUpperCase(),
  });
  const xhr = await Zotero.HTTP.request("POST", url, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    responseType: "json",
    body: reqBody,
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  data.result = xhr.response.data;
};

export const DeepLCustom: TranslateService = {
  id: "deeplcustom",
  type: "sentence",
  helpUrl:
    "https://github.com/ramonmi/DeepLX-for-Zotero/blob/main/README_zh.md",

  translate,

  getConfig() {
    return [
      {
        type: "input",
        prefKey: "deeplcustom.endpoint",
        nameKey: "service-deeplcustom-dialog-endPoint",
      },
    ];
  },
};
