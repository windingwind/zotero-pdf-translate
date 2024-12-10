import { getPref } from "../../utils/prefs";
import { TranslateTaskProcessor } from "../../utils/task";
export default <TranslateTaskProcessor>async function (data) {
  const id = 1000 * (Math.floor(Math.random() * 99999) + 8300000) + 1;
  const url =
    (getPref("deeplx.endpoint") as string) || "https://www2.deepl.com/jsonrpc";
  const t = data.raw;
  const ICounts = (t.match(/i/g) || []).length + 1;
  const ts = Date.now();

  let reqBody = JSON.stringify({
    jsonrpc: "2.0",
    method: "LMT_handle_texts",
    id: id,
    params: {
      texts: [
        {
          text: t,
          requestAlternatives: 3,
        },
      ],
      splitting: "newlines",
      lang: {
        source_lang_user_selected: mapLang(data.langfrom),
        target_lang: mapLang(data.langto),
      },
      timestamp: ts - (ts % ICounts) + ICounts,
      commonJobParams: {
        wasSpoken: false,
        transcribe_as: "",
      },
    },
  });
  if ((id + 5) % 29 == 0 || (id + 3) % 13 == 0) {
    reqBody = reqBody.replace('"method":"', '"method" : "');
  } else {
    reqBody = reqBody.replace('"method":"', '"method": "');
  }
  const xhr = await Zotero.HTTP.request("POST", url, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "*/*",
      "x-app-os-name": "iOS",
      "x-app-os-version": "16.3.0",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "x-app-device": "iPhone13,2",
      "User-Agent": "DeepL-iOS/2.6.0 iOS 16.3.0 (iPhone13,2)",
      "x-app-build": "353933",
      "x-app-version": "2.6",
      Connection: "keep-alive",
    },
    responseType: "json",
    body: reqBody,
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  data.result = xhr.response.result.texts[0].text;
};

// Inherited from src/modules/services/deepl.ts
function mapLang(lang: string) {
  if (lang in LANG_MAP) {
    return LANG_MAP[lang];
  }
  return lang.split("-")[0].toUpperCase();
}

const LANG_MAP = {
  "pt-BR": "PT-BR",
  "pt-PT": "PT-PT",
  "zh-CN": "ZH-HANS",
  "zh-HK": "ZH-HANT",
  "zh-MO": "ZH-HANT",
  "zh-SG": "ZH-HANS",
  "zh-TW": "ZH-HANT",
} as Record<string, string | undefined>;
