import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

export async function qwenmtStatusCallback(status: boolean) {
  const prefix = "qwenmt";
  const addonPrefix = prefix;

  const dialog = new ztoolkit.Dialog(2, 1);
  const dialogData: { [key: string | number]: any } = {
    endPoint:
      getPref(`${prefix}.endPoint`) ||
      "https://dashscope.aliyuncs.com/compatible-mode",
    model: getPref(`${prefix}.model`) || "qwen-mt-plus",
    domains: getPref(`${prefix}.domains`) || "",
  };

  dialog
    .setDialogData(dialogData)
    .addCell(
      0,
      0,
      {
        tag: "div",
        namespace: "html",
        styles: {
          display: "grid",
          gridTemplateColumns: "1fr 4fr",
          rowGap: "10px",
          columnGap: "5px",
        },
        children: [
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "endPoint",
            },
            properties: {
              innerHTML: getString(`service-${addonPrefix}-dialog-endPoint`),
            },
          },
          {
            tag: "input",
            id: "endPoint",
            attributes: {
              "data-bind": "endPoint",
              "data-prop": "value",
              type: "string",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "model",
            },
            properties: {
              innerHTML: getString(`service-${addonPrefix}-dialog-model`),
            },
          },
          {
            tag: "input",
            id: "model",
            attributes: {
              "data-bind": "model",
              "data-prop": "value",
              type: "string",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "domains",
            },
            properties: {
              innerHTML: getString(`service-${addonPrefix}-dialog-domains`),
            },
          },
          {
            tag: "input",
            id: "domains",
            attributes: {
              "data-bind": "domains",
              "data-prop": "value",
              type: "string",
            },
          },
        ],
      },
      false,
    )
    .addButton(getString(`service-${addonPrefix}-dialog-save`), "save")
    .addButton(getString(`service-${addonPrefix}-dialog-close`), "close")
    .addButton(getString(`service-${addonPrefix}-dialog-help`), "help")
    .open(getString(`service-${addonPrefix}-dialog-title`));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref(`${prefix}.endPoint`, dialogData.endPoint);
        setPref(`${prefix}.model`, dialogData.model);
        setPref(`${prefix}.domains`, dialogData.domains);
      }
      break;
    case "help":
      {
        Zotero.launchURL(
          "https://help.aliyun.com/zh/model-studio/user-guide/machine-translation/",
        );
      }
      break;
    default:
      break;
  }
}
