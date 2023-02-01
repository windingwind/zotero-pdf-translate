import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  let param = `${data.langfrom.toUpperCase().replace("-", "_")}2${data.langto
    .toUpperCase()
    .replace("-", "_")}`;

  const xhr = await Zotero.HTTP.request(
    "GET",
    `http://fanyi.youdao.com/translate?&doctype=json&type=${param}&i=${encodeURIComponent(
      data.raw
    )}`,
    { responseType: "json" }
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  let res = xhr.response.translateResult;
  let tgt = "";
  for (let i in res) {
    for (let j in res[i]) {
      tgt += res[i][j].tgt;
    }
  }
  data.result = tgt;
};
