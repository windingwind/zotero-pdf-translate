import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";

export async function potStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(4, 1);
  const dialogData: { [key: string | number]: any } = {
    port: getPref("pot.port"),
  };
  dialog
    .setDialogData(dialogData)
    .addCell(0, 0, {
      tag: "label",
      namespace: "html",
      attributes: {
        for: "port",
      },
      properties: {
        innerHTML: getString("service-pot-dialog-port"),
      },
    })
    .addCell(1, 0, {
      tag: "input",
      id: "port",
      attributes: {
        "data-bind": "port",
        "data-prop": "value",
      },
    })
    .addButton(getString("service-pot-dialog-save"), "save")
    .addButton(getString("service-pot-dialog-close"), "close")
    .open(getString("service-pot-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("pot.port", dialogData.port);
      }
      break;
    default:
      break;
  }
}
