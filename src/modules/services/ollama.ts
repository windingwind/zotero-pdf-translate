import { TranslateTask, TranslateTaskProcessor } from "../../utils/task";
import { getPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

const ollamaTranslate = async function (
  apiURL: string,
  model: string,
  temperature: number,
  numCtx: number,
  prefix: string,
  data: Required<TranslateTask>,
  stream?: boolean,
) {
  function transformContent(
    langFrom: string,
    langTo: string,
    sourceText: string,
  ) {
    if (langFrom == "zh-CN")
    {
      langFrom = "Simplified Chinese";
    }
    if (langTo == "zh-CN")
    {
      langTo = "Simplified Chinese";
    }
    if (langFrom == "en")
    {
      langFrom = "English";
    }
    if (langTo == "en")
    {
      langTo = "English";
    }

    return (getPref(`${prefix}.prompt`) as string)
      .replaceAll("${langFrom}", langFrom)
      .replaceAll("${langTo}", langTo)
      .replaceAll("${sourceText}", sourceText);
  }

  const streamMode = stream ?? true;

  //It takes some time to translate, so set the text to "Translating" before the request
  if (streamMode === false) {
    data.result = getString("status-translating");
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
      const dataArray = newResponse.split("\n");

      for (const data of dataArray) {
        try {
          const obj = JSON.parse(data);
          if (obj.done == true) {
            break;
          }
          result += obj.message.content || "";
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
  };

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
        const resultContent = responseObj.message.content;
        data.result = resultContent.replace(/^\n\n/, "");
      } catch (error) {
        // throw `Failed to parse response: ${error}`;
        return;
      }

      // Trigger UI updates after receiving the full response
      addon.hooks.onReaderPopupRefresh();
      addon.hooks.onReaderTabPanelRefresh();
    };
  };

  const xhr = await Zotero.HTTP.request("POST", apiURL, {
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "user",
          content: transformContent(data.langfrom, data.langto, data.raw),
        },
      ],
      options:{
        temperature: temperature,
        num_ctx: numCtx,
      },
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

export const ollama = <TranslateTaskProcessor>async function (data) {
  const apiURL = getPref("ollama.endPoint") as string;
  const model = getPref("ollama.model") as string;
  const temperature = parseFloat(getPref("ollama.temperature") as string);
  const numCtx = parseInt(getPref("ollama.numCtx") as string);
  const stream = getPref("ollama.stream") as boolean;

  return await ollamaTranslate(
    apiURL,
    model,
    temperature,
    numCtx,
    "ollama",
    data,
    stream,
  );
};
