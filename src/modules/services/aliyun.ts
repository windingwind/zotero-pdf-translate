import { base64, hmacSha1Digest, randomString } from "../../utils/crypto";
import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
  const params = data.secret.split("#");
  const accessKeyId = params[0];
  const accessKeySecret = params[1];

  function languageCode(str: string) {
    str = str.toLowerCase();
    if (str === "zh-tw") {
      return str;
    }
    return str.split("-")[0];
  }

  const encodedBody = `AccessKeyId=${accessKeyId}&Action=TranslateGeneral&Format=JSON&FormatType=text&SignatureMethod=HMAC-SHA1&SignatureNonce=${encodeURIComponent(
    randomString(12),
  )}&SignatureVersion=1.0&SourceLanguage=auto&SourceText=${encodeURIComponent(
    data.raw,
  )}&TargetLanguage=${languageCode(data.langto)}&Timestamp=${encodeURIComponent(
    new Date().toISOString(),
  )}&Version=2018-10-12`;

  const stringToSign = `POST&%2F&${encodeURIComponent(encodedBody)}`;

  const signature = base64(
    await hmacSha1Digest(stringToSign, `${accessKeySecret}&`),
  );

  const xhr = await Zotero.HTTP.request("POST", "https://mt.aliyuncs.com/", {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `${encodedBody}&Signature=${encodeURIComponent(signature)}`,
    responseType: "json",
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  if (xhr.response.Code !== "200") {
    throw `Service error: ${xhr.response.Code}:${xhr.response.Message}`;
  }
  data.result = xhr.response.Data.Translated;
};
