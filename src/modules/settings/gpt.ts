import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

const INPUT_STYLES = {
  width: "100%",
  height: "32px",
  padding: "6px 8px",
  boxSizing: "border-box",
  border: "1px solid var(--color-border)",
  borderRadius: "4px",
};

function createParamInputCell(
  doc: Document,
  type: "key" | "value",
  index: number,
  value: string = "",
): HTMLTableCellElement {
  const cell = doc.createElement("td");
  cell.style.padding = "8px";

  const input = doc.createElement("input");
  input.type = "text";
  input.id = `${type}-${index}`;
  input.placeholder =
    type === "key" ? "Parameter name" : "Parameter value (JSON format)";
  input.value = value;
  Object.assign(input.style, INPUT_STYLES);

  cell.appendChild(input);
  return cell;
}

async function openCustomRequestDialog(
  prefix: "chatGPT" | "customGPT1" | "customGPT2" | "customGPT3" | "azureGPT",
) {
  const servicePrefix = prefix === "azureGPT" ? "azuregpt" : "chatgpt";
  const dialog = new ztoolkit.Dialog(2, 1);

  // Get stored custom parameters or default empty object
  const storedCustomParams =
    (getPref(`${prefix}.customParams`) as string) || "{}";
  let customParams: Record<string, any> = {};
  try {
    customParams = JSON.parse(storedCustomParams);
  } catch (e) {
    customParams = {};
  }

  // Convert to key-value pairs for display
  const keyValuePairs: Array<{ key: string; value: string }> = Object.entries(
    customParams,
  ).map(([key, value]) => ({
    key,
    value: JSON.stringify(value),
  }));

  // Add empty pair for new entries
  keyValuePairs.push({ key: "", value: "" });

  const dialogData: { [key: string | number]: any } = {
    customParams: keyValuePairs,
  };

  let paramIndex = keyValuePairs.length;

  const createTableRow = (
    pair: { key: string; value: string },
    index: number,
  ) => ({
    tag: "tr",
    namespace: "html",
    children: [
      {
        tag: "td",
        namespace: "html",
        styles: { padding: "8px" },
        children: [
          {
            tag: "input",
            namespace: "html",
            id: `key-${index}`,
            attributes: {
              type: "text",
              placeholder: "Parameter name",
              value: pair.key || "",
            },
            styles: INPUT_STYLES,
          },
        ],
      },
      {
        tag: "td",
        namespace: "html",
        styles: { padding: "8px" },
        children: [
          {
            tag: "input",
            namespace: "html",
            id: `value-${index}`,
            attributes: {
              type: "text",
              placeholder: "Parameter value (JSON format)",
              value: pair.value || "",
            },
            styles: INPUT_STYLES,
          },
        ],
      },
    ],
  });

  const createTableRows = () => {
    return keyValuePairs.map((pair, index) => createTableRow(pair, index));
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
          width: "600px",
          height: "400px",
          maxWidth: "90vw",
          maxHeight: "80vh",
          minWidth: "500px",
          minHeight: "300px",
          overflowY: "auto",
          padding: "15px",
          resize: "both",
        },
        children: [
          {
            tag: "p",
            namespace: "html",
            styles: {
              marginBottom: "15px",
            },
            properties: {
              innerHTML: getString(
                `service-${servicePrefix}-dialog-custom-request-description`,
              ),
            },
          },
          {
            tag: "table",
            namespace: "html",
            id: "custom-params-table",
            styles: {
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "10px",
            },
            children: [
              {
                tag: "thead",
                namespace: "html",
                children: [
                  {
                    tag: "tr",
                    namespace: "html",
                    children: [
                      {
                        tag: "th",
                        namespace: "html",
                        styles: {
                          textAlign: "left",
                          padding: "10px 8px",
                          borderBottom: "2px solid var(--color-border)",
                          backgroundColor: "var(--color-menu)",
                          fontWeight: "bold",
                        },
                        properties: {
                          innerHTML: "Parameter Name",
                        },
                      },
                      {
                        tag: "th",
                        namespace: "html",
                        styles: {
                          textAlign: "left",
                          padding: "10px 8px",
                          borderBottom: "2px solid var(--color-border)",
                          backgroundColor: "var(--color-menu)",
                          fontWeight: "bold",
                        },
                        properties: {
                          innerHTML: "Parameter Value",
                        },
                      },
                    ],
                  },
                ],
              },
              {
                tag: "tbody",
                namespace: "html",
                id: "custom-params-tbody",
                children: createTableRows(),
              },
            ],
          },
          {
            tag: "div",
            namespace: "html",
            styles: {
              marginTop: "15px",
              display: "flex",
              justifyContent: "flex-start",
            },
            children: [
              {
                tag: "a",
                namespace: "html",
                id: "custom-add-param-btn",
                attributes: {
                  href: "#",
                },
                styles: {
                  color: "var(--fill-primary, #2ea8e5)",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "13px",
                },
                properties: {
                  innerHTML: getString(
                    `service-${servicePrefix}-dialog-add-param`,
                  ),
                },
                listeners: [
                  {
                    type: "click",
                    listener: (e: Event) => {
                      e.preventDefault();
                      const doc = (e.target as HTMLElement).ownerDocument;
                      const tbody = doc.getElementById("custom-params-tbody");
                      if (tbody) {
                        const row = doc.createElement("tr");
                        row.appendChild(
                          createParamInputCell(doc, "key", paramIndex),
                        );
                        row.appendChild(
                          createParamInputCell(doc, "value", paramIndex),
                        );
                        tbody.appendChild(row);
                        paramIndex++;
                      }
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      false,
    )
    .addButton(getString(`service-${servicePrefix}-dialog-close`), "close")
    .addButton(getString(`service-${servicePrefix}-dialog-save`), "save")
    .open(getString(`service-${servicePrefix}-dialog-custom-request-title`));

  await dialogData.unloadLock?.promise;

  switch (dialogData._lastButtonId) {
    case "save": {
      // Collect and save custom parameters from all existing input fields
      const finalParams: Record<string, any> = {};
      let index = 0;

      // Loop through all possible input fields
      while (true) {
        const keyElement = dialog.window.document.getElementById(
          `key-${index}`,
        ) as HTMLInputElement;
        const valueElement = dialog.window.document.getElementById(
          `value-${index}`,
        ) as HTMLInputElement;

        if (!keyElement || !valueElement) break;

        if (keyElement.value.trim()) {
          try {
            finalParams[keyElement.value] = JSON.parse(valueElement.value);
          } catch (e) {
            finalParams[keyElement.value] = valueElement.value;
          }
        }
        index++;
      }
      setPref(`${prefix}.customParams`, JSON.stringify(finalParams));
      break;
    }

    default:
      break;
  }
}

async function gptStatusCallback(
  prefix: "chatGPT" | "customGPT1" | "customGPT2" | "customGPT3" | "azureGPT",
) {
  const servicePrefix = prefix === "azureGPT" ? "azuregpt" : "chatgpt";
  const dialog = new ztoolkit.Dialog(2, 1);
  const dialogData: { [key: string | number]: any } = {
    endPoint: getPref(`${prefix}.endPoint`),
    model: getPref(`${prefix}.model`),
    temperature: parseFloat(getPref(`${prefix}.temperature`) as string),
    prompt: getPref(`${prefix}.prompt`),
    apiVersion: getPref("azureGPT.apiVersion"),
    stream: getPref(`${prefix}.stream`),
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
          minWidth: "400px",
          minHeight: "200px",
        },
        children: [
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "endPoint",
            },
            properties: {
              innerHTML: getString(`service-${servicePrefix}-dialog-endPoint`),
            },
          },
          {
            tag: "input",
            id: "endPoint",
            attributes: {
              "data-bind": "endPoint",
              "data-prop": "value",
              type: "string",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "model",
            },
            properties: {
              innerHTML: getString(`service-${servicePrefix}-dialog-model`),
            },
          },
          {
            tag: "input",
            id: "gptModel",
            attributes: {
              "data-bind": "model",
              "data-prop": "value",
              type: "string",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "temperature",
            },
            properties: {
              innerHTML: getString(
                `service-${servicePrefix}-dialog-temperature`,
              ),
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
          {
            tag: "label",
            namespace: "html",
            styles: {
              display: prefix === "azureGPT" ? "" : "none",
            },
            attributes: {
              for: "apiVersion",
            },
            properties: {
              innerHTML: getString(
                `service-${servicePrefix}-dialog-apiVersion`,
              ),
            },
          },
          {
            tag: "input",
            id: "apiVersion",
            styles: {
              display: prefix === "azureGPT" ? "" : "none",
            },
            attributes: {
              "data-bind": "apiVersion",
              "data-prop": "value",
              type: "string",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "prompt",
            },
            properties: {
              innerHTML: getString(`service-${servicePrefix}-dialog-prompt`),
            },
          },
          {
            tag: "textarea",
            id: "prompt",
            attributes: {
              "data-bind": "prompt",
              "data-prop": "value",
            },
          },
          {
            tag: "label",
            namespace: "html",
            attributes: {
              for: "stream",
            },
            properties: {
              innerHTML: "Stream",
            },
          },
          {
            tag: "input",
            id: "stream",
            attributes: {
              type: "checkbox",
              "data-bind": "stream",
              "data-prop": "checked",
            },
            styles: {
              justifySelf: "start",
            },
          },
        ],
      },
      false,
    )
    .addButton(getString(`service-${servicePrefix}-dialog-close`), "close")
    .addButton(getString(`service-${servicePrefix}-dialog-help`), "help")
    .addButton(
      getString(`service-${servicePrefix}-dialog-custom-request`),
      "customRequest",
    )
    .addButton(getString(`service-${servicePrefix}-dialog-save`), "save");

  dialog.open(
    getString(`service-${servicePrefix}-dialog-title`, {
      args: {
        service: prefix,
      },
    }),
  );

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "save":
      {
        const temperature = dialogData.temperature;

        if (temperature && temperature >= 0 && temperature <= 2) {
          setPref(`${prefix}.temperature`, dialogData.temperature.toString());
        }

        setPref(`${prefix}.endPoint`, dialogData.endPoint);
        setPref(`${prefix}.model`, dialogData.model);
        setPref(`${prefix}.prompt`, dialogData.prompt);
        setPref(`${prefix}.stream`, dialogData.stream);
        setPref("azureGPT.apiVersion", dialogData.apiVersion);
      }
      break;
    case "help":
      {
        const helpURL = {
          chatGPT:
            "https://gist.github.com/GrayXu/f1b72353b4b0493d51d47f0f7498b67b",
          azureGPT:
            "https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#chat-completions",
        };

        Zotero.launchURL(
          prefix === "azureGPT" ? helpURL.azureGPT : helpURL.chatGPT,
        );
      }
      break;
    case "customRequest":
      {
        await openCustomRequestDialog(prefix);
      }
      break;
    default:
      break;
  }
}

export function getLLMStatusCallback(
  prefix: "chatGPT" | "customGPT1" | "customGPT2" | "customGPT3" | "azureGPT",
) {
  return async function () {
    gptStatusCallback(prefix);
  };
}
