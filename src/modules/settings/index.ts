import { chatGPTStatusCallback } from "./gpt";

export const secretStatusButtonData: {
  [key: string]: {
    labels: { [_k in "pass" | "fail"]: string };
    callback(status: boolean): void;
  };
} = {
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
  chatgpt: {
    labels: {
      pass: "service-chatgpt-secret-pass",
      fail: "service-chatgpt-secret-fail",
    },
    callback: chatGPTStatusCallback,
  },


};
