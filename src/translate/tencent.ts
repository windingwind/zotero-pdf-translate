import hmacSHA1 from "crypto-js/hmac-sha1";
import Base64 from "crypto-js/enc-base64";

async function tencent(text: string = undefined) {
  let args = this.getArgs("tencent", text);
  let params = args.secret.split("#");
  let secretId = params[0];
  let secretKey = params[1];
  let region = "ap-shanghai";
  if (params.length >= 3) {
    region = params[2];
  }
  let projectId = "0";
  if (params.length >= 4) {
    projectId = params[3];
  }

  function encodeRFC5987ValueChars(str) {
    return encodeURIComponent(str)
      .replace(/['()]/g, escape) // i.e., %27 %28 %29
      .replace(/\*/g, "%2A")
      .replace(/%20/g, "+");
  }

  let rawStr = `Action=TextTranslate&Language=zh-CN&Nonce=9744&ProjectId=${projectId}&Region=${region}&SecretId=${secretId}&Source=${
    args.sl.split("-")[0]
  }&SourceText=#$#&Target=${args.tl.split("-")[0]}&Timestamp=${new Date()
    .getTime()
    .toString()
    .substr(0, 10)}&Version=2018-03-21`;

  let sha1Str = encodeRFC5987ValueChars(
    Base64.stringify(
      hmacSHA1(
        `POSTtmt.tencentcloudapi.com/?${rawStr.replace("#$#", args.text)}`,
        secretKey
      )
    )
  );

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "POST",
        "https://tmt.tencentcloudapi.com",
        {
          headers: {
            "content-type": "application/json",
          },
          // Encode \s to +
          body: `${rawStr.replace(
            "#$#",
            encodeRFC5987ValueChars(args.text)
          )}&Signature=${sha1Str}`,
          responseType: "json",
        }
      );
    },
    (xhr) => {
      if (xhr.response.Response.Error) {
        throw `${xhr.response.Response.Error.Code}:${xhr.response.Response.Error.Message}`;
      }
      let tgt = xhr.response.Response.TargetText;
      Zotero.debug(tgt);
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}

export { tencent };
