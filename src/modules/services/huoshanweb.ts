import type { TranslateService } from "./base";

// https://github.com/TechDecryptor/pot-app-translate-plugin-volcengine
export const HuoshanWeb: TranslateService = {
  id: "huoshanweb",
  name: "Huoshan Web",
  type: "sentence" as const,
  translate: async function (data) {
    const { raw: text } = data;
    const from = (data.langfrom || "").split("-")[0];
    const to = (data.langto || "").split("-")[0];
    const URL = "https://translate.volcengine.com/crx/translate/v1";
    const body = {
      source_language: from,
      target_language: to,
      text,
    };
    const headers = {
      "content-type": "application/json",
    };
    const xhr = await Zotero.HTTP.request("POST", URL, {
      headers,
      body: JSON.stringify(body),
      responseType: "json",
    });
    if (xhr.status !== 200) {
      throw `Request error: ${xhr.status}`;
    }
    const result = xhr.response;
    const { translation } = result;
    if (translation) {
      data.result = translation;
    } else {
      throw JSON.stringify(result);
    }
  },
};
