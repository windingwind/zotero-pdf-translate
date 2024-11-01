import { TranslateTaskProcessor } from "../../utils/translate";
import { getPref } from "../../utils/prefs";
import { getServiceSecret } from "../../utils/translate";

export const gptTranslate = <TranslateTaskProcessor>async function (data) {
  const model = getPref("gptModel");
  const temperature = parseFloat(getPref("gptTemperature") as string);
  const apiUrl = getPref("gptUrl");
  const isStream = getPref("gptIsStream");

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
        stream: isStream === "true",
      }),
      
      responseType: isStream === "true" ? "text" : "json",
      ...(isStream === "true" && {
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
        }
      })
    }
  );

  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  if (isStream === "false") {
    data.result = xhr.response.choices[0].message.content;
  }
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

export const authGPT = async function () {
  const secret = getServiceSecret("gpt");
  const apiUrl = getPref("gptUrl") as string ?? "https://api.openai.com/v1/chat/completions";
  const xhr = await Zotero.HTTP.request(
    "GET",
    apiUrl.replace("/chat/completions", "/models"),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      responseType: "json",
    }
  );
};