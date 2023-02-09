import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  const url = data.secret;
  const reqBody = JSON.stringify(
    {
      text: data.raw,
      source_lang: data.langfrom.split("-")[0].toUpperCase(),
      target_lang: data.langto.split("-")[0].toUpperCase()
    }
  );
  const xhr = await Zotero.HTTP.request("POST", url, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    responseType: "json",
    body: reqBody,
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  data.result = xhr.response.data;
}
