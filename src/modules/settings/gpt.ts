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

  // Settings handlers
  const getSetting = (key: string) => {
    if (key === "apiVersion" && prefix === "azureGPT") {
      return getPref("azureGPT.apiVersion");
    }
    return getPref(`${prefix}.${key}`);
  };

  const setSetting = (key: string, value: any) => {
    if (key === "apiVersion" && prefix === "azureGPT") {
      setPref("azureGPT.apiVersion", value);
    } else {
      setPref(`${prefix}.${key}`, value);
    }
  };

  const settingsDialog = new ztoolkit.SettingsDialog()
    .setSettingHandlers(getSetting, setSetting)
    // Add settings for the main GPT configuration
    .addSetting(
      getString(`service-${servicePrefix}-dialog-endPoint`),
      "endPoint",
      {
        tag: "input",
        attributes: {
          type: "text",
          placeholder: "https://api.openai.com/v1",
        },
      },
    )
    .addSetting(getString(`service-${servicePrefix}-dialog-model`), "model", {
      tag: "input",
      attributes: {
        type: "text",
        placeholder: "gpt-3.5-turbo",
      },
    })
    .addSetting(
      getString(`service-${servicePrefix}-dialog-temperature`),
      "temperature",
      {
        tag: "input",
        attributes: {
          type: "number",
          min: "0",
          max: "2",
          step: "0.1",
        },
      },
      { valueType: "number" },
    )
    .addSetting(
      getString(`service-${servicePrefix}-dialog-apiVersion`),
      "apiVersion",
      {
        tag: "input",
        attributes: {
          type: "text",
          placeholder: "2024-02-15-preview",
        },
      },
      {
        // Add API Version field only for Azure GPT
        condition: () => prefix === "azureGPT",
      },
    )
    .addSetting(getString(`service-${servicePrefix}-dialog-prompt`), "prompt", {
      tag: "textarea",
      attributes: {
        rows: "5",
        placeholder: "Enter your system prompt...",
      },
    })
    .addSetting(
      "Stream",
      "stream",
      {
        tag: "input",
        attributes: {
          type: "checkbox",
        },
      },
      { valueType: "boolean" },
    )
    // Add control buttons
    .addAutoSaveButton(
      getString(`service-${servicePrefix}-dialog-save`),
      "save",
      {
        validate: () => {
          // Validation for temperature
          const temperature = getSetting("temperature");
          const tempNum =
            typeof temperature === "string"
              ? parseFloat(temperature)
              : Number(temperature);
          if (!isNaN(tempNum) && (tempNum < 0 || tempNum > 2)) {
            return "Temperature must be between 0 and 2";
          }
          return true;
        },
        callback: () => {},
      },
    )
    .addButton(getString(`service-${servicePrefix}-dialog-help`), "help", {
      noClose: true,
      callback: () => {
        const helpURL = {
          chatGPT:
            "https://gist.github.com/GrayXu/f1b72353b4b0493d51d47f0f7498b67b",
          azureGPT:
            "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/reference#chat-completions",
        };

        Zotero.launchURL(
          prefix === "azureGPT" ? helpURL.azureGPT : helpURL.chatGPT,
        );
      },
    })
    .addButton(
      getString(`service-${servicePrefix}-dialog-custom-request`),
      "customRequest",
      {
        noClose: true,
        callback: () => {
          openCustomRequestDialog(prefix);
        },
      },
    )
    .addButton(getString(`service-${servicePrefix}-dialog-close`), "close");

  settingsDialog.open(
    getString(`service-${servicePrefix}-dialog-title`, {
      args: {
        service: prefix,
      },
    }),
    {
      centerscreen: true,
      resizable: true,
      fitContent: true,
    },
  );
}

export function getLLMStatusCallback(
  prefix: "chatGPT" | "customGPT1" | "customGPT2" | "customGPT3" | "azureGPT",
) {
  return async function () {
    gptStatusCallback(prefix);
  };
}
