import SHA256 from "crypto-js/sha256";
import hex from "crypto-js/enc-hex";

async function youdaozhiyun(text: string = undefined) {
  const args = this.getArgs("youdaozhiyun", text);

  function truncate(q) {
    const len = q.length;
    if (len <= 20) return q;
    return q.substring(0, 10) + len + q.substring(len - 10, len);
  }

  const appid = args.secret.split("#")[0];
  const key = args.secret.split("#")[1];
  const vocabId = args.secret.split("#")[2];
  const salt = new Date().getTime();
  const curtime = Math.round(new Date().getTime() / 1000);
  const query = args.text;
  const from = args.sl;
  const to = args.tl;
  const str1 = appid + truncate(query) + salt + curtime + key;

  const sign = SHA256(str1).toString(hex);
  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "POST",
        "https://openapi.youdao.com/api",
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `q=${query}&appKey=${appid}&salt=${salt}&from=${from}&to=${to}&sign=${sign}&signType=v3&curtime=${curtime}&vocabId=${vocabId}`,
          responseType: "json",
        }
      );
    },
    (xhr) => {
      let res = xhr.response;
      if (parseInt(res.errorCode) !== 0) {
        throw new Error(`errorCode: ${res.errorCode}`);
      }
      let tgt = res.translation.join("");
      Zotero.debug(tgt);
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}
export { youdaozhiyun };
