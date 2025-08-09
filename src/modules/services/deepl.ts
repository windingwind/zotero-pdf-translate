import { version } from "../../../package.json";
import { TranslateService } from "./base";

type ID = "deeplfree" | "deeplpro";

function createDeepl(id: ID): TranslateService {
  return {
    id,
    type: "sentence",

    defaultSecret: "",
    secretValidator(secret: string) {
      const flag = secret?.length >= 36;
      return {
        secret,
        status: flag,
        info: flag
          ? ""
          : `The secret is your DeepL KEY. The secret length must >= 36, but got ${secret?.length}.`,
      };
    },

    async translate(data) {
      let url: string;
      if (id === "deeplfree") {
        url = "https://api-free.deepl.com/v2/translate";
      } else {
        // See https://github.com/windingwind/zotero-pdf-translate/issues/579

        url = data.secret.endsWith("dp")
          ? "https://api.deepl-pro.com/v2/translate"
          : "https://api.deepl.com/v2/translate";
      }

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
    },

    getConfig() {
      return [];
    },
  };
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

export const DeeplFree = createDeepl("deeplfree");
export const DeeplPro = createDeepl("deeplpro");
