import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

async function gptStatusCallback(
  prefix: "chatGPT" | "azureGPT",
  status: boolean,
) {
  const addonPrefix = prefix.toLocaleLowerCase();
  const dialog = new ztoolkit.Dialog(2, 1);
  const dialogData: { [key: string | number]: any } = {
    endPoint: getPref(`${prefix}.endPoint`),
    model: getPref(`${prefix}.model`),
    temperature: parseFloat(getPref(`${prefix}.temperature`) as string),
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
              for: "model",
            },
            properties: {
              innerHTML: getString(`service-${addonPrefix}-dialog-model`),
            },
          },
          {
            tag: "input",
            id: "gptModel",
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
    .addButton(getString(`service-${addonPrefix}-dialog-help`), "help");

  dialog.open(getString(`service-${addonPrefix}-dialog-title`));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        const temperature = dialogData.temperature;

        if (temperature && temperature >= 0 && temperature <= 2) {
          setPref(`${prefix}.temperature`, dialogData.temperature.toString());
        }

        setPref(`${prefix}.endPoint`, dialogData.endPoint);
        setPref(`${prefix}.model`, dialogData.model);
        setPref(`${prefix}.prompt`, dialogData.prompt);
      }
      break;
    case "help":
      {
        const helpURL = {
          chatGPT:
            "https://gist.github.com/GrayXu/f1b72353b4b0493d51d47f0f7498b67b",
          azureGPT:
            "https://learn.microsoft.com/en-us/azure/ai-services/openai/reference",
        };

        Zotero.launchURL(helpURL[prefix]);
      }
      break;
    default:
      break;
  }
}

export async function chatGPTStatusCallback(status: boolean) {
  const prefix = "chatGPT";
  gptStatusCallback(prefix, status);
}

export async function azureGPTStatusCallback(status: boolean) {
  const prefix = "azureGPT";
  gptStatusCallback(prefix, status);
}
