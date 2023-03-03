import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  const xhr = await Zotero.HTTP.request(
    "POST",
    "https://api.openai.com/v1/chat/completions",
    {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${data.secret}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{"role": "user", "content": `Translate this passage from ${data.langfrom.split("-")[0]} to ${data.langto.split("-")[0]}: ${data.raw}`}],
      }),
      responseType: "json",
    }
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  data.result = xhr.response.choices[0].message.content.substr(2);
};
