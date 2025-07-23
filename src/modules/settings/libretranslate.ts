import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

export async function libretranslateStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(2, 1);
  const dialogData: { [key: string | number]: any } = {
    endpoint: getPref("libretranslate.endpoint") || "http://localhost:5000",
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
              innerHTML: getString("service-libretranslate-dialog-endPoint"),
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
    .addButton(getString("service-libretranslate-dialog-save"), "save")
    .addButton(getString("service-libretranslate-dialog-close"), "close")
    .addButton(getString("service-libretranslate-dialog-help"), "help")
    .open(getString("service-libretranslate-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("libretranslate.endpoint", dialogData.endpoint);
      }
      break;
    case "help":
      {
        Zotero.launchURL("https://github.com/LibreTranslate/LibreTranslate");
      }
      break;
    default:
      break;
  }
}
