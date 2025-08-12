import { getPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";
import { TranslateService } from "./base";

const translate: TranslateService["translate"] = async (data) => {
  const serveurl =
    (getPref("nllb.serveendpoint") as string) || "http://localhost:6060";
  const apiurl =
    (getPref("nllb.apiendpoint") as string) || "http://localhost:7860";
  const model = getPref("nllb.model") as string;
  const refreshHandler = addon.api.getTemporaryRefreshHandler({ task: data });

  if (model === "nllb-serve") {
    data.result = getString("status-translating");
    refreshHandler();

    const nonStreamCallback = (xmlhttp: XMLHttpRequest) => {
      xmlhttp.onload = () => {
        try {
          const responseObj = JSON.parse(xmlhttp.response);
          data.result = responseObj.translation[0];
        } catch (error) {
          return;
        }
        refreshHandler();
      };
    };

    const xhr = await Zotero.HTTP.request("POST", `${serveurl}/translate`, {
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        source: data.raw,
        src_lang: mapLang(data.langfrom),
        tgt_lang: mapLang(data.langto),
      }),
      responseType: "text",
      requestObserver: (xmlhttp: XMLHttpRequest) => {
        nonStreamCallback(xmlhttp);
      },
    });
    if (xhr?.status !== 200) {
      throw `Request error: ${xhr?.status}`;
    }
  } else if (model === "nllb-api") {
    const apistream = getPref("nllb.apistream") as boolean;
    if (!apistream) {
      data.result = getString("status-translating");
      refreshHandler();
    }

    const streamCallback = (xmlhttp: XMLHttpRequest) => {
      let preLength = 0;
      let result = "";
      xmlhttp.onprogress = (e: any) => {
        // Only concatenate the new strings
        const newResponse = e.target.response.slice(preLength);
        const lines = newResponse.split("\n");
        for (const line of lines) {
          if (line) {
            result += line.replace("data:", "").trim() || "";
          }
        }

        if (e.target.timeout) {
          e.target.timeout = 0;
        }

        data.result = result;
        preLength = e.target.response.length;

        refreshHandler();
      };
    };

    const nonStreamCallback = (xmlhttp: XMLHttpRequest) => {
      xmlhttp.onload = () => {
        try {
          data.result = xmlhttp.response.result;
        } catch (error) {
          return;
        }
        refreshHandler();
      };
    };

    const stream = apistream ? "/stream" : "";
    const responseType = apistream ? "text" : "json";

    const xhr = await Zotero.HTTP.request(
      "GET",
      `${apiurl}/api/v4/translator${stream}?text=${data.raw}&source=${mapLang(data.langfrom)}&target=${mapLang(data.langto)}`,
      {
        headers: {
          accept: "application/json",
        },
        responseType: `${responseType}`,
        requestObserver: (xmlhttp: XMLHttpRequest) => {
          if (apistream) {
            streamCallback(xmlhttp);
          } else {
            nonStreamCallback(xmlhttp);
          }
        },
      },
    );
    if (xhr?.status !== 200) {
      throw `Request error: ${xhr?.status}`;
    }
  }
};

function mapLang(lang: string) {
  const traditionalChinese = ["zh-HK", "zh-MO", "zh-TW"];
  if (traditionalChinese.includes(lang)) {
    return "zho_Hant";
  } else if (lang.split("-")[0] in LANG_MAP) {
    return LANG_MAP[lang.split("-")[0]];
  }
  return lang;
}

const LANG_MAP = {
  en: "eng_Latn",
  zh: "zho_Hans",
  ja: "jpn_Jpan",
  ko: "kor_Hang",
  fr: "fra_Latn",
  es: "spa_Latn",
  de: "deu_Latn",
  it: "ita_Latn",
  nl: "nld_Latn",
  pt: "por_Latn",
  ru: "rus_Cyrl",
  ar: "arb_Arab",
  tr: "tur_Latn",
  vi: "vie_Latn",
  th: "tha_Thai",
  id: "ind_Latn",
  ms: "zsm_Latn",
  hi: "hin_Deva",
  bn: "ben_Beng",
  ur: "urd_Arab",
  he: "heb_Hebr",
  pl: "pol_Latn",
  ro: "ron_Latn",
  cs: "ces_Latn",
  hu: "hun_Latn",
  sv: "swe_Latn",
  da: "dan_Latn",
  fi: "fin_Latn",
  el: "ell_Grek",
  uk: "ukr_Cyrl",
  km: "khm_Khmr",
} as Record<string, string | undefined>;

export const Nllb: TranslateService = {
  id: "nllb",
  type: "sentence",
  translate,

  config(settings) {
    settings
      .addSelectSetting({
        prefKey: "nllb.model",
        nameKey: "service-nllb-dialog-model",
        options: [
          {
            value: "nllb-api",
            label: "nllb-api API",
          },
          {
            value: "nllb-serve",
            label: "nllb-serve REST API",
          },
        ],
      })

      // api
      .addTextSetting({
        nameKey: "service-nllb-dialog-endpoint",
        prefKey: "nllb.apiendpoint",
      })
      .addCheckboxSetting({
        nameKey: "service-nllb-dialog-apistream",
        prefKey: "nllb.apistream",
      })

      // serve
      .addTextSetting({
        nameKey: "service-nllb-dialog-endpoint",
        prefKey: "nllb.serveendpoint",
      })

      // documentation
      .addButton(getString("service-nllb-dialog-apilabel"), "", {
        noClose: true,
        callback: () => {
          Zotero.launchURL(
            "https://github.com/winstxnhdw/nllb-api?tab=readme-ov-file#self-hosting",
          );
        },
      })
      .addButton(getString("service-nllb-dialog-servelabel"), "", {
        noClose: true,
        callback: () => {
          Zotero.launchURL(
            "https://github.com/thammegowda/nllb-serve?tab=readme-ov-file#nllb-serve",
          );
        },
      });
  },
};
