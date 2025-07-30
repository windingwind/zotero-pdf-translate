import { base64, hmacSha256Digest, sha256Digest } from "../../utils/crypto";
import { TranslateTaskProcessor } from "../../utils/task";
import { getPref } from "../../utils/prefs";

export default <TranslateTaskProcessor>async function (data) {
  const [appid, apiSecret, apiKey] = data.secret.split("#");
  const useNiutrans = getPref("xftrans.useNiutrans") as boolean;
  const config = useNiutrans
    ? {
        appid,
        apiSecret,
        apiKey,
        host: "ntrans.xfyun.cn",
        hostUrl: "https://ntrans.xfyun.cn/v2/ots",
        uri: "/v2/ots",
      }
    : {
        appid,
        apiSecret,
        apiKey,
        host: "itrans.xfyun.cn",
        hostUrl: "https://itrans.xfyun.cn/v2/its",
        uri: "/v2/its",
      };

  function transLang(inlang: string = "") {
    if (useNiutrans) {
      const simplifiedChinese = ["zh-CN", "zh-SG", "zh"];
      const traditionalChinese = ["zh-HK", "zh-MO", "zh-TW"];
      if (simplifiedChinese.includes(inlang)) {
        return "cn";
      }
      if (traditionalChinese.includes(inlang)) {
        return "cht";
      } else {
        return inlang.split("-")[0];
      }
    } else {
      const langs = [{ regex: /zh-\w+/, lang: "cn" }];
      // default
      let outlang = inlang.split("-")[0];
      langs.forEach((obj) => {
        if (obj.regex.test(inlang)) {
          outlang = obj.lang;
        }
      });
      return outlang;
    }
  }

  const transVar = {
    text: data.raw,
    from: transLang(data.langfrom),
    to: transLang(data.langto),
  };
  const date = new Date().toUTCString();
  const postBody = getPostBody(transVar.text, transVar.from, transVar.to);
  const digest = await getDigest(postBody);
  const options = {
    url: config.hostUrl,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json,version=1.0",
      Host: config.host,
      Date: date,
      Digest: digest,
      Authorization: await getAuthStr(date, digest),
    },
    json: true,
    body: postBody,
  };
  function getPostBody(text: string, from: string, to: string) {
    const digestObj = {
      common: {
        app_id: config.appid,
      },
      business: {
        from: from,
        to: to,
      },
      data: {
        text: base64(new TextEncoder().encode(text).buffer as ArrayBuffer),
      },
    };
    return digestObj;
  }
  async function getDigest(body: any) {
    return `SHA-256=${base64(await sha256Digest(JSON.stringify(body)))}`;
  }
  async function getAuthStr(date: string, digest: string) {
    const signatureOrigin = `host: ${config.host}\ndate: ${date}\nPOST ${config.uri} HTTP/1.1\ndigest: ${digest}`;
    const signatureSha = await hmacSha256Digest(
      signatureOrigin,
      config.apiSecret,
    );
    const signature = base64(signatureSha);
    const authorizationOrigin = `api_key="${config.apiKey}", algorithm="hmac-sha256", headers="host date request-line digest", signature="${signature}"`;
    return authorizationOrigin;
  }

  const xhr = await Zotero.HTTP.request("POST", options.url, {
    headers: options.headers,
    responseType: "json",
    body: JSON.stringify(options.body),
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  data.result = xhr.response.data.result.trans_result.dst;
};
