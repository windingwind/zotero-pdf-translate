import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
  const xhr = await Zotero.HTTP.request(
    "GET",
    `https://www.youdao.com/w/${encodeURIComponent(data.raw)}/`,
    { responseType: "text" },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  let res = xhr.response;
  try {
    res = res.replace(/(\r\n|\n|\r)/gm, "");
    res = res.match(
      /<div id="phrsListTab.*webTrans" class="trans-wrapper trans-tab">/gm,
    );

    let tgt = "";
    if (res.length > 0) {
      tgt = res[0].replace(/<[^>]*>?/gm, "\n");
      tgt = tgt.replace(/\n\s*\n/g, "\n");
      tgt = tgt.replace(/\s\s+/g, " ");
      tgt = tgt.trim();
    }
    if (tgt.length != 0) {
      const audioList: Array<{ text: string; url: string }> = [];

      const en = tgt.match(/英 \[.+?\]/gm);
      if (en != null && en.length != 0) {
        audioList.push({
          text: en[0],
          url: `https://dict.youdao.com/dictvoice?audio=${data.raw}&type=1`,
        });
      }

      const us = tgt.match(/美 \[.+?\]/gm);
      if (us != null && us.length != 0) {
        audioList.push({
          text: us[0],
          url: `https://dict.youdao.com/dictvoice?audio=${data.raw}&type=2`,
        });
      }
      data.audio = audioList;
    }

    data.result = tgt;
  } catch (e) {
    throw "Parse Error";
  }
};
