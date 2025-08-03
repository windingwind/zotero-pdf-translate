import { base64, hmacSha1Digest, randomString } from "../../utils/crypto";
import { getPref } from "../../utils/prefs";
import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
  const params = data.secret.split("#");
  const accessKeyId = params[0];
  const accessKeySecret = params[1];
  const endpoint = params[2] || "https://mt.aliyuncs.com/";
  const action = (getPref("aliyun.action") as string) || "TranslateGeneral";
  const scene = (getPref("aliyun.scene") as string) || "general";

  function languageCode(str: string) {
    str = str.toLowerCase();
    if (str === "zh-tw" || str === "zh-hk" || str === "zh-mo") {
      return "zh-tw";
    }
    return str.split("-")[0];
  }

  function encodeRFC3986URIComponent(str: string) {
    return encodeURIComponent(str).replace(
      /[!'()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }

  const encodedBody = `AccessKeyId=${accessKeyId}&Action=${action}&Format=JSON&FormatType=text&Scene=${scene}&SignatureMethod=HMAC-SHA1&SignatureNonce=${encodeURIComponent(
    randomString(12),
  )}&SignatureVersion=1.0&SourceLanguage=auto&SourceText=${encodeRFC3986URIComponent(
    data.raw,
  )}&TargetLanguage=${languageCode(data.langto)}&Timestamp=${encodeURIComponent(
    new Date().toISOString(),
  )}&Version=2018-10-12`;

  const stringToSign = `POST&%2F&${encodeURIComponent(encodedBody)}`;

  const signature = base64(
    await hmacSha1Digest(stringToSign, `${accessKeySecret}&`),
  );

  const xhr = await Zotero.HTTP.request("POST", endpoint, {
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
