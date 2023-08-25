import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
  const reqBody = JSON.stringify([{ Text: data.raw }]);

  const xhr = await Zotero.HTTP.request(
    "POST",
    `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${data.langto}`,
    {
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": data.secret,
      },
      responseType: "json",
      body: reqBody,
    },
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
