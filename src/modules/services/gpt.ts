import { TranslateTaskProcessor } from "../../utils/task";
import { getPref } from "../../utils/prefs";
import { getServiceSecret } from "../../utils/secret";

export const gptTranslate = <TranslateTaskProcessor>async function (data) {
  const model = getPref("gptModel");
  const temperature = parseFloat(getPref("gptTemperature") as string);
  const apiUrl = getPref("gptUrl");

  function transformContent(langFrom: string, langTo: string, sourceText: string) {
    return (getPref("gptPrompt") as string)
      .replaceAll("${langFrom}", langFrom)
      .replaceAll("${langTo}", langTo)
      .replaceAll("${sourceText}", sourceText);
  }

  const xhr = await Zotero.HTTP.request("POST", apiUrl, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.secret}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "user",
          content: transformContent(data.langfrom, data.langto, data.raw),
        },
      ],
      temperature: temperature,
      stream: true,
    }),
    responseType: "text",
    requestObserver: (xmlhttp: XMLHttpRequest) => {
      let preLength = 0;
      let result = "";
      xmlhttp.onprogress = (e: any) => {
        // Only concatenate the new strings
        const newResponse = e.target.response.slice(preLength);
        const dataArray = newResponse.split("data: ");

        for (const data of dataArray) {
          try {
            const obj = JSON.parse(data);
            const choice = obj.choices[0];
            if (choice.finish_reason) {
              break;
            }
            result += choice.delta.content || "";
          } catch {
            continue;
          }
        }

        // Clear timeouts caused by stream transfers
        if (e.target.timeout) {
          e.target.timeout = 0;
        }

        // Remove \n\n from the beginning of the data
        data.result = result.replace(/^\n\n/, "");
        preLength = e.target.response.length;

        if (data.type === "text") {
          addon.hooks.onReaderPopupRefresh();
          addon.hooks.onReaderTabPanelRefresh();
        }
      };
    },
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  // data.result = xhr.response.choices[0].message.content.substr(2);
};

export const updateGPTModel = async function () {
  const secret = getServiceSecret("gpt");
  const xhr = await Zotero.HTTP.request(
    "GET",
    "https://api.openai.com/v1/models",
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      responseType: "json",
    },
  );

  const models = xhr.response.data;
  const availableModels = [];

  for (const model of models) {
    if (model.id.includes("gpt")) {
      availableModels.push(model.id);
    }
  }

  return availableModels;
};
