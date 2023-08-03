import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";

export async function cnkiStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(2, 1);
  const dialogData: { [key: string | number]: any } = {
    removeRegex: getPref("cnkiRegex"),
  };
  dialog
    .setDialogData(dialogData)
    .addCell(0, 0, {
      tag: "label",
      namespace: "html",
      attributes: {
        for: "regex",
      },
      properties: {
        innerHTML: getString("service-cnki-dialog-regex"),
      },
    })
    .addCell(1, 0, {
      tag: "input",
      id: "regex",
      attributes: {
        "data-bind": "removeRegex",
        "data-prop": "value",
      },
    })
    .addButton(getString("service-cnki-dialog-save"), "save")
    .addButton(getString("service-cnki-dialog-close"), "close")
    .open(getString("service-cnki-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("cnkiRegex", dialogData.removeRegex);
      }
      break;
    default:
      break;
  }
}
