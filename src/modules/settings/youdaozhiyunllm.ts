import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";

export async function youdaozhiyunllmStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(4, 1);
  const dialogData: { [key: string | number]: any } = {
    model: getPref("youdaozhiyunllm.model"),
    prompt: getPref("youdaozhiyunllm.prompt"),
    stream: getPref("youdaozhiyunllm.stream"),
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
          minWidth: "300px",
        },
        children: [
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "model",
            },
            properties: {
              innerHTML: getString("service-youdaozhiyunllm-dialog-model"),
            },
          },
          {
            tag: "select",
            id: "model",
            attributes: {
              "data-bind": "model",
              "data-prop": "value",
            },
            children: [
              {
                tag: "option",
                properties: {
                  value: "0",
                  innerHTML: getString("service-youdaozhiyunllm-dialog-pro"),
                },
              },
              {
                tag: "option",
                properties: {
                  value: "3",
                  innerHTML: getString("service-youdaozhiyunllm-dialog-lite"),
                },
              },
            ],
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "prompt",
            },
            properties: {
              innerHTML: getString("service-youdaozhiyunllm-dialog-prompt"),
            },
          },
          {
            tag: "textarea",
            id: "prompt",
            attributes: {
              "data-bind": "prompt",
              "data-prop": "value",
              placeholder: "Maximum 1200 characters or 400 words",
              maxlength: "1200",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "stream",
            },
            properties: {
              innerHTML: getString("service-youdaozhiyunllm-dialog-stream"),
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
    .addButton(getString("service-youdaozhiyunllm-dialog-save"), "save")
    .addButton(getString("service-youdaozhiyunllm-dialog-close"), "close")
    .addButton(getString("service-youdaozhiyunllm-dialog-help"), "help")
    .open(getString("service-youdaozhiyunllm-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("youdaozhiyunllm.model", dialogData.model);
        setPref("youdaozhiyunllm.prompt", dialogData.prompt);
        setPref("youdaozhiyunllm.stream", dialogData.stream);
      }
      break;
    case "help":
      {
        Zotero.launchURL(
          "https://ai.youdao.com/console/#/service-singleton/llm_translate",
        );
      }
      break;
    default:
      break;
  }
}
