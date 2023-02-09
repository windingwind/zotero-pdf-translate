import { getPref } from "../../utils/prefs";
import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  const apikey = data.secret;
  const dictNo = getPref("niutransDictNo");
  const memoryNo = getPref("niutransMemoryNo");
  const xhr = await Zotero.HTTP.request(
    "POST",
    "https://api.niutrans.com/NiuTransServer/translation",
    {
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify({
        from: data.langfrom.split("-")[0],
        to: data.langto.split("-")[0],
        apikey,
        dictNo,
        memoryNo,
        source: "zotero",
        src_text: data.raw,
      }),
      responseType: "json",
    }
  );

  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  if (xhr.response.error_code) {
    throw `Service error: ${xhr.response.error_code}:${xhr.response.error_msg}`;
  }
  data.result = xhr.response.tgt_text;
};
