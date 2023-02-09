import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";

export async function registerItemBoxExtraRows() {
  if (getPref("showItemBoxTitleTranslation") !== false) {
    await ztoolkit.ItemBox.register(
      "titleTranslation",
      getString("field.titleTranslation"),
      // getField hook is registered in itemTree.ts
      undefined,
      {
        editable: true,
        setFieldHook: (field, value, loadIn, item, original) => {
          ztoolkit.ExtraField.setExtraField(item, field, value);
          return true;
        },
        index: 2,
        multiline: true,
      }
    );
  }

  if (getPref("showItemBoxAbstractTranslation") !== false) {
    await ztoolkit.ItemBox.register(
      "abstractTranslation",
      getString("field.abstractTranslation"),
      (field, unformatted, includeBaseMapped, item, original) => {
        return ztoolkit.ExtraField.getExtraField(item, field) || "";
      },
      {
        editable: true,
        setFieldHook: (field, value, loadIn, item, original) => {
          ztoolkit.ExtraField.setExtraField(item, field, value);
          return true;
        },
        index: 3,
        multiline: true,
        collapsible: true,
      }
    );
  }
}
