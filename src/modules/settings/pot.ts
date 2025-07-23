import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";

export async function potStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(4, 1);
  const dialogData: { [key: string | number]: any } = {
    port: getPref("pot.port") || 60828,
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
              for: "port",
            },
            properties: {
              innerHTML: getString("service-pot-dialog-port"),
            },
          },
          {
            tag: "input",
            id: "port",
            attributes: {
              "data-bind": "port",
              "data-prop": "value",
              type: "string",
            },
          },
        ],
      },
      false,
    )
    .addButton(getString("service-pot-dialog-save"), "save")
    .addButton(getString("service-pot-dialog-close"), "close")
    .addButton(getString("service-pot-dialog-help"), "help");

  dialog.open(getString("service-pot-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("pot.port", dialogData.port);
      }
      break;
    case "help":
      {
        Zotero.launchURL("https://github.com/pot-app/pot-desktop");
      }
      break;
    default:
      break;
  }
}
