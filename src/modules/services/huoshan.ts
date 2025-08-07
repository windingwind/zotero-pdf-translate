import { hex, hmacSha256Digest, sha256Digest } from "../../utils/crypto";
import { TranslateService } from "./base";

const translate = <TranslateService["translate"]>async function (data) {
  const params = data.secret.split("#");
  const id: string = params[0];
  const key: string = params[1];

  function getDateTimeNow() {
    const now = new Date();
    return now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  }
  async function getSigningKey(sk: any, metaData: any) {
    const kDate = await hmacSha256Digest(metaData.date, sk);
    const kRegion = await hmacSha256Digest(metaData.region, kDate);
    const kService = await hmacSha256Digest(metaData.service, kRegion);
    return await hmacSha256Digest("request", kService);
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

  const XContentSha256 = hex(await sha256Digest(JSON.stringify(requestBody)));

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

  const hashCanonicalRequest = hex(await sha256Digest(canonicalRequest));

  const signingStr = [
    requestObj.algorithm,
    currTime,
    `${currTime}/${requestObj.region}/${requestObj.service}/request`,
    hashCanonicalRequest,
  ].join("\n");

  const signingKey = await getSigningKey(sk, requestObj);
  const sign = hex(await hmacSha256Digest(signingStr, signingKey));

  const authorization = [
    `${requestObj.algorithm} Credential=${ak}/${currTime}/${requestObj.region}/${requestObj.service}/request`,
    "SignedHeaders=" + getSignedHeaders(header),
    `Signature=${sign}`,
  ].join(", ");

  header["Authorization"] = authorization;

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
  data.result = TranslationList[0].Translation;
};

export const Huoshan: TranslateService = {
  id: "huoshan",
  type: "sentence",

  defaultSecret: "accessKeyId#accessKeySecret",
  secretValidator(secret: string) {
    const parts = secret?.split("#");
    const flag = parts.length === 2;
    const partsInfo = `AccessKeyId: ${parts[0]}\nAccessKeySecret: ${parts[1]}`;
    return {
      secret,
      status: flag && secret !== this.defaultSecret,
      info:
        secret === this.defaultSecret
          ? "The secret is not set."
          : flag
            ? partsInfo
            : `The secret format of Huoshan Text Translation is AccessKeyId#AccessKeySecret. The secret must have 2 parts joined by '#', but got ${parts?.length}.\n${partsInfo}`,
    };
  },

  translate,

  getConfig() {
    return [];
  },
};
