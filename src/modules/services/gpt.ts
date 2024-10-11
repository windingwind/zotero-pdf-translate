import { TranslateTask, TranslateTaskProcessor } from "../../utils/task";
import { getPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

const gptTranslate = async function (
  apiURL: string,
  model: string,
  temperature: number,
  prefix: string,
  data: Required<TranslateTask>,
  stream?: boolean
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

  const streamMode = stream ?? true;

  //非流式传输模式下，可能需要等一段时间，所以在请求之前先设置文本为“正在翻译”
  //It takes some time to translate, so set the text to "Translating" before the request
  if (streamMode === false) {
    data.result = getString('status-translating');
    addon.hooks.onReaderPopupRefresh();
    addon.hooks.onReaderTabPanelRefresh();
  }

  /**
   * The requestObserver callback, under streaming mode
   * @param xmlhttp 
   */
  const streamCallback = (xmlhttp: XMLHttpRequest) => {
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
  }

  /**
   * The requestObserver callback, under non-streaming mode
   * @param xmlhttp 
   */
  const nonStreamCallback = (xmlhttp: XMLHttpRequest) => {
    // Non-streaming logic: Handle the complete response at once
    xmlhttp.onload = () => {
      // console.debug("GPT response received");
      try {
        const responseObj = JSON.parse(xmlhttp.responseText);
        const resultContent = responseObj.choices[0].message.content;
        data.result = resultContent.replace(/^\n\n/, "");
      } catch (error) {
        // throw `Failed to parse response: ${error}`;
        return;
      }

      // Trigger UI updates after receiving the full response
      addon.hooks.onReaderPopupRefresh();
      addon.hooks.onReaderTabPanelRefresh();
    };
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
      stream: streamMode,
    }),
    responseType: "text",
    requestObserver: (xmlhttp: XMLHttpRequest) => {
      if (streamMode) {
        streamCallback(xmlhttp);
      } else {
        nonStreamCallback(xmlhttp);
      }
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
  const stream = getPref("chatGPT.stream") as boolean;

  return await gptTranslate(apiURL, model, temperature, "chatGPT", data, stream);
};

export const azureGPT = <TranslateTaskProcessor>async function (data) {
  const endPoint = getPref("azureGPT.endPoint") as string;
  const apiVersion = getPref("azureGPT.apiVersion");
  const model = getPref("azureGPT.model") as string;
  const temperature = parseFloat(getPref("azureGPT.temperature") as string);
  const stream = getPref("azureGPT.stream") as boolean;

  const apiURL = new URL(endPoint);
  apiURL.pathname = `/openai/deployments/${model}/chat/completions`;
  apiURL.search = `api-version=${apiVersion}`;

  return await gptTranslate(apiURL.href, model, temperature, "azureGPT", data, stream);
};
