import { TranslateTaskProcessor } from "../../utils/task";
import { getPref } from "../../utils/prefs";

export default <TranslateTaskProcessor>async function (data) {
  const endpoint =
    (getPref("libretranslate.endpoint") as string) || "http://localhost:5000";
  const apiKey = data.secret; // Use the secret as the API key

  // Prepare request body
  const requestBody: any = {
    q: data.raw,
    source: data.langfrom.split("-")[0],
    target: data.langto.split("-")[0],
    format: "text",
  };

  // Only add API key if it exists
  if (apiKey) {
    requestBody.api_key = apiKey;
  }

  const xhr = await Zotero.HTTP.request("POST", `${endpoint}/translate`, {
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    responseType: "json",
  });

  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  if (xhr.response.error) {
    throw `Service error: ${xhr.response.error}`;
  }

  data.result = xhr.response.translatedText;
};
