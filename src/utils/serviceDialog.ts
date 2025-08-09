import {
  getPref,
  PrefKeys,
  PrefKeysWithBooleanValue,
  PrefKeysWithNumberValue,
  PrefKeysWithStringValue,
  setPref,
} from "./prefs";
import { getString } from "./locale";
import { TagElementProps } from "zotero-plugin-toolkit";
import { FluentMessageId } from "../../typings/i10n";

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
  type: "input";
  inputType?: string;
  placeholder?: string;
};

type InputFieldText = InputFieldBase & {
  inputType: "text" | "password";
  prefKey: PrefKeysWithStringValue;
};

type InputFieldNumber = InputFieldBase & {
  inputType: "number";
  prefKey: PrefKeysWithNumberValue;
  min?: number;
  max?: number;
  step?: number;
};

type TextareaField = DialogFieldBase & {
  type: "textarea";
  prefKey: PrefKeysWithStringValue;
  placeholder?: string;
};

type CheckboxField = DialogFieldBase & {
  type: "checkbox";
  prefKey: PrefKeysWithBooleanValue;
};

type SelectField = DialogFieldBase & {
  type: "select";
  prefKey: PrefKeysWithStringValue;
  options: Array<{
    value: string;
    label: string;
  }>;
};

type ButtonField = DialogFieldBase & {
  type: "button";
  callback?: () => void;
};

type ParamsField = DialogFieldBase & {
  type: "params";
  prefKey: PrefKeysWithStringValue;
};

function createParamsField(field: ParamsField, id: string) {
  // TODO: Implemented Custom Params Field
  const root: TagElementProps = {
    tag: "div",
    namespace: "html",
    id: "custom-params-field",
    styles: {
      display: "grid",
      gridTemplateColumns: "auto auto",
    },
    children: [],
  };

  const row = (index: number): TagElementProps[] => [
    {
      tag: "input",
      attributes: {
        "data-bind": `custom-params-key-${index}`,
        "data-prop": "value",
        type: "text",
        placeholder: "Parameter name",
      },
      styles: {
        maxWidth: "300px",
      },
    },
    {
      tag: "input",
      attributes: {
        "data-bind": `custom-params-value-${index}`,
        "data-prop": "value",
        type: "text",
        placeholder: "Parameter value (JSON format)",
      },
      styles: {
        maxWidth: "300px",
      },
    },
  ];
}

export async function createServiceDialog(
  serviceName: string,
  fields: ConfigField[],
  helpURL?: string,
): Promise<void> {
  const dialog = new ztoolkit.Dialog(1, 1);

  // Sync preferences to dialog
  const dialogData: (typeof dialog)["dialogData"] = {};
  fields.forEach((field) => {
    if (field.prefKey && field.type !== "button") {
      dialogData[field.prefKey] = getPref(field.prefKey);
    }
  });
  dialog.setDialogData(dialogData);

  // Build fields
  const childrens: TagElementProps[] = [];
  fields.forEach((field, index) => {
    if (field.hidden) {
      return;
    }

    const id = field.prefKey || field.nameKey || String(index);

    // Left: label of setting
    childrens.push({
      tag: "label",
      namespace: "html",
      attributes: {
        for: id,
      },
      properties: {
        textContent: getString(field.nameKey),
      },
      styles: {
        fontWeight: "500",
        textAlign: "right",
      },
    });

    // Right: value of setting
    const control: TagElementProps[] = [];
    switch (field.type) {
      case "input":
        control.push({
          tag: "input",
          id,
          attributes: {
            "data-bind": id,
            "data-prop": "value",
            type: field.inputType || "text",
            placeholder: field.placeholder || "",
          },
          styles: {
            minWidth: "400px",
          },
        });
        break;

      case "textarea":
        control.push({
          tag: "textarea",
          id,
          attributes: {
            "data-bind": id,
            "data-prop": "value",
            placeholder: field.type === field.placeholder || "",
            rows: 5,
          },
          styles: {
            minWidth: "400px",
          },
        });
        break;

      case "params":
        control.push({
          tag: "textarea",
          id,
          attributes: {
            "data-bind": id,
            "data-prop": "value",
            rows: 10,
          },
          styles: {
            minWidth: "400px",
          },
        });
        break;

      case "checkbox":
        control.push({
          tag: "input",
          id,
          attributes: {
            "data-bind": id,
            "data-prop": "checked",
            type: "checkbox",
          },
          styles: {
            justifySelf: "start",
          },
        });
        break;

      case "select":
        control.push({
          tag: "select",
          id,
          attributes: {
            "data-bind": id,
            "data-prop": "value",
          },
          children: field.options.map((option) => ({
            tag: "option",
            properties: {
              value: option.value,
              innerHTML: option.label,
            },
          })),
          styles: {
            minWidth: "400px",
            width: "100%",
          },
        });
        break;

      case "button":
        // todo
        break;
    }

    childrens.push({
      tag: "div",
      styles: {
        display: "flex",
        flexDirection: "column",
        gap: "5px",
      },
      children: [
        ...control,
        {
          tag: "span",
          namespace: "html",
          properties: {
            innerHTML: field.desc,
          },
        },
      ],
    });
  });

  dialog.addCell(0, 0, {
    tag: "div",
    classList: ["settings-grid"],
    styles: {
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: "15px 20px",
      // alignItems: "center",
      marginBottom: "20px",
    },
    children: childrens,
  });

  if (helpURL) {
    dialog.addButton(getString(`service-dialog-help`), "help", {
      noClose: true,
      callback: async () => {
        await Zotero.launchURL(helpURL);
      },
    });
  }

  dialog
    .addButton(getString(`service-dialog-close`), "close")
    .addButton(getString(`service-dialog-save`), "save")

    .open(
      getString(`service-dialog-title`, {
        args: { service: serviceName },
      }),
    );

  await dialogData.unloadLock?.promise;

  // Sync dialogData to Preference
  if (dialogData._lastButtonId === "save") {
    fields.forEach((field) => {
      if (!field.prefKey) return;

      if (field.type === "button") {
        return;
      } else if (field.type === "checkbox") {
        setPref(field.prefKey, Boolean(dialogData[field.prefKey]));
        return;
      } else {
        setPref(field.prefKey, dialogData[field.prefKey]);
      }
    });
  }
}
