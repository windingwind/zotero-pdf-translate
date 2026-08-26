import {
  getPref,
  getThinkingLevelOptions,
  stripThinkingTags,
  transformPromptWithContext,
} from "../../utils";
import { TranslateService } from "./base";
import type { TranslateTask } from "../../utils/task";

const translate = <TranslateService["translate"]>async function (data) {
  const apiURL = getPref("gemini.endPoint") as string;
  const thinkingLevel = getPref("gemini.thinkingLevel") as string;

  function getGenerationConfig() {
    // Gemini 3 replaces thinkingBudget with the thinkingLevel field; it
    // cannot be fully disabled there, so "off" maps to "minimal"
    // https://ai.google.dev/gemini-api/docs/thinking
    const modelMatch = /models\/([^/?#]+)/.exec(apiURL);
    const isGemini3 = /^gemini-3/.test(modelMatch?.[1] || "");
    if (thinkingLevel === "off") {
      return {
        thinkingConfig: isGemini3
          ? { thinkingLevel: "minimal" }
          : { thinkingBudget: 0 },
      };
    }
    if (
      thinkingLevel === "low" ||
      thinkingLevel === "medium" ||
      thinkingLevel === "high"
    ) {
      const budgets = { low: 1024, medium: 8192, high: 24576 };
      return {
        thinkingConfig: isGemini3
          ? { thinkingLevel: thinkingLevel }
          : { thinkingBudget: budgets[thinkingLevel] },
      };
    }
    return undefined;
  }

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
      ...(getGenerationConfig()
        ? { generationConfig: getGenerationConfig() }
        : {}),
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
            try {
              // Thought parts (part.thought === true) must not leak into
              // the translation result
              const parts =
                JSON.parse(data).candidates?.[0]?.content?.parts || [];
              result += parts
                .filter((part: any) => !part.thought && part.text)
                .map((part: any) => part.text)
                .join("");
            } catch {
              // Skip invalid JSON - might be a partial chunk
            }
          }
        }

        // Clear timeouts caused by stream transfers
        if (e.target.timeout) {
          e.target.timeout = 0;
        }

        data.result = stripThinkingTags(result);
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
      })
      .addSelectSetting({
        prefKey: "gemini.thinkingLevel",
        nameKey: "service-gemini-dialog-thinkingLevel",
        options: getThinkingLevelOptions(),
      });
  },
};
