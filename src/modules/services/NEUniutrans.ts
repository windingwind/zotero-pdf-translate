import { TranslateTaskProcessor } from "../../utils/task";
export default <TranslateTaskProcessor>async function (data) {
  const xhr = await Zotero.HTTP.request(
    "POST",
    `https://trans.neu.edu.cn/niutrans/textTranslation?apikey=${data.secret}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: data.langfrom.split("-")[0],
        to: data.langto.split("-")[0],
        src_text: data.raw,
      }),
      responseType: "json",
    },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  try {
    for (let i = 0; i < xhr.response.data[0].sentences.length; i++) {
      data.result += xhr.response.data[0].sentences[i].data;
    }
  } catch {
    throw `Service error: ${xhr.response}`;
  }
};
