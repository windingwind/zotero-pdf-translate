import { getPref, setPref } from "./prefs";
import { getString } from "./locale";

export type ConfigField =
  | InputField
  | TextareaField
  | CheckboxField
  | SelectField
  | LabelField
  | ButtonField;

export type DialogFieldBase = {
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

export type InputField = DialogFieldBase & {
  type: "input";
  inputType?: string;
  placeholder?: string;
};

export type TextareaField = DialogFieldBase & {
  type: "textarea";
  placeholder?: string;
  maxLength?: number;
};

export type CheckboxField = DialogFieldBase & {
  type: "checkbox";
};

export type SelectField = DialogFieldBase & {
  type: "select";
  options: Array<{
    value: string;
    label: string;
  }>;
};

export type LabelField = DialogFieldBase & {
  type: "label";
};

export type ButtonField = DialogFieldBase & {
  type: "button";
  callback?: () => void;
};

export async function createServiceDialog(
  title: string,
  fields: ConfigField[],
  helpURL?: string,
): Promise<void> {
  const dialog = new ztoolkit.Dialog(fields.length + 1, 2);

  // Sync preferences to dialog
  const dialogData: (typeof dialog)["dialogData"] = {};
  fields.forEach((field) => {
    if (field.prefKey && field.type !== "button") {
      dialogData[field.prefKey] = getPref(field.prefKey);
    }
  });
  dialog.setDialogData(dialogData);

  // Build fields
  fields.forEach((field, index) => {
    if (field.hidden) {
      return;
    }

    const id = field.prefKey || field.nameKey;

    // Left: label of setting
    dialog.addCell(index, 0, {
      tag: "label",
      namespace: "html",
      attributes: {
        for: id,
      },
      properties: {
        innerHTML: getString(field.nameKey),
      },
    });

    // Right: value of setting
    switch (field.type) {
      case "label":
        dialog.addCell(index, 1, {
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
        dialog.addCell(index, 1, {
          tag: "input",
          id,
          attributes: {
            "data-bind": id,
            "data-prop": "value",
            type: field.inputType || "text",
            placeholder: field.placeholder || "",
          },
        });
        break;

      case "textarea":
        dialog.addCell(index, 1, {
          tag: "textarea",
          id,
          attributes: {
            "data-bind": id,
            "data-prop": "value",
            placeholder: field.placeholder || "",
            maxlength: field.maxLength?.toString() || "",
          },
        });
        break;

      case "checkbox":
        dialog.addCell(index, 1, {
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
        dialog.addCell(index, 1, {
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

  if (helpURL) {
    dialog.addButton(getString(`dialog-help`), "help", {
      noClose: true,
      callback: async () => {
        await Zotero.launchURL(helpURL);
      },
    });
  }

  dialog
    .addButton(getString(`dialog-close`), "close")
    .addButton(getString(`dialog-save`), "save")

    .open(getString(title));

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
