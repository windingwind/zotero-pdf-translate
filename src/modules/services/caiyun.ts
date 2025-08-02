import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
  const param = `${transLang(data.langfrom)}2${transLang(data.langto)}`;
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
    },
  );

  function transLang(inlang: string = "") {
    const traditionalChinese = ["zh-HK", "zh-MO", "zh-TW"];
    if (traditionalChinese.includes(inlang)) {
      return "zh-Hant";
    } else {
      return inlang.split("-")[0];
    }
  }

  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  data.result = xhr.response.target[0];
};
