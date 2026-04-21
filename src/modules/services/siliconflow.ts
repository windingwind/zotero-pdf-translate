import { getPref, getString, transformPromptWithContext } from "../../utils";
import { TranslateService } from "./base";

const SILICONFLOW_PREF_PREFIX = "siliconflow";

interface ParsedResponse {
  content: string;
  finished: boolean;
}

function parseStreamResponse(obj: any): ParsedResponse {
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
  if (obj.choices && obj.choices[0]) {
    return obj.choices[0].message?.content || "";
  }
  return "";
}

const siliconflowTranslate = async function (
  data: Parameters<TranslateService["translate"]>[0],
) {
  const apiURL =
    (getPref(`${SILICONFLOW_PREF_PREFIX}.endPoint`) as string) ||
    "https://api.siliconflow.cn/v1/chat/completions";
  const model =
    (getPref(`${SILICONFLOW_PREF_PREFIX}.model`) as string) ||
    "tencent/Hunyuan-MT-7B";
  const temperature = parseFloat(
    getPref(`${SILICONFLOW_PREF_PREFIX}.temperature`) as string,
  );
  const stream = getPref(`${SILICONFLOW_PREF_PREFIX}.stream`) as boolean;

  function transformContent(
    langFrom: string,
    langTo: string,
    sourceText: string,
  ) {
    return transformPromptWithContext(
      `${SILICONFLOW_PREF_PREFIX}.prompt`,
      langFrom,
      langTo,
      sourceText,
      data,
    );
  }

  const refreshHandler = addon.api.getTemporaryRefreshHandler({ task: data });

  if (!stream) {
    data.result = getString("status-translating");
    refreshHandler();
  }

  const streamCallback = (xmlhttp: XMLHttpRequest) => {
    let preLength = 0;
    let result = "";
    let buffer = "";

    xmlhttp.onprogress = (e: any) => {
      const newResponse = e.target.response.slice(preLength);
      const fullResponse = buffer + newResponse;
      const dataArray = fullResponse.split("data:");
      buffer = "";

      for (let i = 0; i < dataArray.length; i++) {
        const dataLine = dataArray[i];
        if (!dataLine.trim()) continue;

        if (dataLine.trim() === "[DONE]") continue;

        try {
          const obj = JSON.parse(dataLine);
          const { content, finished } = parseStreamResponse(obj);
          result += content;
          if (finished) {
            break;
          }
        } catch {
          if (i === dataArray.length - 1) {
            buffer = "data:" + dataLine;
          }
          continue;
        }
      }

      if (e.target.timeout) {
        e.target.timeout = 0;
      }

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

  const requestBody = {
    model: model,
    messages: [
      {
        role: "user",
        content: transformContent(data.langfrom, data.langto, data.raw),
      },
    ],
    temperature: temperature,
    stream: stream,
  };

  const xhr = await Zotero.HTTP.request("POST", apiURL, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.secret}`,
    },
    body: JSON.stringify(requestBody),
    responseType: "text",
    requestObserver: (xmlhttp: XMLHttpRequest) => {
      if (stream) {
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

export const SiliconFlow: TranslateService = {
  id: "siliconflow",
  type: "sentence",
  helpUrl: "https://docs.siliconflow.cn/",

  defaultSecret: "",
  secretValidator(secret: string) {
    const status = secret.length > 0;
    return {
      secret,
      status,
      info: status
        ? "Click the button to check connectivity."
        : "The secret is not set.",
    };
  },

  async translate(data) {
    return await siliconflowTranslate(data);
  },

  config(settings) {
    settings
      .addTextSetting({
        prefKey: `${SILICONFLOW_PREF_PREFIX}.endPoint`,
        nameKey: `service-siliconflow-dialog-endPoint`,
      })
      .addTextSetting({
        prefKey: `${SILICONFLOW_PREF_PREFIX}.model`,
        nameKey: `service-siliconflow-dialog-model`,
      })
      .addNumberSetting({
        prefKey: `${SILICONFLOW_PREF_PREFIX}.temperature`,
        nameKey: `service-siliconflow-dialog-temperature`,
        min: 0,
        max: 2,
        step: 0.1,
      })
      .addTextAreaSetting({
        prefKey: `${SILICONFLOW_PREF_PREFIX}.prompt`,
        nameKey: `service-siliconflow-dialog-prompt`,
        placeholder: getString(`service-siliconflow-dialog-prompt`),
      })
      .addCheckboxSetting({
        prefKey: `${SILICONFLOW_PREF_PREFIX}.stream`,
        nameKey: `service-siliconflow-dialog-stream`,
      });
  },
};
