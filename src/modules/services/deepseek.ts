import { TranslateTaskProcessor } from "../../utils/translate";
import { getPref } from "../../utils/prefs";
import { getServiceSecret } from "../../utils/translate";

export const deepseekTranslate = <TranslateTaskProcessor>async function (data) {
  const model = getPref("deepseekModel");
  const temperature = parseFloat(getPref("deepseekTemperature") as string);
  const apiUrl = getPref("deepseekUrl");
  const xhr = await Zotero.HTTP.request(
    "POST",
    apiUrl,
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
            content: `As an academic expert with specialized knowledge in various fields, please provide a proficient and precise translation translation from ${data.langfrom.split("-")[0]} to ${data.langto.split("-")[0]} of the academic text enclosed in 🔤. It is crucial to maintaining the original phrase or sentence and ensure accuracy while utilizing the appropriate language. The text is as follows:  🔤 ${data.raw} 🔤  Please provide the translated result without any additional explanation and remove 🔤.`,
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
    }
  );
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
    }
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
