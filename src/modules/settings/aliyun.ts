import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

export async function aliyunStatusCallback(status: boolean) {
  const prefix = "aliyun";
  const addonPrefix = prefix;
  const dialog = new ztoolkit.Dialog(2, 1);
  const dialogData: { [key: string | number]: any } = {
    action: getPref(`${prefix}.action`),
    scene: getPref(`${prefix}.scene`),
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
              for: "action",
            },
            properties: {
              innerHTML: getString(`service-${addonPrefix}-dialog-action`),
            },
          },
          {
            tag: "input",
            id: "action",
            attributes: {
              "data-bind": "action",
              "data-prop": "value",
              type: "string",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "scene",
            },
            properties: {
              innerHTML: getString(`service-${addonPrefix}-dialog-scene`),
            },
          },
          {
            tag: "input",
            id: "scene",
            attributes: {
              "data-bind": "scene",
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
    .addButton(getString(`service-${addonPrefix}-dialog-help`), "help");

  dialog.open(getString(`service-${addonPrefix}-dialog-title`));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref(`${prefix}.action`, dialogData.action);
        setPref(`${prefix}.scene`, dialogData.scene);
      }
      break;
    case "help":
      {
        Zotero.launchURL(
          "https://help.aliyun.com/zh/machine-translation/developer-reference/api-overview-1",
        );
      }
      break;
    default:
      break;
  }
}
