import {
  getPref,
  getServiceSecret,
  getString,
  transformPromptWithContext,
} from "../../utils";
import { requestLlm } from "../../utils/llmStream";
import type { ChatRequest } from "../../utils/llmStream";
import { TranslateService } from "./base";
import type { TranslateTask } from "../../utils/task";

const translate = <TranslateService["translate"]>async function (data) {
  const apiURL = getPref("gemini.endPoint") as string;

  function transformContent(
    langFrom: string,
    langTo: string,
    sourceText: string,
  ) {
    return transformPromptWithContext(
      "gemini.prompt",
      langFrom,
      langTo,
      sourceText,
      data,
    );
  }

  function getGenContentAPI(data: Required<TranslateTask>) {
    const stream = getPref("gemini.stream") as boolean;
    if (stream) {
      return apiURL + `:streamGenerateContent?alt=sse&key=${data.secret}`;
    } else {
      return apiURL + `:generateContent?key=${data.secret}`;
    }
  }

  const refreshHandler = addon.api.getTemporaryRefreshHandler({ task: data });

  const xhr = await Zotero.HTTP.request("POST", getGenContentAPI(data), {
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: transformContent(data.langfrom, data.langto, data.raw),
            },
          ],
        },
      ],
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
          if (data) {
            result +=
              JSON.parse(data).candidates[0].content.parts[0].text || "";
          }
        }

        // Clear timeouts caused by stream transfers
        if (e.target.timeout) {
          e.target.timeout = 0;
        }

        data.result = result;
        preLength = e.target.response.length;

        refreshHandler();
      };
    },
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  // data.result = xhr.response.choices[0].message.content.substr(2);
};

export const Gemini: TranslateService = {
  id: "gemini",
  type: "sentence",
  helpUrl: "https://ai.google.dev/gemini-api/docs",

  defaultSecret: "",
  secretValidator(secret: string) {
    const flag = Boolean(secret);
    return {
      secret,
      status: flag,
      info: flag ? "" : "The secret is not set.",
    };
  },

  translate,

  /**
   * Follow-up chat, reusing the Gemini endpoint/secret of translation.
   */
  async chat(request: ChatRequest) {
    const apiURL = getPref("gemini.endPoint") as string;
    const stream = getPref("gemini.stream") as boolean;
    if (!apiURL) {
      throw getString("service-errorNotConfigured");
    }
    const secret = getServiceSecret("gemini");
    const url = stream
      ? `${apiURL}:streamGenerateContent?alt=sse&key=${secret}`
      : `${apiURL}:generateContent?key=${secret}`;

    const system = request.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const contents = request.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      }));

    return await requestLlm({
      url,
      headers: { "Content-Type": "application/json" },
      body: {
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents,
      },
      stream,
      format: "gemini",
      onDelta: request.onDelta,
      isAborted: request.isAborted,
      abortRef: request.abortRef,
    });
  },

  isConfigured() {
    return (
      !!(getPref("gemini.endPoint") as string) && !!getServiceSecret("gemini")
    );
  },

  config(settings) {
    settings
      .addTextSetting({
        prefKey: "gemini.endPoint",
        nameKey: "service-gemini-dialog-endPoint",
      })
      .addTextAreaSetting({
        prefKey: "gemini.prompt",
        nameKey: "service-gemini-dialog-prompt",
      })
      .addCheckboxSetting({
        prefKey: "gemini.stream",
        nameKey: "service-gemini-dialog-stream",
      });
  },
};
