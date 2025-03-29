import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

export async function claudeStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(2, 1);
  const dialogData: { [key: string | number]: any } = {
    endPoint: getPref("claude.endPoint"),
    model: getPref("claude.model"),
    temperature: parseFloat(getPref("claude.temperature") as string),
    maxTokens: parseInt(getPref("claude.maxTokens") as string) || 4000,
    prompt: getPref("claude.prompt"),
    stream: getPref("claude.stream"),
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
              innerHTML: getString("service-claude-dialog-endPoint"),
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
              innerHTML: getString("service-claude-dialog-model"),
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
              innerHTML: getString("service-claude-dialog-temperature"),
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
              max: 1,
              step: 0.1,
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "maxTokens",
            },
            properties: {
              innerHTML: getString("service-claude-dialog-maxTokens"),
            },
          },
          {
            tag: "input",
            id: "maxTokens",
            attributes: {
              "data-bind": "maxTokens",
              "data-prop": "value",
              type: "number",
              min: "100",
              max: "100000",
              step: "100",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "prompt",
            },
            properties: {
              innerHTML: getString("service-claude-dialog-prompt"),
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
          },
        ],
      },
      false,
    )
    .addButton(getString("service-claude-dialog-save"), "save")
    .addButton(getString("service-claude-dialog-close"), "close")
    .addButton(getString("service-claude-dialog-help"), "help");

  dialog.open(getString("service-claude-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        const temperature = dialogData.temperature;

        if (temperature && temperature >= 0 && temperature <= 1) {
          setPref("claude.temperature", dialogData.temperature.toString());
        }

        setPref("claude.endPoint", dialogData.endPoint);
        setPref("claude.model", dialogData.model);
        setPref("claude.prompt", dialogData.prompt);
        setPref("claude.stream", dialogData.stream);
        setPref("claude.maxTokens", dialogData.maxTokens.toString());
      }
      break;
    case "help":
      {
        const helpURL = "https://docs.anthropic.com/claude/docs/getting-started-with-the-claude-api";
        _globalThis.Zotero.launchURL(helpURL);
      }
      break;
    default:
      break;
  }
}
