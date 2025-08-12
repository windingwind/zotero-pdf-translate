import { hex, sha256Digest } from "../../utils/crypto";
import { getPref } from "../../utils/prefs";
import { TranslateService } from "./base";

const translate: TranslateService["translate"] = async function (data) {
  function encodeRFC5987ValueChars(str: string) {
    return encodeURIComponent(str)
      .replace(
        /['()]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
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
  const domain = getPref("youdaozhiyun.domain") as string;

  const xhr = await Zotero.HTTP.request(
    "GET",
    `https://openapi.youdao.com/api?q=${encodeRFC5987ValueChars(
      query,
    )}&appKey=${appid}&salt=${salt}&from=${from}&to=${to}&sign=${sign}&signType=v3&curtime=${curtime}&vocabId=${vocabId}&domain=${domain}`,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      responseType: "json",
    },
  );

  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  const res = xhr.response;
  if (parseInt(res.errorCode) !== 0) {
    throw `Service error: ${res.errorCode}`;
  }
  data.result = res.translation.join("");
};

export const YoudaoZhiyun: TranslateService = {
  id: "youdaozhiyun",
  type: "sentence",
  helpUrl: "https://ai.youdao.com/console/#/service-singleton/text-translation",

  defaultSecret: "appid#appsecret#vocabid(optional)",
  secretValidator(secret: string) {
    const parts = secret?.split("#");
    const flag = [2, 3].includes(parts.length);
    const partsInfo = `AppID: ${parts[0]}\nAppKey: ${parts[1]}\nVocabID: ${
      parts[2] ? parts[2] : ""
    }`;
    return {
      secret,
      status: flag && secret !== this.defaultSecret,
      info:
        secret === this.defaultSecret
          ? "The secret is not set."
          : flag
            ? partsInfo
            : `The secret format of YoudaoZhiyun is AppID#AppKey#VocabID(optional). The secret must have 2 or 3 parts joined by '#', but got ${parts?.length}.\n${partsInfo}`,
    };
  },

  translate,

  config(settings) {
    settings.addSelectSetting({
      prefKey: "youdaozhiyun.domain",
      nameKey: "service-youdaozhiyun-dialog-domain",
      options: [
        {
          value: "general",
          label: "general",
        },
        {
          value: "computers",
          label: "computers",
        },
        {
          value: "medicine",
          label: "medicine",
        },
        {
          value: "finance",
          label: "finance",
        },
        {
          value: "game",
          label: "game",
        },
      ],
    });
  },
};
