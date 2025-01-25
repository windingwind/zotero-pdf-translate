import { TranslateTask, TranslateTaskProcessor } from "../../utils/task";
import { getPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

export default <TranslateTaskProcessor>async function (data) {
    const apiURL = getPref("deepseek.endPoint") as string || "https://api.deepseek.com";
    const model = getPref("deepseek.model") as string || "deepseek-chat";
    const temperature = parseFloat(getPref("deepseek.temperature") as string) || 1.3;

    function transformContent(
        langFrom: string,
        langTo: string,
        sourceText: string,
    ) {
        return (getPref("deepseek.prompt") as string)
            .replaceAll("${langFrom}", langFrom)
            .replaceAll("${langTo}", langTo)
            .replaceAll("${sourceText}", sourceText);
    }

    const xhr = await Zotero.HTTP.request("POST", `${apiURL}/v1/chat/completions`, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${data.secret}`,
        },
        body: JSON.stringify({
            model: model,
            temperature: temperature,
            messages: [
                {
                    role: "system",
                    content: transformContent(data.langfrom, data.langto, data.raw),
                }
            ],
        }),
        responseType: "json",
    });

    if (xhr?.status !== 200) {
        throw `Request error: ${xhr?.status}`;
    }

    data.result = xhr.response.choices[0].message.content;
}; 