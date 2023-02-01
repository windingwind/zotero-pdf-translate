import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  let param = `${data.langfrom.split("-")[0]}2${data.langto.split("-")[0]}`;
  const xhr = await Zotero.HTTP.request(
    "POST",
    "http://api.interpreter.caiyunai.com/v1/translator",
    {
      headers: {
        "content-type": "application/json",
        "x-authorization": `token ${data.secret}`,
      },
      body: JSON.stringify({
        source: [data.raw],
        trans_type: param,
        request_id: new Date().valueOf() / 10000,
        detect: true,
      }),
      responseType: "json",
    }
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  data.result = xhr.response.target[0];
};
