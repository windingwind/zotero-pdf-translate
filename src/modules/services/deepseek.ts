import { getPref, getString, transformPromptWithContext, SecretValidateResult } from "../../utils";
import { TranslateService } from "./base";

const DEFAULT_API_URL = "https://api.deepseek.com/v1";
const DEFAULT_MODEL = "deepseek-chat";
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
  return { content: "", finished: false };
}

function parseNonStreamResponse(obj: any): string {
  // Handle OpenAI format (choices array)
  if (obj.choices && obj.choices[0]) {
    return obj.choices[0].message.content || "";
  }
  return "";
}

const deepseekTranslate = async function (
  data: Parameters<TranslateService["translate"]>[0],
  stream?: boolean,
) {
  function transformContent(
    langFrom: string,
    langTo: string,
    sourceText: string,
  ) {
    return transformPromptWithContext(
      `deepSeek.prompt`,
      langFrom,
      langTo,
      sourceText,
      data,
    );
  }


  function genSystemPrompt(): String {
    const systemPrompt = (getPref("deepSeek.systemPrompt") as string) || "";
    if (systemPrompt !== "") {
      return systemPrompt
    }

    return `You are a highly skilled translation engine with expertise in academic paper translation. Your function is to translate academic texts into the ${data.langto}, ensuring the accurate translation of complex concepts and specialized terminology without altering the original academic tone or adding explanations.`
  }

  const apiURL = (getPref("deepSeek.endPoint") as string) || DEFAULT_API_URL;
  const model = (getPref("deepSeek.model") as string) || DEFAULT_MODEL;
  const streamMode = stream ?? (getPref("deepSeek.stream") as boolean);

  const refreshHandler = addon.api.getTemporaryRefreshHandler({ task: data });

  if (streamMode === false) {
    data.result = getString("status-translating");
    refreshHandler();
  }


  const streamCallback = (xmlhttp: XMLHttpRequest) => {
    let preLength = 0;
    let result = "";
    let buffer = ""; // Buffer to store incomplete JSON fragments
    xmlhttp.onprogress = (e: any) => {
      // Only concatenate the new strings
      const newResponse = e.target.response.slice(preLength);

      // Handle OpenAI SSE format
      let dataArray;
      // Prepend buffer from previous incomplete chunk
      const fullResponse = buffer + newResponse;
      dataArray = fullResponse.split("data: ");
      buffer = ""; // Reset buffer

      for (let i = 0; i < dataArray.length; i++) {
        const data = dataArray[i];
        if (!data.trim()) continue;

        try {
          const obj = JSON.parse(data);
          const { content, finished } = parseStreamResponse(obj);

          result += content;
          if (finished) {
            break;
          }
        } catch {
          // If parsing fails and this is the last item, it might be incomplete
          // Save it to buffer for next iteration
          if (i === dataArray.length - 1) {
            buffer = "data: " + data;
          }
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

  const nonStreamCallback = (xmlhttp: XMLHttpRequest) => {
    xmlhttp.onload = () => {
      try {
        const responseObj = JSON.parse(xmlhttp.responseText);
        const resultContent = parseNonStreamResponse(responseObj);
        data.result = resultContent.replace(/^\n\n/, "");
      } catch (error) {
        return;
      }
      refreshHandler();
    };
  };

  const xhr = await Zotero.HTTP.request("POST", apiURL, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.secret}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content: genSystemPrompt(),
        },
        {
          role: "user",
          content: transformContent(data.langfrom, data.langto, data.raw),
        },
      ],
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
};

export const DeepSeek: TranslateService = {
  id: "deepseek",
  type: "sentence",

  defaultSecret: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  secretValidator(secret: string): SecretValidateResult {
    if (secret === DeepSeek.defaultSecret) {  // 检查是否为默认占位符密钥
      return {
        secret,
        status: false,
        info: "Please input the API key.",
      };
    }

    if (!secret.startsWith("sk-")) { // 检查密钥格式是否正确（必须以 'sk-' 开头）
      return {
        secret,
        status: false,
        info: `Invalid API key. It should start with 'sk-': ${secret}`
      };

    }

    return {
      secret,
      status: true,
      info: `API KEY: ${secret}`
    };
  },

  async translate(data) {
    return await deepseekTranslate(data);
  },

  config(settings) {
    settings
      .addTextSetting({
        prefKey: "deepSeek.endPoint",
        nameKey: "service-deepseek-dialog-endPoint",
      })
      .addSelectSetting({
        prefKey: "deepSeek.model",
        nameKey: "service-deepseek-dialog-model",
        options: [
          { label: getString("service-deepseek-dialog-model-type-chat"), value: "deepseek-chat" },
          { label: getString("service-deepseek-dialog-model-type-reasoner"), value: "deepseek-reasoner" }
        ]
      })
      .addTextAreaSetting({
        prefKey: "deepSeek.systemPrompt",
        nameKey: "service-deepseek-dialog-system-prompt",
        placeholder: getString("service-deepseek-dialog-system-prompt"),
      })
      .addTextAreaSetting({
        prefKey: "deepSeek.prompt",
        nameKey: "service-deepseek-dialog-prompt",
        placeholder: getString("service-deepseek-dialog-prompt"),
      })
      .addCheckboxSetting({
        prefKey: "deepSeek.stream",
        nameKey: "service-deepseek-dialog-stream",
      })

  },
};
