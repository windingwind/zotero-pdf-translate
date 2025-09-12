import type { TranslateService } from "./base";

export const TencentTransmart: TranslateService = {
  id: "tencenttransmart",
  name: "Tencent Transmart",
  type: "sentence" as const,
  translate: async function (data) {
    const { raw: text } = data;
    // Tencent Transmart only accepts base language code (e.g., 'en', 'zh')
    const from = (data.langfrom || "").split("-")[0];
    const to = (data.langto || "").split("-")[0];
    const URL = "https://transmart.qq.com/api/imt";
    const body = {
      header: {
        fn: "auto_translation",
        client_key:
          "browser-chrome-110.0.0-Mac OS-df4bd4c5-a65d-44b2-a40f-42f34f3535f2-1677486696487",
      },
      type: "plain",
      model_category: "normal",
      source: {
        lang: from,
        text_list: [text],
      },
      target: {
        lang: to,
      },
    };
    const headers = {
      "Content-Type": "application/json",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      referer: "https://transmart.qq.com/zh-CN/index",
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
    const { auto_translation } = result;
    if (auto_translation) {
      data.result = auto_translation.join("\n").trim();
    } else {
      throw JSON.stringify(result);
    }
  },
};
