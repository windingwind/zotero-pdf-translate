import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

export async function renameServicesDialog() {
  const dialog = new ztoolkit.Dialog(4, 1);
  const dialogData: { [key: string | number]: any } = {
    customgpt1: getPref("renameServices.customgpt1"),
    customgpt2: getPref("renameServices.customgpt2"),
    customgpt3: getPref("renameServices.customgpt3"),
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
          gap: "15px 20px",
          alignItems: "center",
          padding: "20px",
        },
        children: [
          {
            tag: "label",
            namespace: "html",
            properties: {
              innerHTML: getString("service-renameServices-head"),
            },
            styles: {
              gridColumn: "1 / span 2",
              marginBottom: "5px",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "customgpt1",
            },
            properties: {
              innerHTML: getString("service-customgpt1"),
            },
          },
          {
            tag: "input",
            id: "customgpt1",
            attributes: {
              "data-bind": "customgpt1",
              "data-prop": "value",
              type: "string",
              placeholder: "Maximum 15 characters",
              maxlength: "15",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "customgpt2",
            },
            properties: {
              innerHTML: getString("service-customgpt2"),
            },
          },
          {
            tag: "input",
            id: "customgpt2",
            attributes: {
              "data-bind": "customgpt2",
              "data-prop": "value",
              type: "string",
              placeholder: "Maximum 15 characters",
              maxlength: "15",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "customgpt3",
            },
            properties: {
              innerHTML: getString("service-customgpt3"),
            },
          },
          {
            tag: "input",
            id: "customgpt3",
            attributes: {
              "data-bind": "customgpt3",
              "data-prop": "value",
              type: "string",
              placeholder: "Maximum 15 characters",
              maxlength: "15",
            },
          },
          {
            tag: "label",
            namespace: "html",
            properties: {
              innerHTML: getString("service-renameServices-hint"),
            },
            styles: {
              gridColumn: "1 / span 2",
              fontSize: "0.9rem",
            },
          },
        ],
      },
      false,
    )
    .addButton(getString("service-renameServices-close"), "close")
    .addButton(getString("service-renameServices-save"), "save")
    .open(getString("service-renameServices-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("renameServices.customgpt1", dialogData.customgpt1);
        setPref("renameServices.customgpt2", dialogData.customgpt2);
        setPref("renameServices.customgpt3", dialogData.customgpt3);
      }
      break;
    default:
      break;
  }
}
