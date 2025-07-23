import { getPrefJSON, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

export async function manageKeysDialog() {
  const dialog = new ztoolkit.Dialog(2, 1);
  const secrets = getPrefJSON("secretObj");

  const dialogData: {
    secrets: string;
    updateSuccess: boolean;
    unloadLock?: any;
    _lastButtonId?: string;
  } = {
    secrets: JSON.stringify(secrets, null, 2),
    updateSuccess: false,
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
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "100%",
          height: "100%",
        },
        children: [
          {
            tag: "label",
            namespace: "html",
            properties: {
              innerHTML: getString("service-manageKeys-head"),
            },
            styles: {
              marginBottom: "5px",
            },
          },
          {
            tag: "textarea",
            namespace: "html",
            attributes: {
              "data-bind": "secrets",
              "data-prop": "value",
              rows: "25",
              cols: "70",
            },
            styles: {
              fontFamily: "monospace",
              whiteSpace: "pre",
              overflowX: "auto",
              padding: "8px",
            },
          },
        ],
      },
      false,
    )
    .addButton(getString("service-manageKeys-save"), "save")
    .addButton(getString("service-manageKeys-close"), "close")
    .open(getString("service-manageKeys-title"));

  if (dialogData.unloadLock && dialogData.unloadLock.promise) {
    try {
      await dialogData.unloadLock.promise;
    } catch (error) {
      console.error("Error waiting for dialog to close:", error);
    }
  }

  if (dialogData._lastButtonId === "save") {
    try {
      const parsedSecrets = JSON.parse(dialogData.secrets);
      setPref("secretObj", JSON.stringify(parsedSecrets));
      dialogData.updateSuccess = true;

      // Refresh UI if needed
      addon.hooks.onReaderTabPanelRefresh();
    } catch (e) {
      if (dialog.window) {
        Zotero.alert(
          dialog.window,
          "Error",
          `Failed to save keys: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  return dialogData.updateSuccess;
}
