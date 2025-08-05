import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

async function gptStatusCallback(prefix: "gemini", status: boolean) {
  const addonPrefix = prefix.toLocaleLowerCase();
  const dialog = new ztoolkit.Dialog(2, 1);
  const dialogData: { [key: string | number]: any } = {
    endPoint: getPref(`${prefix}.endPoint`),
    prompt: getPref(`${prefix}.prompt`),
    stream: getPref(`${prefix}.stream`),
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
          gridTemplateRows: "auto 1fr auto",
          rowGap: "10px",
          columnGap: "5px",
          minWidth: "400px",
          minHeight: "200px",
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
            tag: "textarea",
            id: "prompt",
            attributes: {
              "data-bind": "prompt",
              "data-prop": "value",
            },
          },

          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "stream",
            },
            properties: {
              innerHTML: getString(`service-${addonPrefix}-dialog-stream`),
            },
          },
          {
            tag: "input",
            id: "stream",
            attributes: {
              "data-bind": "stream",
              "data-prop": "checked",
              type: "checkbox",
            },
            styles: {
              justifySelf: "start",
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
        setPref(`${prefix}.prompt`, dialogData.prompt);
        setPref(`${prefix}.stream`, dialogData.stream);
      }
      break;
    case "help":
      {
        Zotero.launchURL("https://ai.google.dev/gemini-api/docs");
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
