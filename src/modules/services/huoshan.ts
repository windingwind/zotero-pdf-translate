import { TranslateTaskProcessor } from "../../utils/task";
import CryptoJS from "crypto-js";

export default <TranslateTaskProcessor>async function (data) {
  const params = data.secret.split("#");
  const id: string = params[0];
  const key: string = params[1];

  function getDateTimeNow() {
    const now = new Date();
    return now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  }
  function getSigningKey(sk: any, metaData: any) {
    const kDate = CryptoJS.HmacSHA256(metaData.date, sk);
    const kRegion = CryptoJS.HmacSHA256(metaData.region, kDate);
    const kService = CryptoJS.HmacSHA256(metaData.service, kRegion);
    return CryptoJS.HmacSHA256("request", kService);
  }

  function getStringHeaders(header: any) {
    let str = "";
    const keys = Object.keys(header).sort();
    keys.forEach((key) => {
      str += `${key.toLocaleLowerCase()}:${header[key]}\n`;
    });
    return str;
  }

  function getSignedHeaders(header: any) {
    const keys = Object.keys(header).sort();
    const headerList = keys.map((v) => v.toLocaleLowerCase());
    return headerList.join(";");
  }

  const ak = id;
  const sk = key;
  const currTime = getDateTimeNow();

  const requestObj = {
    method: "POST",
    url: "/",
    param: "Action=TranslateText&Version=2020-06-01",
    service: "translate",
    region: "cn-north-1",
    version: "2020-06-01",
    date: currTime,
    algorithm: "HMAC-SHA256",
  };

  const requestBody = {
    TargetLanguage: "zh",
    TextList: [data.raw],
  };

  const XContentSha256 = CryptoJS.SHA256(JSON.stringify(requestBody)).toString(
    CryptoJS.enc.Hex,
  );

  const header: any = {
    "Content-Type": "application/json",
    "X-Date": currTime,
    "X-Content-Sha256": XContentSha256,
  };

  const canonicalRequest = [
    requestObj.method,
    requestObj.url,
    requestObj.param,
    getStringHeaders(header),
    getSignedHeaders(header),
    header["X-Content-Sha256"],
  ].join("\n");

  // console.log(canonicalRequest)
  const hashCanonicalRequest = CryptoJS.SHA256(canonicalRequest).toString(
    CryptoJS.enc.Hex,
  );

  const signingStr = [
    requestObj.algorithm,
    currTime,
    `${currTime}/${requestObj.region}/${requestObj.service}/request`,
    hashCanonicalRequest,
  ].join("\n");
  // console.log(signingStr)

  const signingKey = getSigningKey(sk, requestObj);
  const sign = CryptoJS.HmacSHA256(signingStr, signingKey).toString(
    CryptoJS.enc.Hex,
  );

  const authorization = [
    `${requestObj.algorithm} Credential=${ak}/${currTime}/${requestObj.region}/${requestObj.service}/request`,
    "SignedHeaders=" + getSignedHeaders(header),
    `Signature=${sign}`,
  ].join(", ");

  header["Authorization"] = authorization;

  // // let tgt = "翻译失败";

  const xhr = await Zotero.HTTP.request(
    "POST",
    "http://translate.volcengineapi.com/?Action=TranslateText&Version=2020-06-01",
    {
      headers: header,
      body: JSON.stringify(requestBody),
    },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  const { TranslationList } = JSON.parse(xhr.response);
  // data.result = xhr.response;
  data.result = TranslationList[0].Translation;
};
