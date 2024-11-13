import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
  const reqBody = JSON.stringify([{ Text: data.raw }]);
  const params = data.secret.split("#");
  const secretKey = params[0];
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": secretKey,
  };
  // Sometimes the MicroSoft translator service need a region parameter.
  // The region string is in lower case without space inside. East Asia -> eastasia
  if (params[1]) {
    const region = params[1].replace(" ", "").toLowerCase();
    if (params[1] != "global") headers["Ocp-Apim-Subscription-Region"] = region;
  }
  const xhr = await Zotero.HTTP.request(
    "POST",
    `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${data.langto}`,
    {
      headers: headers,
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
