import { getPref, setPref } from "./prefs";
import { getString } from "./locale";
import { updateGPTModel } from "../modules/services/gpt";

export async function gptStatusCallback(status: boolean) {
  const selectedModel = getPref("gptModel");
  const dialog = new ztoolkit.Dialog(2, 1);
  const dialogData: { [key: string | number]: any } = {
    models: getPref("gptModel"),
    temperature: parseFloat(getPref("gptTemperature") as string),
    loadCallback: async () => {
      const doc = dialog.window.document;

      try {
        const models = await updateGPTModel();
        ztoolkit.UI.replaceElement(
          {
            tag: "select",
            id: "gptModels",
            attributes: {
              "data-bind": "models",
              "data-prop": "value",
            },
            children: models.map((model: string) => ({
              tag: "option",
              properties: {
                value: model,
                innerHTML: model,
                selected: model === selectedModel,
              },
            })),
          },
          doc.querySelector("#gptModels")!
        );

        doc.querySelector("#gptStatus")!.innerHTML = getString(
          "service.gpt.dialog.status.available"
        );
      } catch (error: any) {
        const HTTP = Zotero.HTTP;
        let gptStatus = "unexpect";

        if (error instanceof HTTP.TimeoutException) {
          gptStatus = "timeout";
        } else if (error.xmlhttp?.status === 401) {
          gptStatus = "invalid";
        }

        doc.querySelector("#gptStatus")!.innerHTML = getString(
          `service.gpt.dialog.status.${gptStatus}`
        );
      }
    },
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
          "grid-template-columns": "1fr 4fr",
          "grid-row-gap": "10px",
          "grid-column-gap": "5px",
        },
        children: [
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "models",
            },
            properties: {
              innerHTML: getString("service.gpt.dialog.models"),
            },
          },
          {
            tag: "select",
            id: "gptModels",
            attributes: {
              "data-bind": "models",
              "data-prop": "value",
            },
            children: [
              {
                tag: "option",
                properties: {
                  value: selectedModel,
                  innerHTML: selectedModel,
                },
              },
            ],
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "temperature",
            },
            properties: {
              innerHTML: getString("service.gpt.dialog.temperature"),
            },
          },
          {
            tag: "input",
            id: "temperature",
            attributes: {
              "data-bind": "temperature",
              "data-prop": "value",
              type: "number",
              min: 0,
              max: 2,
              step: 0.1,
            },
          },
        ],
      },
      false
    )
    .addCell(
      1,
      0,
      {
        tag: "div",
        namespace: "html",
        styles: {
          display: "grid",
          "grid-template-columns": "1fr 4fr 1fr",
          "grid-row-gap": "5px",
          "grid-column-gap": "5px",
          "margin-top": "10px",
          "justify-content": "space-between",
        },
        children: [
          {
            tag: "label",
            namespace: "html",
            properties: {
              innerHTML: getString("service.gpt.dialog.status"),
            },
          },
          {
            tag: "label",
            namespace: "html",
            id: "gptStatus",
            styles: {
              "text-align": "center",
            },
            properties: {
              innerHTML: getString("service.gpt.dialog.status.load"),
            },
          },
          {
            tag: "a",
            styles: {
              "text-decoration": "none",
            },
            properties: {
              href: "https://gist.github.com/GrayXu/f1b72353b4b0493d51d47f0f7498b67b",
              innerHTML: getString("service.gpt.dialog.help"),
            },
          },
          ,
        ],
      },
      false
    )
    .addButton(getString("service.gpt.dialog.save"), "save")
    .addButton(getString("service.gpt.dialog.close"), "close");

  dialog.open(getString("service.gpt.dialog.title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        const temperature = dialogData.temperature;

        if (temperature && temperature >= 0 && temperature <= 2) {
          setPref("gptTemperature", dialogData.temperature.toString());
        }

        setPref("gptModel", dialogData.models);
      }
      break;
    default:
      break;
  }
}
