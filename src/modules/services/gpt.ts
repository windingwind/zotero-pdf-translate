import { TranslateTask, TranslateTaskProcessor } from "../../utils/task";
import { getPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

function getCustomParams(prefix: string): Record<string, any> {
  const storedCustomParams =
    (getPref(`${prefix}.customParams`) as string) || "{}";
  try {
    const customParams = JSON.parse(storedCustomParams);
    // Filter out parameters that are already defined
    const standardParams = ["model", "messages", "temperature", "stream"];
    return Object.fromEntries(
      Object.entries(customParams).filter(
        ([key]) => !standardParams.includes(key),
      ),
    );
  } catch (e) {
    return {};
  }
}

interface ParsedResponse {
  content: string;
  finished: boolean;
}

function parseStreamResponse(obj: any): ParsedResponse {
  // Handle OpenAI format (choices array with delta)
  if (obj.choices && obj.choices[0]) {
    const choice = obj.choices[0];
    return {
      content: choice.delta?.content || "",
      finished: choice.finish_reason !== null,
    };
  }
  // Handle Ollama native format (direct message)
  else if (obj.message) {
    return {
      content: obj.message.content || "",
      finished: obj.done === true,
    };
  }
  return { content: "", finished: false };
}

function parseNonStreamResponse(obj: any): string {
  // Handle OpenAI format (choices array)
  if (obj.choices && obj.choices[0]) {
    return obj.choices[0].message.content || "";
  }
  // Handle Ollama native format (direct message)
  else if (obj.message && obj.message.content) {
    return obj.message.content;
  }
  return "";
}

const gptTranslate = async function (
  apiURL: string,
  model: string,
  temperature: number,
  prefix: string,
  data: Required<TranslateTask>,
  stream?: boolean,
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

  const refreshHandler = addon.api.getTemporaryRefreshHandler();

  //It takes some time to translate, so set the text to "Translating" before the request
  if (streamMode === false) {
    data.result = getString("status-translating");
    refreshHandler();
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

      // Handle both OpenAI SSE format and Ollama native streaming
      let dataArray;
      if (newResponse.includes("data: ")) {
        // OpenAI SSE format
        dataArray = newResponse.split("data: ");
      } else {
        // Ollama native format - each line is a JSON object
        dataArray = newResponse
          .split("\n")
          .filter((line: string) => line.trim());
      }

      for (const data of dataArray) {
        try {
          const obj = JSON.parse(data);
          const { content, finished } = parseStreamResponse(obj);

          result += content;
          if (finished) {
            break;
          }
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
        refreshHandler();
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
        const resultContent = parseNonStreamResponse(responseObj);
        data.result = resultContent.replace(/^\n\n/, "");
      } catch (error) {
        // throw `Failed to parse response: ${error}`;
        return;
      }

      // Trigger UI updates after receiving the full response
      refreshHandler();
    };
  };

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
      ...getCustomParams(prefix),
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

export function getLLMService(type: string): TranslateTaskProcessor {
  return async (data) => {
    const apiURL = getPref(`${type}.endPoint`) as string;
    const model = getPref(`${type}.model`) as string;
    const temperature = parseFloat(getPref(`${type}.temperature`) as string);
    const stream = getPref(`${type}.stream`) as boolean;

    return await gptTranslate(apiURL, model, temperature, type, data, stream);
  };
}

export const azureGPT = <TranslateTaskProcessor>async function (data) {
  const endPoint = getPref("azureGPT.endPoint") as string;
  const apiVersion = getPref("azureGPT.apiVersion");
  const model = getPref("azureGPT.model") as string;
  const temperature = parseFloat(getPref("azureGPT.temperature") as string);
  const stream = getPref("azureGPT.stream") as boolean;

  const apiURL = new URL(endPoint);
  apiURL.pathname = `/openai/deployments/${model}/chat/completions`;
  apiURL.search = `api-version=${apiVersion}`;

  return await gptTranslate(
    apiURL.href,
    model,
    temperature,
    "azureGPT",
    data,
    stream,
  );
};
