import { TranslateTask } from "../../utils/task";
import { getPref } from "../../utils/prefs";
import { TranslateService } from "./base";

const translate = <TranslateService["translate"]>async function (data) {
  const apiURL = getPref("gemini.endPoint") as string;

  function transformContent(
    langFrom: string,
    langTo: string,
    sourceText: string,
  ) {
    let prompt = getPref("gemini.prompt") as string;

    // Add paper context if enabled and itemId is available
    if (getPref("attachPaperContext") && data.itemId) {
      const item = Zotero.Items.get(data.itemId);
      const topItem = item ? Zotero.Items.getTopLevel([item])[0] : null;
      if (topItem) {
        let contextInfo = "";
        const title = topItem.getField("title") as string;
        const abstract = topItem.getField("abstractNote") as string;

        if (title) {
          contextInfo += `Paper Title: ${title}`;
        }
        if (abstract) {
          contextInfo += title
            ? `\n\nPaper Abstract: ${abstract}`
            : `Paper Abstract: ${abstract}`;
        }

        if (contextInfo) {
          // Insert context before the source text
          prompt = prompt.replace(
            "${sourceText}",
            `Context from the academic paper:\n${contextInfo}\n\nText to translate: ${sourceText}`,
          );
        }
      }
    }

    return prompt
      .replaceAll("${langFrom}", langFrom)
      .replaceAll("${langTo}", langTo)
      .replaceAll("${sourceText}", sourceText);
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
