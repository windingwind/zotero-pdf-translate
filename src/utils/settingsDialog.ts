import {
  getPref,
  PrefKeys,
  PrefKeysWithBooleanValue,
  PrefKeysWithNumberValue,
  PrefKeysWithStringValue,
  setPref,
} from "./prefs";
import { getString } from "./locale";
import { SettingsDialogHelper } from "zotero-plugin-toolkit";
import { FluentMessageId } from "../../typings/i10n";
import { TranslateService } from "../modules/services/base";

export type ConfigField =
  | InputField
  | TextareaField
  | CheckboxField
  | SelectField
  | ButtonField
  | ParamsField;

type DialogFieldBase = {
  /**
   * The fluent key of field name
   *
   */
  nameKey?: FluentMessageId;

  /**
   * The description of this field
   *
   */
  desc?: string;

  /**
   * The pref key of field value
   *
   */
  prefKey?: PrefKeys;

  /**
   * is hidden this field
   *
   * @default true
   */
  hidden?: boolean;
};

type InputField = InputFieldBase | InputFieldText | InputFieldNumber;

type InputFieldBase = DialogFieldBase & {
  inputType?: string;
  placeholder?: string;
};

type InputFieldText = InputFieldBase & {
  prefKey: PrefKeysWithStringValue;
};

type InputFieldNumber = InputFieldBase & {
  // TODO: should not include string here, for compatibility, keep it
  prefKey: PrefKeysWithNumberValue | PrefKeysWithStringValue;
  min?: number;
  max?: number;
  step?: number;
};

type TextareaField = DialogFieldBase & {
  prefKey: PrefKeysWithStringValue;
  placeholder?: string;
};

type CheckboxField = DialogFieldBase & {
  prefKey: PrefKeysWithBooleanValue;
};

type SelectField = DialogFieldBase & {
  prefKey: PrefKeysWithStringValue;
  options: Array<{
    value: string;
    label: string;
  }>;
};

type ButtonField = DialogFieldBase & {
  callback?: () => void;
};

type ParamsField = DialogFieldBase & {
  prefKey: PrefKeysWithStringValue;
};

type Validater = (
  data: Record<PrefKeys, any>,
) => true | string | Promise<true | string>;

/**
 * A restricted interface of {@link ServiceSettingsDialog} that exposes
 * only the setting-adding and validation methods allowed inside
 * {@link TranslateService.config}.
 *
 */
export type AllowedSettingsMethods = Pick<
  ServiceSettingsDialog,
  | "addCheckboxSetting"
  | "addPasswordSetting"
  | "addTextSetting"
  | "addNumberSetting"
  | "addSelectSetting"
  | "addTextAreaSetting"
  | "addCustomParamsSetting"
  | "addButton"
  | "addSetting"
  | "onSave"
>;

class ServiceSettingsDialog extends SettingsDialogHelper {
  constructor() {
    super();
    this.setSettingHandlers(getPref, setPref);
  }

  addTextSetting(field: InputFieldText): AllowedSettingsMethods {
    return this.addSetting(getString(field.nameKey), field.prefKey, {
      tag: "input",
      attributes: {
        type: field.inputType || "text",
        placeholder: field.placeholder || "",
      },
      styles: {
        minWidth: "400px",
      },
    });
  }

  addPasswordSetting(field: InputFieldText): AllowedSettingsMethods {
    return this.addSetting(getString(field.nameKey), field.prefKey, {
      tag: "input",
      attributes: {
        type: "password",
      },
      styles: {
        minWidth: "400px",
      },
    });
  }

  addNumberSetting(field: InputFieldNumber): AllowedSettingsMethods {
    return this.addSetting(getString(field.nameKey), field.prefKey, {
      tag: "input",
      attributes: {
        type: "number",
        min: field.min || 0,
        max: field.max || 100,
        step: field.step || 1,
      },
      styles: {
        minWidth: "400px",
      },
    });
  }

  addCheckboxSetting(field: CheckboxField): AllowedSettingsMethods {
    return this.addSetting(getString(field.nameKey), field.prefKey, {
      tag: "input",
      attributes: {
        type: "checkbox",
      },
      styles: {
        justifySelf: "start",
      },
    });
  }

  addSelectSetting(field: SelectField): AllowedSettingsMethods {
    return this.addSetting(getString(field.nameKey), field.prefKey, {
      tag: "select",
      children: field.options.map(({ label, value }) => ({
        tag: "option",
        properties: {
          innerHTML: label,
          value,
        },
      })),
      styles: {
        minWidth: "400px",
      },
    });
  }

  addTextAreaSetting(field: TextareaField): AllowedSettingsMethods {
    return this.addSetting(getString(field.nameKey), field.prefKey, {
      tag: "textarea",
      attributes: {
        placeholder: field.desc,
        rows: 5,
      },
      styles: {
        minWidth: "400px",
      },
    });
  }

  addCustomParamsSetting(field: ParamsField): AllowedSettingsMethods {
    return this.addButton(getString(field.nameKey), field.prefKey, {
      noClose: true,
      callback(ev) {
        openCustomRequestDialog(field.prefKey);
      },
    });
  }

  validater?: Validater;
  onSaveCallback?: () => void;
  onSave(validate?: Validater) {
    this.validater = validate;
    return this;
  }
}

export async function createServiceSettingsDialog(
  service: TranslateService,
): Promise<void> {
  const dialog = new ServiceSettingsDialog();

  if (service.config) {
    service.config(dialog);
  }

  const { id, helpUrl } = service;
  if (helpUrl) {
    dialog.addButton(getString(`service-dialog-help`), "help", {
      noClose: true,
      callback: async () => {
        await Zotero.launchURL(helpUrl);
      },
    });
  }

  const serviceName = service.name || getString(`service-${id}`);
  dialog
    .addButton(getString(`service-dialog-close`), "close")
    .addAutoSaveButton(getString(`service-dialog-save`), "save", {
      // https://github.com/windingwind/zotero-plugin-toolkit/issues/87
      validate: dialog.validater,
    })

    .open(
      getString(`service-dialog-title`, {
        args: { service: serviceName },
      }),
    );
}

// =======================================================
//             Custom parameters field
//========================================================
const CUSTOM_PARAMS_INPUT_STYLES = {
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
  Object.assign(input.style, CUSTOM_PARAMS_INPUT_STYLES);

  cell.appendChild(input);
  return cell;
}

async function openCustomRequestDialog(prefKey: string) {
  const dialog = new ztoolkit.Dialog(2, 1);

  // Get stored custom parameters or default empty object
  const storedCustomParams = (getPref(prefKey) as string) || "{}";
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
            styles: CUSTOM_PARAMS_INPUT_STYLES,
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
            styles: CUSTOM_PARAMS_INPUT_STYLES,
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
              innerHTML: getString(`service-dialog-custom-request-description`),
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
                    `service-dialog-custom-request-add-param`,
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
    .addButton(getString(`service-dialog-close`), "close")
    .addButton(getString(`service-dialog-save`), "save")
    .open(getString(`service-dialog-custom-request-title`));

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
      setPref(prefKey, JSON.stringify(finalParams));
      break;
    }

    default:
      break;
  }
}
