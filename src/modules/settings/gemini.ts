import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

async function gptStatusCallback(
  prefix: "gemini",
  status: boolean,
) {
  const addonPrefix = prefix.toLocaleLowerCase();
  const dialog = new ztoolkit.Dialog(2, 1);
  const dialogData: { [key: string | number]: any } = {
    endPoint: getPref(`${prefix}.endPoint`),
    prompt: getPref(`${prefix}.prompt`),
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
              for: "prompt",
            },
            properties: {
              innerHTML: getString(`service-${addonPrefix}-dialog-prompt`),
            },
          },
          {
            tag: "input",
            id: "prompt",
            attributes: {
              "data-bind": "prompt",
              "data-prop": "value",
            },
          },
        ],
      },
      false,
    )
    .addButton(getString(`service-${addonPrefix}-dialog-save`), "save")
    .addButton(getString(`service-${addonPrefix}-dialog-close`), "close")

  dialog.open(getString(`service-${addonPrefix}-dialog-title`));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref(`${prefix}.endPoint`, dialogData.endPoint);
        setPref(`${prefix}.prompt`, dialogData.prompt);
      }
      break;
    default:
      break;
  }
}

export async function geminiStatusCallback(status: boolean) {
  const prefix = "gemini";
  gptStatusCallback(prefix, status);
}

