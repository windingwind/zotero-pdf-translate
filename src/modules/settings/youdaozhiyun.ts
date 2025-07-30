import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";

export async function youdaozhiyunStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(4, 1);
  const dialogData: { [key: string | number]: any } = {
    domain: getPref("youdaozhiyun.domain"),
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
          gridTemplateColumns: "1fr 3fr",
          rowGap: "10px",
          columnGap: "5px",
          minWidth: "300px",
          minHeight: "160px",
        },
        children: [
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "domain",
            },
            properties: {
              innerHTML: getString("service-youdaozhiyun-dialog-domain"),
            },
          },
          {
            tag: "select",
            id: "domain",
            attributes: {
              "data-bind": "domain",
              "data-prop": "value",
            },
            children: [
              {
                tag: "option",
                properties: {
                  value: "general",
                  innerHTML: "general",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "computers",
                  innerHTML: "computers",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "medicine",
                  innerHTML: "medicine",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "finance",
                  innerHTML: "finance",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "game",
                  innerHTML: "game",
                },
              },
            ],
          },
        ],
      },
      false,
    )
    .addButton(getString("service-youdaozhiyun-dialog-save"), "save")
    .addButton(getString("service-youdaozhiyun-dialog-close"), "close")
    .addButton(getString("service-youdaozhiyun-dialog-help"), "help")
    .open(getString("service-youdaozhiyun-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("youdaozhiyun.domain", dialogData.domain);
      }
      break;
    case "help":
      {
        Zotero.launchURL(
          "https://ai.youdao.com/console/#/service-singleton/text-translation",
        );
      }
      break;
    default:
      break;
  }
}
