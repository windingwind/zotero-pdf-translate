import { cnkiStatusCallback } from "./cnki";
import { gptStatusCallback } from "./gpt";
import { niutransStatusCallback } from "./niutrans";

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
  gpt: {
    labels: {
      pass: "service-gpt-secret-pass",
      fail: "service-gpt-secret-fail",
    },
    callback: gptStatusCallback,
  },
  cnki: {
    labels: {
      pass: "service-cnki-settings",
      fail: "service-cnki-settings",
    },
    callback: cnkiStatusCallback,
  },
};
