import { hex, sha256Digest } from "../../utils/crypto";
import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  function encodeRFC5987ValueChars(str: string) {
    return encodeURIComponent(str)
      .replace(
        /['()]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
      ) // i.e., %27 %28 %29
      .replace(/\*/g, "%2A")
      .replace(/%20/g, "+");
  }

  function truncate(q: string) {
    const len = q.length;
    if (len <= 20) return q;
    return q.substring(0, 10) + len + q.substring(len - 10, len);
  }

  const [appid, key, vocabId] = data.secret.split("#");
  const salt = new Date().getTime();
  const curtime = Math.round(new Date().getTime() / 1000);
  const query = data.raw;
  const from = data.langfrom;
  const to = data.langto;
  const str1 = appid + truncate(query) + salt + curtime + key;

  const sign = hex(await sha256Digest(str1));

  const xhr = await Zotero.HTTP.request(
    "GET",
    `https://openapi.youdao.com/api?q=${encodeRFC5987ValueChars(
      query
    )}&appKey=${appid}&salt=${salt}&from=${from}&to=${to}&sign=${sign}&signType=v3&curtime=${curtime}&vocabId=${vocabId}`,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      responseType: "json",
    }
  );

  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  let res = xhr.response;
  if (parseInt(res.errorCode) !== 0) {
    throw `Service error: ${res.errorCode}`;
  }
  data.result = res.translation.join("");
};
