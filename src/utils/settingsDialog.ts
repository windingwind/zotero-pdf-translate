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
  // For compatibility, includes number and string here
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
  | "addCustomHeadersSetting"
  | "addButton"
  | "addSetting"
  | "addStaticRow"
  | "onSave"
>;

export class ServiceSettingsDialog extends SettingsDialogHelper {
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
    return this.addSetting(
      getString(field.nameKey),
      field.prefKey,
      {
        tag: "input",
        attributes: {
          type: "checkbox",
        },
        styles: {
          justifySelf: "start",
        },
      },
      {
        valueType: "boolean",
      },
    );
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
        // auto resize to window width
        width: "-moz-available",
      },
    });
  }

  addTextAreaSetting(field: TextareaField): AllowedSettingsMethods {
    return this.addSetting(getString(field.nameKey), field.prefKey, {
      tag: "textarea",
      attributes: {
        placeholder: field.placeholder,
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
        openRequestEditorDialog({
          ...CUSTOM_PARAMS_EDITOR,
          prefKey: field.prefKey,
        });
      },
    });
  }

  addCustomHeadersSetting(field: ParamsField): AllowedSettingsMethods {
    return this.addButton(getString(field.nameKey), field.prefKey, {
      noClose: true,
      callback(ev) {
        openRequestEditorDialog({
          ...CUSTOM_HEADERS_EDITOR,
          prefKey: field.prefKey,
        });
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
//          Custom request editor (params & headers)
//========================================================
const CUSTOM_REQUEST_INPUT_STYLES = {
  width: "100%",
  height: "32px",
  padding: "6px 8px",
  boxSizing: "border-box",
  border: "1px solid var(--color-border)",
  borderRadius: "4px",
  fontSize: "1rem",
};

function createParamInputCell(
  doc: Document,
  type: "key" | "value",
  index: number,
  placeholder: string,
  value: string = "",
): HTMLTableCellElement {
  const cell = doc.createElement("td");
  cell.style.padding = "8px";

  const input = doc.createElement("input");
  input.type = "text";
  input.id = `${type}-${index}`;
  input.placeholder = placeholder;
  input.value = value;
  Object.assign(input.style, CUSTOM_REQUEST_INPUT_STYLES);

  cell.appendChild(input);
  return cell;
}

type CustomRequestValidationError = {
  kind: "duplicate" | "empty" | "invalid" | "invalid-name";
  key: string;
  detail?: string;
};

type ParsedCustomRequestResult = {
  values: Record<string, any>;
  errors: CustomRequestValidationError[];
};

function readEditorRows(
  doc: Document,
): Array<{ key: string; rawValue: string }> {
  const rows: Array<{ key: string; rawValue: string }> = [];
  let index = 0;

  while (true) {
    const keyElement = doc.getElementById(`key-${index}`) as HTMLInputElement;
    const valueElement = doc.getElementById(
      `value-${index}`,
    ) as HTMLInputElement;

    if (!keyElement || !valueElement) break;

    rows.push({
      key: keyElement.value.trim(),
      rawValue: valueElement.value.trim(),
    });
    index++;
  }

  return rows;
}

function parseCustomParamsFromDialog(doc: Document): ParsedCustomRequestResult {
  const values: Record<string, any> = {};
  const errors: CustomRequestValidationError[] = [];
  const seenKeys = new Set<string>();

  for (const { key, rawValue } of readEditorRows(doc)) {
    if (!key) continue;

    if (seenKeys.has(key)) {
      errors.push({ kind: "duplicate", key });
      continue;
    }
    seenKeys.add(key);

    if (!rawValue) {
      errors.push({ kind: "empty", key });
      continue;
    }

    try {
      values[key] = JSON.parse(rawValue);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ kind: "invalid", key, detail: msg });
    }
  }

  return { values, errors };
}

// RFC 7230 header field name (token)
const CUSTOM_HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function parseCustomHeadersFromDialog(
  doc: Document,
): ParsedCustomRequestResult {
  const values: Record<string, string> = {};
  const errors: CustomRequestValidationError[] = [];
  const seenKeys = new Set<string>();

  for (const { key, rawValue } of readEditorRows(doc)) {
    if (!key) continue;

    const lowerKey = key.toLowerCase();
    if (seenKeys.has(lowerKey)) {
      errors.push({ kind: "duplicate", key });
      continue;
    }
    seenKeys.add(lowerKey);

    if (!CUSTOM_HEADER_NAME_PATTERN.test(key)) {
      errors.push({ kind: "invalid-name", key });
      continue;
    }

    if (!rawValue) {
      errors.push({ kind: "empty", key });
      continue;
    }

    values[key] = rawValue;
  }

  return { values, errors };
}

function formatCustomParamsValidationMessage(
  errors: CustomRequestValidationError[],
): string {
  const objectExample = '{"enable_thinking": false}';
  const lines = [
    getString("service-dialog-custom-request-validation-summary"),
    "",
    getString("service-dialog-custom-request-validation-errors-head"),
  ];

  for (const error of errors) {
    switch (error.kind) {
      case "duplicate":
        lines.push(
          getString(
            "service-dialog-custom-request-validation-error-duplicate",
            {
              args: { key: error.key },
            },
          ),
        );
        break;
      case "empty":
        lines.push(
          getString("service-dialog-custom-request-validation-error-empty", {
            args: { key: error.key },
          }),
        );
        break;
      case "invalid":
      default:
        lines.push(
          getString("service-dialog-custom-request-validation-error-invalid", {
            args: { key: error.key, detail: error.detail || "" },
          }),
        );
        break;
    }
  }

  lines.push(
    "",
    getString("service-dialog-custom-request-validation-examples-head"),
    getString("service-dialog-custom-request-validation-example-boolean"),
    getString("service-dialog-custom-request-validation-example-number"),
    getString("service-dialog-custom-request-validation-example-string"),
    getString("service-dialog-custom-request-validation-example-object", {
      args: { example: objectExample },
    }),
  );

  return lines.join("\n");
}

function formatCustomHeadersValidationMessage(
  errors: CustomRequestValidationError[],
): string {
  const lines = [
    getString("service-dialog-custom-headers-validation-summary"),
    "",
    getString("service-dialog-custom-headers-validation-errors-head"),
  ];

  for (const error of errors) {
    switch (error.kind) {
      case "duplicate":
        lines.push(
          getString(
            "service-dialog-custom-headers-validation-error-duplicate",
            {
              args: { key: error.key },
            },
          ),
        );
        break;
      case "invalid-name":
        lines.push(
          getString(
            "service-dialog-custom-headers-validation-error-invalid-name",
            {
              args: { key: error.key },
            },
          ),
        );
        break;
      case "empty":
      default:
        lines.push(
          getString("service-dialog-custom-headers-validation-error-empty", {
            args: { key: error.key },
          }),
        );
        break;
    }
  }

  return lines.join("\n");
}

type CustomRequestEditorConfig = {
  /**
   * The pref key storing the edited key-value object as a JSON string.
   */
  prefKey: string;

  /**
   * The fluent keys of the editor texts.
   */
  titleKey: FluentMessageId;
  descriptionKey: FluentMessageId;
  addKey: FluentMessageId;
  nameHeaderKey: FluentMessageId;
  valueHeaderKey: FluentMessageId;
  namePlaceholderKey: FluentMessageId;
  valuePlaceholderKey: FluentMessageId;
  validationTitleKey: FluentMessageId;

  /**
   * Format a stored value for display in the editor.
   */
  formatValue: (value: any) => string;

  /**
   * Parse the editor rows into stored values and validation errors.
   */
  parse: (doc: Document) => ParsedCustomRequestResult;

  /**
   * Format validation errors into the message of the alert dialog.
   */
  formatErrors: (errors: CustomRequestValidationError[]) => string;
};

const CUSTOM_PARAMS_EDITOR: Omit<CustomRequestEditorConfig, "prefKey"> = {
  titleKey: "service-dialog-custom-request-title",
  descriptionKey: "service-dialog-custom-request-description",
  addKey: "service-dialog-custom-request-add-param",
  nameHeaderKey: "service-dialog-custom-request-parameter-name",
  valueHeaderKey: "service-dialog-custom-request-parameter-value",
  namePlaceholderKey:
    "service-dialog-custom-request-parameter-name-placeholder",
  valuePlaceholderKey:
    "service-dialog-custom-request-parameter-value-placeholder",
  validationTitleKey: "service-dialog-custom-request-validation-title",
  formatValue: (value) => JSON.stringify(value),
  parse: parseCustomParamsFromDialog,
  formatErrors: formatCustomParamsValidationMessage,
};

const CUSTOM_HEADERS_EDITOR: Omit<CustomRequestEditorConfig, "prefKey"> = {
  titleKey: "service-dialog-custom-headers-title",
  descriptionKey: "service-dialog-custom-headers-description",
  addKey: "service-dialog-custom-headers-add-header",
  nameHeaderKey: "service-dialog-custom-headers-name",
  valueHeaderKey: "service-dialog-custom-headers-value",
  namePlaceholderKey: "service-dialog-custom-headers-name-placeholder",
  valuePlaceholderKey: "service-dialog-custom-headers-value-placeholder",
  validationTitleKey: "service-dialog-custom-headers-validation-title",
  formatValue: (value) => String(value),
  parse: parseCustomHeadersFromDialog,
  formatErrors: formatCustomHeadersValidationMessage,
};

async function openRequestEditorDialog(
  cfg: CustomRequestEditorConfig,
): Promise<void> {
  const dialog = new ztoolkit.Dialog(2, 1);
  const parameterNameHeader = getString(cfg.nameHeaderKey);
  const parameterValueHeader = getString(cfg.valueHeaderKey);
  const parameterNamePlaceholder = getString(cfg.namePlaceholderKey);
  const parameterValuePlaceholder = getString(cfg.valuePlaceholderKey);

  // Get stored entries or default empty object
  const storedEntries = (getPref(cfg.prefKey) as string) || "{}";
  let storedObject: Record<string, any> = {};
  try {
    storedObject = JSON.parse(storedEntries);
  } catch (e) {
    storedObject = {};
  }

  // Convert to key-value pairs for display
  const keyValuePairs: Array<{ key: string; value: string }> = Object.entries(
    storedObject,
  ).map(([key, value]) => ({
    key,
    value: cfg.formatValue(value),
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
              placeholder: parameterNamePlaceholder,
              value: pair.key || "",
            },
            styles: CUSTOM_REQUEST_INPUT_STYLES,
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
              placeholder: parameterValuePlaceholder,
              value: pair.value || "",
            },
            styles: CUSTOM_REQUEST_INPUT_STYLES,
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
              innerHTML: getString(cfg.descriptionKey),
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
                          innerHTML: parameterNameHeader,
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
                          innerHTML: parameterValueHeader,
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
                  innerHTML: getString(cfg.addKey),
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
                          createParamInputCell(
                            doc,
                            "key",
                            paramIndex,
                            parameterNamePlaceholder,
                          ),
                        );
                        row.appendChild(
                          createParamInputCell(
                            doc,
                            "value",
                            paramIndex,
                            parameterValuePlaceholder,
                          ),
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
    .open(getString(cfg.titleKey));

  await dialogData.unloadLock?.promise;

  switch (dialogData._lastButtonId) {
    case "save": {
      const { values, errors } = cfg.parse(dialog.window.document);

      if (errors.length) {
        Zotero.alert(
          dialog.window,
          getString(cfg.validationTitleKey),
          cfg.formatErrors(errors),
        );
        break;
      }

      setPref(cfg.prefKey, JSON.stringify(values));
      break;
    }

    default:
      break;
  }
}
