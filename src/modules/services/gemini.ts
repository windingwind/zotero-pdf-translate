import { TranslateTask, TranslateTaskProcessor } from "../../utils/task";
import { getPref } from "../../utils/prefs";

const geminiTranslate = async function (
  apiURL: string,

  data: Required<TranslateTask>,
) {
  function transformContent(
    langFrom: string,
    langTo: string,
    sourceText: string,
  ) {
    return (getPref("gemini.prompt") as string)
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

export const gemini = <TranslateTaskProcessor>async function (data) {
  const apiURL = getPref("gemini.endPoint") as string;

  return await geminiTranslate(apiURL, data);
};
