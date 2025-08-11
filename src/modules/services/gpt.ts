import { getPref, getString } from "../../utils";
import { TranslateService } from "./base";

type ID = "chatgpt" | "customgpt1" | "customgpt2" | "customgpt3" | "azuregpt";

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
      finished:
        choice.finish_reason !== undefined && choice.finish_reason !== null,
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
  data: Parameters<TranslateService["translate"]>[0],
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

  const refreshHandler = addon.api.getTemporaryRefreshHandler({ task: data });

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

      refreshHandler();
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

function createGPTService(id: ID): TranslateService {
  const checkSecret = id === "azuregpt" || id === "chatgpt";

  return {
    id,
    type: "sentence",
    helpUrl:
      id === "azuregpt"
        ? "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/reference#chat-completions"
        : "https://gist.github.com/GrayXu/f1b72353b4b0493d51d47f0f7498b67b",

    ...(checkSecret && {
      defaultSecret: "",
      secretValidator(secret: string) {
        if (id === "chatgpt") {
          const status = /^sk-[A-Za-z0-9_-]{32,}$/.test(secret);
          const empty = secret.length === 0;
          return {
            secret,
            status,
            info: empty
              ? "The secret is not set."
              : status
                ? "Click the button to check connectivity."
                : "The secret key format is invalid.",
          };
        }

        if (id === "azuregpt") {
          const flag = Boolean(secret);
          return {
            secret,
            status: flag,
            info: flag ? "" : "The secret is not set.",
          };
        }

        const status = secret.length > 0;
        return {
          secret,
          status,
          info: status
            ? "Click the button to check connectivity."
            : "The secret key format is invalid.",
        };
      },
    }),

    async translate(data) {
      switch (id) {
        case "azuregpt": {
          const endPoint = getPref("azureGPT.endPoint") as string;
          const apiVersion = getPref("azureGPT.apiVersion");
          const model = getPref("azureGPT.model") as string;
          const temperature = parseFloat(
            getPref("azureGPT.temperature") as string,
          );
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
        }

        case "chatgpt":
        case "customgpt1":
        case "customgpt2":
        case "customgpt3": {
          const apiURL = getPref(`${id}.endPoint`) as string;
          const model = getPref(`${id}.model`) as string;
          const temperature = parseFloat(
            getPref(`${id}.temperature`) as string,
          );
          const stream = getPref(`${id}.stream`) as boolean;

          return await gptTranslate(
            apiURL,
            model,
            temperature,
            id,
            data,
            stream,
          );
        }

        default:
          break;
      }
    },

    config(settings) {
      const servicePrefix = id === "azuregpt" ? "azuregpt" : "chatgpt";

      // For compatibility reasons, in older versions, the preference key was `chatGPT`, rather than matching the ID.
      // Additionally, customGPT was not initialized in prefs.js.
      const prefPrefix = id.replace("gpt", "GPT") as
        | "chatGPT"
        // | "customGPT1"
        // | "customGPT2"
        // | "customGPT3"
        | "azureGPT";

      settings
        .addTextSetting({
          prefKey: `${prefPrefix}.endPoint`,
          nameKey: `service-${servicePrefix}-dialog-endPoint`,
        })
        .addTextSetting({
          prefKey: `${prefPrefix}.model`,
          nameKey: `service-${servicePrefix}-dialog-model`,
        })
        .addNumberSetting({
          prefKey: `${prefPrefix}.temperature`,
          nameKey: `service-${servicePrefix}-dialog-temperature`,
        });

      if (
        id === "azuregpt" &&
        prefPrefix === "azureGPT" &&
        servicePrefix === "azuregpt"
      ) {
        settings.addTextSetting({
          prefKey: `${prefPrefix}.apiVersion`,
          nameKey: `service-${servicePrefix}-dialog-apiVersion`,
          hidden: id !== "azuregpt",
        });
      }

      settings
        .addTextAreaSetting({
          prefKey: `${prefPrefix}.prompt`,
          nameKey: `service-${servicePrefix}-dialog-prompt`,
          placeholder: getString(`service-${servicePrefix}-dialog-prompt`),
        })
        .addCheckboxSetting({
          prefKey: `${prefPrefix}.stream`,
          nameKey: `service-${servicePrefix}-dialog-stream`,
        })
        .addCustomParamsSetting({
          prefKey: `${prefPrefix}.customParams`,
          nameKey: `service-${servicePrefix}-dialog-custom-request`,
          desc: getString(
            `service-${servicePrefix}-dialog-custom-request-description`,
          ),
        });
    },
  };
}

export const ChatGPT = createGPTService("chatgpt");
export const customGPT1 = createGPTService("customgpt1");
export const customGPT2 = createGPTService("customgpt2");
export const customGPT3 = createGPTService("customgpt3");
export const azureGPT = createGPTService("azuregpt");
