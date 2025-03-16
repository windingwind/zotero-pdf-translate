import { TranslateTask, TranslateTaskProcessor } from "../../utils/task";
import { getPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

export default <TranslateTaskProcessor>async function (data) {
  const apiURL =
    (getPref("qwenmt.endPoint") as string) ||
    "https://dashscope.aliyuncs.com/compatible-mode";
  const model = (getPref("qwenmt.model") as string) || "qwen-mt-plus";
  const domains_prompt = (getPref("qwenmt.domains") as string) || "";

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
    },
  );

  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  data.result = xhr.response.choices[0].message.content;
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
  "zh-HK": "Chinese",
  "zh-MO": "Chinese",
  "zh-SG": "Chinese",
  "zh-TW": "Chinese",
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
