import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  const xhr = await Zotero.HTTP.request(
    "GET",
    `https://www.youdao.com/w/${encodeURIComponent(data.raw)}/`,
    { responseType: "text" }
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  let res = xhr.response;
  res = res.replace(/(\r\n|\n|\r)/gm, "");
  res = res.match(
    /<div id="phrsListTab.*webTrans" class="trans-wrapper trans-tab">/gm
  );

  let tgt = "";
  if (res.length > 0) {
    tgt = res[0].replace(/<[^>]*>?/gm, "\n");
    tgt = tgt.replace(/\n\s*\n/g, "\n");
    tgt = tgt.replace(/\s\s+/g, " ");
    tgt = tgt.trim();
  }

  data.result = tgt;
};
