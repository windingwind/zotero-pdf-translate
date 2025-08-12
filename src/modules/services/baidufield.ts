import { TranslateService } from "./base";

const translate: TranslateService["translate"] = async (data) => {
  const params = data.secret.split("#");
  const appid = params[0];
  const key = params[1];
  const domain = params[2];
  const salt = new Date().getTime();
  const sign = Zotero.Utilities.Internal.md5(
    appid + data.raw + salt + domain + key,
    false,
  );
  const xhr = await Zotero.HTTP.request(
    "GET",
    `http://api.fanyi.baidu.com/api/trans/vip/fieldtranslate?q=${encodeURIComponent(
      data.raw,
    )}&appid=${appid}&from=${data.langfrom.split("-")[0]}&to=${
      data.langto.split("-")[0]
    }&domain=${domain}&salt=${salt}&sign=${sign}`,
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

export const BaiduField: TranslateService = {
  id: "baidufield",
  type: "sentence",

  defaultSecret: "appid#key#field",
  secretValidator(secret: string) {
    const parts = secret?.split("#");
    const flag = parts.length === 3;
    const partsInfo = `AppID: ${parts[0]}\nKey: ${parts[1]}\nDomainCode: ${parts[2]}`;
    return {
      secret,
      status: flag && secret !== this.defaultSecret,
      info:
        secret === this.defaultSecret
          ? "The secret is not set."
          : flag
            ? partsInfo
            : `The secret format of Baidu Domain Text Translation is AppID#Key#DomainCode. The secret must have 3 parts joined by '#', but got ${parts?.length}.\n${partsInfo}`,
    };
  },

  translate,
};
