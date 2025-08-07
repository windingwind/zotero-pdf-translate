import { TranslateTask, TranslateTaskProcessor } from "../../utils/task";
import { getPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

export default <TranslateTaskProcessor>async function (data) {
  const apiURL =
    (getPref("qwenmt.endPoint") as string) ||
    "https://dashscope.aliyuncs.com/compatible-mode";
  const model = (getPref("qwenmt.model") as string) || "qwen-mt-plus";
  const domains_prompt = (getPref("qwenmt.domains") as string) || "";

  const refreshHandler = addon.api.getTemporaryRefreshHandler({ task: data });
  data.result = getString("status-translating");
  refreshHandler();

  const nonStreamCallback = (xmlhttp: XMLHttpRequest) => {
    xmlhttp.onload = () => {
      try {
        const responseObj = xmlhttp.response;
        const resultContent = responseObj.choices[0].message.content;
        data.result = resultContent.replace(/^\n\n/, "");
      } catch (error) {
        return;
      }
      refreshHandler();
    };
  };

  const xhr = await Zotero.HTTP.request(
    "POST",
    `${apiURL}/v1/chat/completions`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.secret}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "user",
            content: data.raw,
          },
        ],
        translation_options: {
          source_lang: "auto",
          target_lang: mapLang(data.langto),
          domains: domains_prompt,
        },
      }),
      responseType: "json",
      requestObserver: (xmlhttp: XMLHttpRequest) => {
        nonStreamCallback(xmlhttp);
      },
    },
  );

  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
};

function mapLang(lang: string) {
  if (lang in LANG_MAP) {
    return LANG_MAP[lang];
  }
  return lang.split("-")[0];
}

const LANG_MAP = {
  en: "English",
  zh: "Chinese",
  "zh-CN": "Chinese",
  "zh-HK": "Traditional Chinese",
  "zh-MO": "Traditional Chinese",
  "zh-SG": "Chinese",
  "zh-TW": "Traditional Chinese",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  nl: "Dutch",
  pt: "Portuguese",
  ru: "Russian",
  ar: "Arabic",
  tr: "Turkish",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  ms: "Malay",
  hi: "Hindi",
  bn: "Bengali",
  ur: "Urdu",
  fa: "Persian",
  he: "Hebrew",
  pl: "Polish",
  ro: "Romanian",
  cs: "Czech",
  hu: "Hungarian",
  sv: "Swedish",
  da: "Danish",
  fi: "Finnish",
  el: "Greek",
  no: "Norwegian",
  uk: "Ukrainian",
  km: "Khmer",
} as Record<string, string | undefined>;
