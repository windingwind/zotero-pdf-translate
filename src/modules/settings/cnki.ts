import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";

export async function cnkiStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(4, 1);
  const dialogData: { [key: string | number]: any } = {
    removeRegex: getPref("cnkiRegex"),
    useSplit: getPref("cnkiUseSplit"),
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
    .addCell(2, 0, {
      tag: "div",
      namespace: "html",
      styles: {
        display: "grid",
        gridTemplateColumns: "1fr 4fr",
        rowGap: "2px",
      },
      children: [
        {
          tag: "input",
          namespace: "html",
          attributes: {
            type: "checkbox",
            id: "cnkiUseSplit",
            "data-bind": "useSplit",
            "data-prop": "checked",
          },
        },
        {
          tag: "label",
          namespace: "html",
          attributes: {
            for: "cnkiUseSplit",
          },
          properties: {
            innerHTML: getString("service-cnki-dialog-split"),
          },
          styles:{
            textAlign:"left"
          }
        }
      ],
    }, false)
    .addButton(getString("service-cnki-dialog-save"), "save")
    .addButton(getString("service-cnki-dialog-close"), "close")
    .open(getString("service-cnki-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("cnkiRegex", dialogData.removeRegex);
        setPref("cnkiUseSplit", dialogData.useSplit)
      }
      break;
    default:
      break;
  }
}
