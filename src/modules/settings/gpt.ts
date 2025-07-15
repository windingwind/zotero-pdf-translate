import { getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

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

  const createTableRows = () => {
    const rows: any[] = [];
    keyValuePairs.forEach((pair, index) => {
      rows.push({
        tag: "tr",
        namespace: "html",
        children: [
          {
            tag: "td",
            namespace: "html",
            styles: {
              padding: "8px",
            },
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
                styles: {
                  width: "100%",
                  height: "32px",
                  padding: "6px 8px",
                  boxSizing: "border-box",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                },
              },
            ],
          },
          {
            tag: "td",
            namespace: "html",
            styles: {
              padding: "8px",
            },
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
                styles: {
                  width: "100%",
                  height: "32px",
                  padding: "6px 8px",
                  boxSizing: "border-box",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                },
              },
            ],
          },
        ],
      });
    });
    return rows;
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
                          borderBottom: "2px solid #ddd",
                          backgroundColor: "#f5f5f5",
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
                          borderBottom: "2px solid #ddd",
                          backgroundColor: "#f5f5f5",
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
        ],
      },
      false,
    )
    .addButton(
      getString(`service-${servicePrefix}-dialog-add-param`),
      "addParam",
    )
    .addButton(getString(`service-${servicePrefix}-dialog-close`), "close")
    .addButton(getString(`service-${servicePrefix}-dialog-save`), "save");

  dialog.open(
    getString(`service-${servicePrefix}-dialog-custom-request-title`),
  );

  // Override button behavior after dialog opens
  const setupAddButton = () => {
    const buttons = dialog.window.document.querySelectorAll("button");
    const addParamText = getString(
      `service-${servicePrefix}-dialog-add-param`,
    );
    
    buttons.forEach((button) => {
      const buttonText = button.textContent?.trim();
      if (buttonText === addParamText) {
        // Remove existing listeners and prevent default behavior
        const newButton = button.cloneNode(true) as HTMLButtonElement;
        button.parentNode?.replaceChild(newButton, button);

        newButton.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const tbody = dialog.window.document.getElementById(
            "custom-params-tbody",
          );
          if (tbody) {
            const row = dialog.window.document.createElement("tr");

            const keyCell = dialog.window.document.createElement("td");
            keyCell.style.padding = "8px";
            const keyInput = dialog.window.document.createElement("input");
            keyInput.type = "text";
            keyInput.id = `key-${paramIndex}`;
            keyInput.placeholder = "Parameter name";
            keyInput.style.width = "100%";
            keyInput.style.height = "32px";
            keyInput.style.padding = "6px 8px";
            keyInput.style.boxSizing = "border-box";
            keyInput.style.border = "1px solid #ccc";
            keyInput.style.borderRadius = "4px";
            keyCell.appendChild(keyInput);

            const valueCell = dialog.window.document.createElement("td");
            valueCell.style.padding = "8px";
            const valueInput = dialog.window.document.createElement("input");
            valueInput.type = "text";
            valueInput.id = `value-${paramIndex}`;
            valueInput.placeholder = "Parameter value (JSON format)";
            valueInput.style.width = "100%";
            valueInput.style.height = "32px";
            valueInput.style.padding = "6px 8px";
            valueInput.style.boxSizing = "border-box";
            valueInput.style.border = "1px solid #ccc";
            valueInput.style.borderRadius = "4px";
            valueCell.appendChild(valueInput);

            row.appendChild(keyCell);
            row.appendChild(valueCell);
            tbody.appendChild(row);
            paramIndex++;
          }

          return false;
        });
      }
    });
  };

  // Try multiple times to ensure DOM is ready
  setTimeout(setupAddButton, 50);
  setTimeout(setupAddButton, 200);
  setTimeout(setupAddButton, 500);

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
  status: boolean,
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
  return async function (status: boolean) {
    gptStatusCallback(prefix, status);
  };
}
