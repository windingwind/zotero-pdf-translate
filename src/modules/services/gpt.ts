import { TranslateTaskProcessor } from "../../utils/translate";
import { getPref } from "../../utils/prefs";

export const gptTranslate = <TranslateTaskProcessor>async function (data) {
  const model = getPref("gptModel");
  const xhr = await Zotero.HTTP.request(
    "POST",
    "https://api.openai.com/v1/chat/completions",
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.secret}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "user",
            content: `Translate this passage from ${
              data.langfrom.split("-")[0]
            } to ${data.langto.split("-")[0]}: ${data.raw}`,
          },
        ],
        stream: true,
      }),
      responseType: "text",
      requestObserver: (xmlhttp: XMLHttpRequest) => {
        let preLength = 0;
        let result = "";
        xmlhttp.onprogress = (e: any) => {
          // Only concatenate the new strings
          let newResponse = e.target.response.slice(preLength);
          let dataArray = newResponse.split("data: ");
          for (let data of dataArray) {
            try {
              let obj = JSON.parse(data);
              let choice = obj.choices[0];
              if (choice.finish_reason) {
                break;
              }
              result += choice.delta.content || "";
            } catch {
              continue;
            }
          }
          preLength = e.target.response.length;
          // Remove \n\n from the beginning of the data
          data.result = result.replace(/^\n\n/, "");
          addon.hooks.onReaderPopupRefresh();
          addon.hooks.onReaderTabPanelRefresh();
        };
      },
    }
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  // data.result = xhr.response.choices[0].message.content.substr(2);
};

export const updateGPTModel = async function (secret: string) {
  const xhr = await Zotero.HTTP.request(
    "GET",
    "https://api.openai.com/v1/models",
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      responseType: "json",
    }
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  const models = xhr.response.data;
  const availableModels = [];
  for (const model of models) {
    if (model.id.includes("gpt")) {
      availableModels.push(model.id);
    }
  }
  return availableModels;
};
