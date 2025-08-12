import { getPref } from "../../utils/prefs";
import { TranslateService } from "./base";

const translate = <TranslateService["translate"]>async function (data) {
  const url =
    (getPref("mtranserver.endpoint") as string) ||
    "http://localhost:8989/translate";
  const xhr = await Zotero.HTTP.request("POST", `${url}`, {
    headers: {
      authorization: `${data.secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text: data.raw,
      from: mapLang(data.langfrom),
      to: mapLang(data.langto),
    }),
    responseType: "json",
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  try {
    data.result = xhr.response.result;
  } catch {
    throw `Service error: ${xhr.response}`;
  }
};

function mapLang(lang: string) {
  const versionlabel = getPref("mtranserver.versionlabel") as boolean;
  if (versionlabel && lang in LANG_MAP) {
    return LANG_MAP[lang];
  }
  return lang.split("-")[0];
}

const LANG_MAP = {
  zh: "zh-Hans",
  "zh-CN": "zh-Hans",
  "zh-HK": "zh-Hant",
  "zh-MO": "zh-Hant",
  "zh-SG": "zh-Hans",
  "zh-TW": "zh-Hant",
} as Record<string, string | undefined>;

export const Mtranserver: TranslateService = {
  id: "mtranserver",
  type: "sentence",
  helpUrl:
    "https://github.com/xxnuo/MTranServer?tab=readme-ov-file#api-%E4%BD%BF%E7%94%A8",

  translate,

  config(settings) {
    settings
      .addTextSetting({
        prefKey: "mtranserver.endpoint",
        nameKey: "service-mtranserver-dialog-endPoint",
      })
      .addCheckboxSetting({
        prefKey: "mtranserver.versionlabel",
        nameKey: "service-mtranserver-dialog-versionlabel",
      });
  },
};
