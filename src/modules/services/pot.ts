import { getPref } from "../../utils/prefs";
import { TranslateService } from "./base";

const translate: TranslateService["translate"] = async (data) => {
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
export const Pot: TranslateService = {
  id: "pot",
  type: "sentence",
  helpUrl: "https://github.com/pot-app/pot-desktop",

  translate,

  config(settings) {
    settings.addNumberSetting({
      prefKey: "pot.port",
      nameKey: "service-pot-dialog-port",
    });
  },

  requireExternalConfig: true,
};
