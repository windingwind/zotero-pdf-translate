import { TranslateService } from "./base";

// Lang code map for the Youdao web demo API (https://fanyi.youdao.com, backed
// by https://aidemo.youdao.com/trans). The old open endpoint
// http://fanyi.youdao.com/translate now redirects (302) to an error page.
const langMap: Record<string, string> = {
  "zh-CN": "zh-CHS",
  "zh-TW": "zh-CHT",
  "zh-HK": "zh-CHT",
  "zh-MO": "zh-CHT",
};

const mapLang = (lang: string) => langMap[lang] || lang.split("-")[0];

const translate: TranslateService["translate"] = async function (data) {
  const params = new URLSearchParams({
    from: mapLang(data.langfrom),
    to: mapLang(data.langto),
    q: data.raw,
  });
  const xhr = await Zotero.HTTP.request(
    "POST",
    "https://aidemo.youdao.com/trans",
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      responseType: "json",
    },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  const res = xhr.response;
  if (res.errorCode && res.errorCode !== "0") {
    throw `Youdao error code: ${res.errorCode}`;
  }
  const translation = res.translation as string[] | undefined;
  if (!translation || translation.length === 0) {
    throw "No result found error";
  }
  data.result = translation.join("\n");
};

export const Youdao: TranslateService = {
  id: "youdao",
  type: "sentence",

  translate,
};
