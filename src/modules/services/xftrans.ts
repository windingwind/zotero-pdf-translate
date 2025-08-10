import { getString } from "../../utils";
import { base64, hmacSha256Digest, sha256Digest } from "../../utils/crypto";
import { getPref } from "../../utils/prefs";
import { TranslateService } from "./base";

const translate: TranslateService["translate"] = async function (data) {
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
      const langs = [{ regex: /zh(?:[-_]\w+)?/, lang: "cn" }];
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

export const XFfrans: TranslateService = {
  id: "xftrans",
  type: "sentence",
  helpUrl: "https://console.xfyun.cn/services",

  defaultSecret: "AppID#ApiSecret#ApiKey",
  secretValidator(secret: string) {
    const parts = secret?.split("#");
    const flag = parts.length === 3;
    const partsInfo = `AppID: ${parts[0]}\nApiSecret: ${parts[1]}\nApiKey: ${parts[2]}`;
    return {
      secret,
      status: flag && secret !== this.defaultSecret,
      info:
        secret === this.defaultSecret
          ? "The secret is not set."
          : flag
            ? partsInfo
            : `The secret format of Xftrans Domain Text Translation is AppID#ApiSecret#ApiKey. The secret must have 3 parts joined by '#', but got ${parts?.length}.\n${partsInfo}`,
    };
  },

  translate,

  config(settings) {
    // TODO: switch to select field: xf/niutrans
    settings
      .addSetting("", "", {
        tag: "label",
        namespace: "html",
        attributes: {
          for: "translate-engine",
        },
        properties: {
          innerHTML: getString("service-xftrans-dialog-engine"),
        },
        styles: {
          gridColumn: "1 / span 2",
        },
      })
      .addCheckboxSetting({
        prefKey: "xftrans.useNiutrans",
        nameKey: "service-xftrans-dialog-useniutrans",
      });
  },
};
