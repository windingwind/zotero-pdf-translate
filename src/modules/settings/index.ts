import { cnkiStatusCallback } from "./cnki";
import { chatGPTStatusCallback, azureGPTStatusCallback } from "./gpt";
import { geminiStatusCallback } from "./gemini";
import { niutransStatusCallback } from "./niutrans";
import { deeplxStatusCallback } from "./deeplx";

export const secretStatusButtonData: {
  [key: string]: {
    labels: { [_k in "pass" | "fail"]: string };
    callback(status: boolean): void;
  };
} = {
  niutranspro: {
    labels: {
      pass: "service-niutranspro-secret-pass",
      fail: "service-niutranspro-secret-fail",
    },
    callback: niutransStatusCallback,
  },
  deeplcustom: {
    labels: {
      pass: "service-deeplcustom-secret-pass",
      fail: "service-deeplcustom-secret-fail",
    },
    callback: function () {
      Zotero.launchURL(
        "https://github.com/KyleChoy/zotero-pdf-translate/blob/CustomDeepL/README.md",
      );
    },
  },
  deeplx: {
    labels: {
      pass: "service-deeplx-secret-pass",
      fail: "service-deeplx-secret-fail",
    },
    callback: deeplxStatusCallback,
  },
  chatgpt: {
    labels: {
      pass: "service-chatgpt-secret-pass",
      fail: "service-chatgpt-secret-fail",
    },
    callback: chatGPTStatusCallback,
  },
  azuregpt: {
    labels: {
      pass: "service-azuregpt-secret-pass",
      fail: "service-azuregpt-secret-fail",
    },
    callback: azureGPTStatusCallback,
  },
  gemini: {
    labels: {
      pass: "service-gemini-secret-pass",
      fail: "service-gemini-secret-fail",
    },
    callback: geminiStatusCallback,
  },
  cnki: {
    labels: {
      pass: "service-cnki-settings",
      fail: "service-cnki-settings",
    },
    callback: cnkiStatusCallback,
  },
};
