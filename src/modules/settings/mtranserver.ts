import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";

export async function mtranserverStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(4, 1);
  const dialogData: { [key: string | number]: any } = {
    endpoint: getPref("mtranserver.endpoint"),
  };
  dialog
    .setDialogData(dialogData)
    .addCell(0, 0, {
      tag: "label",
      namespace: "html",
      attributes: {
        for: "endpoint",
      },
      properties: {
        innerHTML: getString("service-mtranserver-dialog-endPoint"),
      },
    })
    .addCell(1, 0, {
      tag: "input",
      id: "endpoint",
      attributes: {
        "data-bind": "endpoint",
        "data-prop": "value",
      },
    })
    .addButton(getString("service-mtranserver-dialog-save"), "save")
    .addButton(getString("service-mtranserver-dialog-close"), "close")
    .open(getString("service-mtranserver-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("mtranserver.endpoint", dialogData.endpoint);
      }
      break;
    default:
      break;
  }
}
