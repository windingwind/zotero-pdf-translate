import { TranslateTask, TranslateTaskProcessor } from "../../utils/task";

export const deeplfree = <TranslateTaskProcessor>async function (data) {
  return await deepl("https://api-free.deepl.com/v2/translate", data);
};

export const deeplpro = <TranslateTaskProcessor>async function (data) {
  // See https://github.com/windingwind/zotero-pdf-translate/issues/579
  return await deepl(
    data.secret.endsWith("dp")
      ? "https://api.deepl-pro.com/v2/translate"
      : "https://api.deepl.com/v2/translate",
    data,
  );
};

async function deepl(url: string, data: Required<TranslateTask>) {
  const [key, glossary_id]: string[] = data.secret.split("#");
  let reqBody = `auth_key=${key}&text=${encodeURIComponent(
    data.raw,
  )}&source_lang=${data.langfrom
    .split("-")[0]
    .toUpperCase()}&target_lang=${data.langto.split("-")[0].toUpperCase()}`;
  if (glossary_id) {
    reqBody += `&glossary_id=${glossary_id}`;
  }
  const xhr = await Zotero.HTTP.request("POST", url, {
    responseType: "json",
    body: reqBody,
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  data.result = xhr.response.translations[0].text;
}
