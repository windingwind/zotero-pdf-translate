import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";

export async function mtranserverStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(4, 1);
  const dialogData: { [key: string | number]: any } = {
    endpoint:
      getPref("mtranserver.endpoint") || "http://localhost:8989/translate",
    usenewversion: getPref("mtranserver.usenewversion"),
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
              innerHTML: getString("service-mtranserver-dialog-endPoint"),
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
          {
            tag: "input",
            id: "usenewversion",
            attributes: {
              "data-bind": "usenewversion",
              "data-prop": "checked",
              type: "checkbox",
            },
            styles: {
              justifySelf: "end",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "usenewversion",
            },
            properties: {
              innerHTML: getString("service-mtranserver-dialog-useNewVersion"),
            },
          },
        ],
      },
      false,
    )
    .addButton(getString("service-mtranserver-dialog-save"), "save")
    .addButton(getString("service-mtranserver-dialog-close"), "close")
    .addButton(getString("service-mtranserver-dialog-help"), "help")
    .open(getString("service-mtranserver-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("mtranserver.endpoint", dialogData.endpoint);
        setPref("mtranserver.usenewversion", dialogData.usenewversion);
      }
      break;
    case "help":
      {
        Zotero.launchURL(
          "https://github.com/xxnuo/MTranServer?tab=readme-ov-file#api-%E4%BD%BF%E7%94%A8",
        );
      }
      break;
    default:
      break;
  }
}
