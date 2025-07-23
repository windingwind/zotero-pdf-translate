import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";

export async function deeplcustomStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(4, 1);
  const dialogData: { [key: string | number]: any } = {
    endpoint:
      getPref("deeplcustom.endpoint") || "http://127.0.0.1:8080/translate",
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
          minWidth: "300px",
        },
        children: [
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "endpoint",
            },
            properties: {
              innerHTML: getString("service-deeplcustom-dialog-endPoint"),
            },
          },
          {
            tag: "input",
            id: "endpoint",
            attributes: {
              "data-bind": "endpoint",
              "data-prop": "value",
              type: "string",
            },
          },
        ],
      },
      false,
    )
    .addButton(getString("service-deeplcustom-dialog-save"), "save")
    .addButton(getString("service-deeplcustom-dialog-close"), "close")
    .addButton(getString("service-deeplcustom-dialog-help"), "help")
    .open(getString("service-deeplcustom-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("deeplcustom.endpoint", dialogData.endpoint);
      }
      break;
    case "help":
      {
        Zotero.launchURL(
          "https://github.com/KyleChoy/zotero-pdf-translate/blob/CustomDeepL/README.md",
        );
      }
      break;
    default:
      break;
  }
}
