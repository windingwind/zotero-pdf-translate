import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

async function gptStatusCallback(prefix: "ollama", status: boolean) {
  const addonPrefix = prefix.toLocaleLowerCase();
  const dialog = new ztoolkit.Dialog(2, 1);
  const dialogData: { [key: string | number]: any } = {
    endPoint: getPref(`${prefix}.endPoint`),
    model: getPref(`${prefix}.model`),
    temperature: getPref(`${prefix}.temperature`),
    numCtx: getPref(`${prefix}.numCtx`),
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
          gridTemplateColumns: "1fr 8fr",
          gridTemplateRows: "auto auto auto auto 6fr auto",
          rowGap: "10px",
          columnGap: "5px",
          minWidth: "400px",
          minHeight: "300px",
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
              for: "temperature",
            },
            properties: {
              innerHTML: getString(`service-${addonPrefix}-dialog-temperature`),
            },
          },
          {
            tag: "input",
            id: "temperature",
            attributes: {
              "data-bind": "temperature",
              "data-prop": "value",
              type: "number",
              min: 0,
              max: 2,
              step: 0.1,
            },
          },

          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "numCtx",
            },
            properties: {
              innerHTML: getString(`service-${addonPrefix}-dialog-numCtx`),
            },
          },
          {
            tag: "input",
            id: "numCtx",
            attributes: {
              "data-bind": "numCtx",
              "data-prop": "value",
              type: "number",
              min: 4096,
              max: 131072,
              step: 1,
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
          },
        ],
      },
      false,
    )
    .addButton(getString(`service-${addonPrefix}-dialog-save`), "save")
    .addButton(getString(`service-${addonPrefix}-dialog-close`), "close");

  dialog.open(getString(`service-${addonPrefix}-dialog-title`));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref(`${prefix}.endPoint`, dialogData.endPoint);
        setPref(`${prefix}.model`, dialogData.model);
        setPref(`${prefix}.temperature`, dialogData.temperature);
        setPref(`${prefix}.numCtx`, dialogData.numCtx);
        setPref(`${prefix}.prompt`, dialogData.prompt);
        setPref(`${prefix}.stream`, dialogData.stream);
      }
      break;
    default:
      break;
  }
}

export async function ollamaStatusCallback(status: boolean) {
  const prefix = "ollama";
  gptStatusCallback(prefix, status);
}
