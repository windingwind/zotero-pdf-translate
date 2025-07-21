import { getPref } from "../../utils/prefs";
import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
  const port = getPref("pot.port");
  const xhr = await Zotero.HTTP.request(
    "POST",
    `http://127.0.0.1:${port}/translate`,
    {
      headers: {
        "content-type": "text/plain;charset=UTF-8",
      },
      body: data.raw,
      responseType: "text",
    },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  // pot will show result in the popup, so we don't need to show it again
  data.result = "";
};
