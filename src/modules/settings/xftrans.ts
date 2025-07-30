import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";

export async function xftransStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(4, 1);
  const dialogData: { [key: string | number]: any } = {
    useNiutrans: getPref("xftrans.useNiutrans"),
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
          gridTemplateColumns: "auto 1fr",
          rowGap: "10px",
          columnGap: "5px",
        },
        children: [
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "translate-engine",
            },
            properties: {
              innerHTML: getString("service-xftrans-dialog-engine"),
            },
            styles: {
              gridColumn: "1 / span 2",
            },
          },
          {
            tag: "input",
            id: "useNiutrans",
            attributes: {
              type: "checkbox",
              "data-bind": "useNiutrans",
              "data-prop": "checked",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "useNiutrans",
            },
            properties: {
              innerHTML: getString("service-xftrans-dialog-useniutrans"),
            },
          },
        ],
      },
      false,
    )
    .addButton(getString("service-xftrans-dialog-save"), "save")
    .addButton(getString("service-xftrans-dialog-close"), "close")
    .addButton(getString("service-xftrans-dialog-help"), "help")
    .open(getString("service-xftrans-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("xftrans.useNiutrans", dialogData.useNiutrans);
      }
      break;
    case "help":
      {
        Zotero.launchURL("https://console.xfyun.cn/services/its");
      }
      break;
    default:
      break;
  }
}
