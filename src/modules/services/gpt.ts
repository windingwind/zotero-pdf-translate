import { TranslateTask, TranslateTaskProcessor } from "../../utils/task";
import { getPref } from "../../utils/prefs";

const gptTranslate = async function (
  apiURL: string,
  model: string,
  temperature: number,
  prefix: string,
  data: Required<TranslateTask>,
) {
  function transformContent(
    langFrom: string,
    langTo: string,
    sourceText: string,
  ) {
    return (getPref(`${prefix}.prompt`) as string)
      .replaceAll("${langFrom}", langFrom)
      .replaceAll("${langTo}", langTo)
      .replaceAll("${sourceText}", sourceText);
  }

  const xhr = await Zotero.HTTP.request("POST", apiURL, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.secret}`,
      "api-key": data.secret,
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

export const chatGPT = <TranslateTaskProcessor>async function (data) {
  const apiURL = getPref("chatGPT.endPoint") as string;
  const model = getPref("chatGPT.model") as string;
  const temperature = parseFloat(getPref("chatGPT.temperature") as string);

  return await gptTranslate(apiURL, model, temperature, "chatGPT", data);
};

export const azureGPT = <TranslateTaskProcessor>async function (data) {
  const endPoint = getPref("azureGPT.endPoint") as string;
  const apiVersion = getPref("azureGPT.apiVersion");
  const model = getPref("azureGPT.model") as string;
  const temperature = parseFloat(getPref("azureGPT.temperature") as string);
  const apiURL = new URL(endPoint);
  apiURL.pathname = `/openai/deployments/${model}/chat/completions`;
  apiURL.search = `api-version=${apiVersion}`;

  return await gptTranslate(apiURL.href, model, temperature, "azureGPT", data);
};
