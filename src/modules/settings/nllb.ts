import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";

export async function nllbStatusCallback(status: boolean) {
  const dialog = new ztoolkit.Dialog(4, 1);
  const dialogData: { [key: string | number]: any } = {
    model: getPref("nllb.model"),
    apiendpoint: getPref("nllb.apiendpoint") || "http://localhost:7860",
    apistream: getPref("nllb.apistream") as boolean,
    serveendpoint: getPref("nllb.serveendpoint") || "http://localhost:6060",
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
          gridTemplateColumns: "1fr 2fr",
          gridTemplateRows: "1fr auto auto auto",
          rowGap: "10px",
          columnGap: "5px",
        },
        children: [
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "model",
            },
            properties: {
              innerHTML: getString("service-nllb-dialog-model"),
            },
            styles: {
              marginBottom: "12px",
            },
          },
          {
            tag: "select",
            id: "model",
            attributes: {
              "data-bind": "model",
              "data-prop": "value",
            },
            children: [
              {
                tag: "option",
                properties: {
                  value: "nllb-api",
                  innerHTML: "nllb-api API",
                },
              },
              {
                tag: "option",
                properties: {
                  value: "nllb-serve",
                  innerHTML: "nllb-serve REST API",
                },
              },
            ],
            styles: {
              marginBottom: "12px",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "apiendpoint",
            },
            properties: {
              innerHTML: getString("service-nllb-dialog-apiendpoint"),
            },
          },
          {
            tag: "input",
            id: "apiendpoint",
            attributes: {
              "data-bind": "apiendpoint",
              "data-prop": "value",
              type: "string",
            },
          },
          {
            tag: "input",
            id: "apistream",
            attributes: {
              "data-bind": "apistream",
              "data-prop": "checked",
              type: "checkbox",
            },
            styles: {
              justifySelf: "end",
              marginBottom: "12px",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "apistream",
            },
            properties: {
              innerHTML: getString("service-nllb-dialog-apistream"),
            },
            styles: {
              marginBottom: "12px",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "serveendpoint",
            },
            properties: {
              innerHTML: getString("service-nllb-dialog-serveendpoint"),
            },
          },
          {
            tag: "input",
            id: "serveendpoint",
            attributes: {
              "data-bind": "serveendpoint",
              "data-prop": "value",
              type: "string",
            },
          },
        ],
      },
      false,
    )
    .addButton(getString("service-nllb-dialog-save"), "save")
    .addButton(getString("service-nllb-dialog-close"), "close")
    .addButton("nllb-api Docs", "api")
    .addButton("nllb-serve Docs", "serve")
    .open(getString("service-nllb-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        setPref("nllb.model", dialogData.model);
        setPref("nllb.apiendpoint", dialogData.apiendpoint);
        setPref("nllb.apistream", dialogData.apistream);
        setPref("nllb.serveendpoint", dialogData.serveendpoint);
      }
      break;
    case "api":
      {
        Zotero.launchURL(
          "https://github.com/winstxnhdw/nllb-api?tab=readme-ov-file#self-hosting",
        );
      }
      break;
    case "serve":
      {
        Zotero.launchURL(
          "https://github.com/thammegowda/nllb-serve?tab=readme-ov-file#nllb-serve",
        );
      }
      break;
    default:
      break;
  }
}
