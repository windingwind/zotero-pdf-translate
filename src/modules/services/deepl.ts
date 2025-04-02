import { TranslateTask, TranslateTaskProcessor } from "../../utils/task";
import { version } from "../../../package.json";

export const deeplfree = <TranslateTaskProcessor>async function (data) {
  return await deepl("https://api-free.deepl.com/v2/translate", data);
};

export const deeplpro = <TranslateTaskProcessor>async function (data) {
  // See https://github.com/windingwind/zotero-pdf-translate/issues/579
  return await deepl(
    data.secret.endsWith("dp")
      ? "https://api.deepl-pro.com/v2/translate"
      : "https://api.deepl.com/v2/translate",
    data,
  );
};

async function deepl(url: string, data: Required<TranslateTask>) {
  const [key, glossary_id]: string[] = data.secret.split("#");
  const xhr = await Zotero.HTTP.request("POST", url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `DeepL-Auth-Key ${key}`,
      "User-Agent": `Translate for Zotero/${Zotero.version}-${Zotero.platform}-${version}`,
    },
    responseType: "json",
    body: JSON.stringify({
      text: [data.raw],
      source_lang: mapLang(data.langfrom),
      target_lang: mapLang(data.langto),
      glossary_id: glossary_id,
    }),
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  data.result = xhr.response.translations[0].text;
}

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
