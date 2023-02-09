import { TranslateTask, TranslateTaskProcessor } from "../../utils/translate";

export const deeplfree = <TranslateTaskProcessor>async function (data) {
  return await deepl("https://api-free.deepl.com/v2/translate", data);
};

export const deeplpro = <TranslateTaskProcessor>async function (data) {
  return await deepl("https://api.deepl.com/v2/translate", data);
};

async function deepl(url: string, data: Required<TranslateTask>) {
  const reqBody = `auth_key=${data.secret}&text=${encodeURIComponent(
    data.raw
  )}&source_lang=${data.langfrom
    .split("-")[0]
    .toUpperCase()}&target_lang=${data.langto.split("-")[0].toUpperCase()}`;
  const xhr = await Zotero.HTTP.request("POST", url, {
    responseType: "json",
    body: reqBody,
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  data.result = xhr.response.translations[0].text;
}
