import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  const req_body = JSON.stringify([
    {
      text: data.raw,
    },
  ]);

  const xhr = await Zotero.HTTP.request(
    "POST",
    `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${data.langto}`,
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Host: "api.cognitive.microsofttranslator.com",
        "Content-Length": req_body.length,
        "Ocp-Apim-Subscription-Key": data.secret,
      },
      responseType: "json",
      body: req_body,
    }
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  const result = xhr.response[0].translations[0].text;
  if (!result) {
    throw `Parse error: ${JSON.stringify(xhr.response)}`;
  }
  data.result = result;
};
