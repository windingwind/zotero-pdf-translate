import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

async function gptStatusCallback(
  prefix: "chatGPT" | "customGPT1" | "customGPT2" | "customGPT3" | "azureGPT",
  status: boolean,
) {
  const servicePrefix = prefix === "azureGPT" ? "azuregpt" : "chatgpt";
  const dialog = new ztoolkit.Dialog(2, 1);
  const dialogData: { [key: string | number]: any } = {
    endPoint: getPref(`${prefix}.endPoint`),
    model: getPref(`${prefix}.model`),
    temperature: parseFloat(getPref(`${prefix}.temperature`) as string),
    prompt: getPref(`${prefix}.prompt`),
    apiVersion: getPref("azureGPT.apiVersion"),
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
              innerHTML: getString(`service-${servicePrefix}-dialog-endPoint`),
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
              innerHTML: getString(`service-${servicePrefix}-dialog-model`),
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
              innerHTML: getString(
                `service-${servicePrefix}-dialog-temperature`,
              ),
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
            styles: {
              display: prefix === "azureGPT" ? "" : "none",
            },
            attributes: {
              for: "apiVersion",
            },
            properties: {
              innerHTML: getString(
                `service-${servicePrefix}-dialog-apiVersion`,
              ),
            },
          },
          {
            tag: "input",
            id: "apiVersion",
            styles: {
              display: prefix === "azureGPT" ? "" : "none",
            },
            attributes: {
              "data-bind": "apiVersion",
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
              innerHTML: getString(`service-${servicePrefix}-dialog-prompt`),
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
              innerHTML: "Stream",
            },
          },
          {
            tag: "input",
            id: "stream",
            attributes: {
              type: "checkbox",
              "data-bind": "stream",
              "data-prop": "checked",
            },
            styles: {
              justifySelf: "start",
            },
          },
        ],
      },
      false,
    )
    .addButton(getString(`service-${servicePrefix}-dialog-save`), "save")
    .addButton(getString(`service-${servicePrefix}-dialog-close`), "close")
    .addButton(getString(`service-${servicePrefix}-dialog-help`), "help");

  dialog.open(
    getString(`service-${servicePrefix}-dialog-title`, {
      args: {
        service: prefix,
      },
    }),
  );

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
        setPref(`${prefix}.stream`, dialogData.stream);
        setPref("azureGPT.apiVersion", dialogData.apiVersion);
      }
      break;
    case "help":
      {
        const helpURL = {
          chatGPT:
            "https://gist.github.com/GrayXu/f1b72353b4b0493d51d47f0f7498b67b",
          azureGPT:
            "https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#chat-completions",
        };

        Zotero.launchURL(
          prefix === "azureGPT" ? helpURL.azureGPT : helpURL.chatGPT,
        );
      }
      break;
    default:
      break;
  }
}

export function getLLMStatusCallback(
  prefix: "chatGPT" | "customGPT1" | "customGPT2" | "customGPT3" | "azureGPT",
) {
  return async function (status: boolean) {
    gptStatusCallback(prefix, status);
  };
}
