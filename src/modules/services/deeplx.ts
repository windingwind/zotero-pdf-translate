import { getPref } from "../../utils/prefs";
import { TranslateService } from "./base";

const translate = <TranslateService["translate"]>async function (data) {
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
  const xhr = await Zotero.HTTP.request(
    "POST",
    `${url}?client=chrome-extension,1.28.0&method=LMT_handle_jobs`,
    {
      headers: {
        Accept: "*/*",
        Authorization: "None",
        "Cache-Control": "no-cache",
        "Accept-Language":
          "en-US,en;q=0.9,zh-CN;q=0.8,zh-TW;q=0.7,zh-HK;q=0.6,zh;q=0.5",
        "Content-Type": "application/json",
        DNT: "1",
        Origin: "chrome-extension://cofdbpoegempjloogbagkncekinflcnj",
        Pragma: "no-cache",
        Priority: "u=1, i",
        Referer: "https://www.deepl.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "none",
        "Sec-GPC": "1",
        "User-Agent":
          "DeepLBrowserExtension/1.28.0 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
      },
      responseType: "json",
      body: reqBody,
    },
  );
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

export const DeepLX: TranslateService = {
  id: "deeplx",
  type: "sentence",

  translate,

  getConfig() {
    return [
      {
        type: "input",
        prefKey: "deeplx.endpoint",
        nameKey: "service-deeplx-dialog-endPoint",
      },
    ];
  },
};
