import { getPref, setPref } from "./prefs";
import { getString } from "./locale";
import { TagElementProps } from "zotero-plugin-toolkit";

export type ConfigField =
  | InputField
  | TextareaField
  | CheckboxField
  | SelectField
  | LabelField
  | ButtonField
  | ParamsField;

type DialogFieldBase = {
  /**
   * 用于获取本地化字符串的键名前缀
   *
   * @todo type to FluentMessageId
   */
  nameKey?: string;
  /**
   * 对应的pref键名，用于读取和保存值
   *
   * @todo type to keyof _ZoteroTypes.Prefs["PluginPrefsMap"]
   */
  prefKey?: string;
  /**
   * 是否显示该字段
   *
   * @default true
   */
  hidden?: boolean;
};

type InputField = DialogFieldBase & {
  type: "input";
  inputType?: string;
  placeholder?: string;
};

type TextareaField = DialogFieldBase & {
  type: "textarea";
  placeholder?: string;
};

type CheckboxField = DialogFieldBase & {
  type: "checkbox";
};

type SelectField = DialogFieldBase & {
  type: "select";
  options: Array<{
    value: string;
    label: string;
  }>;
};

type LabelField = DialogFieldBase & {
  type: "label";
};

type ButtonField = DialogFieldBase & {
  type: "button";
  callback?: () => void;
};

type ParamsField = DialogFieldBase & {
  type: "params";
};

// TODO: Custom Params Field
function createParamsField(field: ParamsField) {
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

    const id = field.prefKey || field.nameKey;

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
    switch (field.type) {
      case "label":
        childrens.push({
          tag: "label",
          namespace: "html",
          attributes: {
            for: id,
          },
          properties: {
            innerHTML: getString(field.nameKey),
          },
        });
        break;

      case "input":
        childrens.push({
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

      case "params":
      case "textarea":
        childrens.push({
          tag: "textarea",
          id,
          attributes: {
            "data-bind": id,
            "data-prop": "value",
            placeholder:
              field.type === "textarea" ? field.placeholder || "" : "",
            rows: 5,
          },
          styles: {
            minWidth: "400px",
          },
        });
        break;

      case "checkbox":
        childrens.push({
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
        childrens.push({
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
        });
        break;

      case "button":
        // todo
        break;
    }
  });

  dialog.addCell(0, 0, {
    tag: "div",
    classList: ["settings-grid"],
    styles: {
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: "15px 20px",
      alignItems: "center",
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

  switch (dialogData._lastButtonId) {
    // Sync dialogData to Preference
    case "save":
      fields.forEach((field) => {
        if (field.prefKey && field.type !== "button") {
          const fullPrefKey = `${field.prefKey}`;
          setPref(fullPrefKey, dialogData[field.prefKey]);
        }
      });
      break;

    default:
      break;
  }
}
