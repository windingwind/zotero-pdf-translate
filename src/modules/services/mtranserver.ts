import { getPref } from "../../utils/prefs";
import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
  const url =
    (getPref("mtranserver.endpoint") as string) ||
    "http://101.132.167.46:58080/translate";
  const xhr = await Zotero.HTTP.request("POST", `${url}`, {
    headers: {
      authorization: `Bearer ${data.secret}`,
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
  if (lang in LANG_MAP) {
    return LANG_MAP[lang];
  }
  return lang;
}

const LANG_MAP = {
  "zh-CN": "zh",
  "zh-HK": "zh",
  "zh-MO": "zh",
  "zh-SG": "zh",
  "zh-TW": "zh",
} as Record<string, string | undefined>;
