import { TranslateService } from "./base";

const translate: TranslateService["translate"] = async function (data) {
  const param = `${data.langfrom.toUpperCase().replace("-", "_")}2${data.langto
    .toUpperCase()
    .replace("-", "_")}`;

  const xhr = await Zotero.HTTP.request(
    "GET",
    `http://fanyi.youdao.com/translate?&doctype=json&type=${param}&i=${encodeURIComponent(
      data.raw,
    )}`,
    { responseType: "json" },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  const res = xhr.response.translateResult;
  let tgt = "";
  for (const i in res) {
    for (const j in res[i]) {
      tgt += res[i][j].tgt;
    }
  }
  data.result = tgt;
};

export const Youdao: TranslateService = {
  id: "youdao",
  type: "sentence",

  translate,
};
