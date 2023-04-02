import { getPref, setPref } from "./prefs";
import { getString } from "./locale";
import { updateGPTModel } from "../modules/services/gpt";

export async function gptStatusCallback(status: boolean) {
  const selectedModel = getPref("gptModel");
  const dialog = new ztoolkit.Dialog(2, 1);
  const dialogData: { [key: string | number]: any } = {
    url: getPref("gptUrl"),
    models: getPref("gptModel"),
    temperature: parseFloat(getPref("gptTemperature") as string),
    loadCallback: async () => {
      const doc = dialog.window.document;

      try {
        const models = await updateGPTModel();
        // Due to an unknown bug with Zotero 7, the `<select>` element cannot be properly rendered.
        // Toolkit uses a workaround to render the element, so please do not touch the original element and just replace its inner `<option>` elements.
        // See https://groups.google.com/g/zotero-dev/c/iG763ZlWQ_U
        const modelsSelect = doc.querySelector("#gptModels")!;
        modelsSelect.innerHTML = "";
        ztoolkit.UI.appendElement(
          {
            tag: "fragment",
            children: models.map((model: string) => ({
              tag: "option",
              properties: {
                value: model,
                innerHTML: model,
                selected: model === selectedModel,
              },
            })),
          },
          modelsSelect
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
          gridTemplateColumns: "1fr 4fr",
          rowGap: "10px",
          columnGap: "5px",
        },
        children: [
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "url",
            },
            properties: {
              innerHTML: getString("service.gpt.dialog.url"),
            },
          },
          {
            tag: "input",
            id: "gptUrl",
            attributes: {
              "data-bind": "url",
              "data-prop": "value",
              type: "string",
            },
          },
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
          gridTemplateColumns: "1fr 4fr 1fr",
          rowGap: "5px",
          columnGap: "5px",
          marginTop: "10px",
          justifyContent: "space-between",
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
              textAlign: "center",
            },
            properties: {
              innerHTML: getString("service.gpt.dialog.status.load"),
            },
          },
          {
            tag: "a",
            styles: {
              textDecoration: "none",
            },
            properties: {
              href: "https://gist.github.com/GrayXu/f1b72353b4b0493d51d47f0f7498b67b",
              innerHTML: getString("service.gpt.dialog.help"),
            },
          },
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

        setPref("gptUrl", dialogData.url)
        setPref("gptModel", dialogData.models);
      }
      break;
    default:
      break;
  }
}
