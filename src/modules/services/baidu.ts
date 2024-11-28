import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
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
    }&salt=${salt}&sign=${sign}&action=${action}`,
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
