import { getPref } from "../../utils/prefs";
import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
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
  const version = getPref("mtranserver.version") as string;
  if (version === "new" && lang in LANG_MAP) {
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
