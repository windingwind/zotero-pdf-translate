import { base64, hmacSha1Digest } from "../../utils/crypto";
import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  let params = data.secret.split("#");
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

  function encodeRFC5987ValueChars(str: string) {
    return encodeURIComponent(str)
      .replace(
        /['()]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
      ) // i.e., %27 %28 %29
      .replace(/\*/g, "%2A")
      .replace(/%20/g, "+");
  }

  const rawStr = `Action=TextTranslate&Language=zh-CN&Nonce=9744&ProjectId=${projectId}&Region=${region}&SecretId=${secretId}&Source=${
    data.langfrom.split("-")[0]
  }&SourceText=#$#&Target=${data.langto.split("-")[0]}&Timestamp=${new Date()
    .getTime()
    .toString()
    .substring(0, 10)}&Version=2018-03-21`;

  const sha1Str = encodeRFC5987ValueChars(
    base64(
      await hmacSha1Digest(
        `POSTtmt.tencentcloudapi.com/?${rawStr.replace("#$#", data.raw)}`,
        secretKey
      )
    )
  );

  const xhr = await Zotero.HTTP.request(
    "POST",
    "https://tmt.tencentcloudapi.com",
    {
      headers: {
        "content-type": "application/json",
      },
      // Encode \s to +
      body: `${rawStr.replace(
        "#$#",
        encodeRFC5987ValueChars(data.raw)
      )}&Signature=${sha1Str}`,
      responseType: "json",
    }
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  if (xhr.response.Response.Error) {
    throw `Service error: ${xhr.response.Response.Error.Code}:${xhr.response.Response.Error.Message}`;
  }
  data.result = xhr.response.Response.TargetText;
};
