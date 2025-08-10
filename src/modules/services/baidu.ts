import { TranslateService } from "./base";

const translate: TranslateService["translate"] = async (data) => {
  const params = data.secret.split("#");
  const appid = params[0];
  const key = params[1];
  let action = "0";
  if (params.length >= 3) {
    action = params[2];
  }
  const salt = new Date().getTime();
  const sign = Zotero.Utilities.Internal.md5(
    appid + data.raw + salt + key,
    false,
  );

  // Request
  const xhr = await Zotero.HTTP.request(
    "GET",
    `http://api.fanyi.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(
      data.raw,
    )}&appid=${appid}&from=${data.langfrom.split("-")[0]}&to=${
      data.langto.split("-")[0]
    }&salt=${salt}&sign=${sign}&action=${action}&needIntervene=1`,
    {
      responseType: "json",
    },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  // Parse
  if (xhr.response.error_code) {
    throw `Service error: ${xhr.response.error_code}:${xhr.response.error_msg}`;
  }
  let tgt = "";
  for (let i = 0; i < xhr.response.trans_result.length; i++) {
    tgt += xhr.response.trans_result[i].dst;
  }
  data.result = tgt;
};

export const Baidu: TranslateService = {
  id: "baidu",
  type: "sentence",

  defaultSecret: "appid#key",
  secretValidator(secret: string) {
    const parts = secret?.split("#");
    const flag = [2, 3].includes(parts.length);
    const partsInfo = `AppID: ${parts[0]}\nKey: ${parts[1]}\nAction: ${
      parts[2] ? parts[2] : "0"
    }`;

    return {
      secret,
      status: flag && secret !== this.defaultSecret,
      info:
        secret === this.defaultSecret
          ? "The secret is not set."
          : flag
            ? partsInfo
            : `The secret format of Baidu Text Translation is AppID#Key#Action(optional). The secret must have 2 or 3 parts joined by '#', but got ${parts?.length}.\n${partsInfo}`,
    };
  },

  translate,
};
