import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";

export async function deeplxStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(4, 1);
  const dialogData: { [key: string | number]: any } = {
    endpoint: getPref("deeplx.endpoint"),
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
              innerHTML: getString("service-deeplx-dialog-endPoint"),
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
    .addButton(getString("service-deeplx-dialog-save"), "save")
    .addButton(getString("service-deeplx-dialog-close"), "close")
  dialog.open(getString("service-deeplx-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("deeplx.endpoint", dialogData.endpoint);
      }
      break;
    default:
      break;
  }
}
