import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";

export async function registerItemBoxExtraRows() {
  ztoolkit.FieldHook.register(
    "getField",
    "titleTranslation",
    (
      field: string,
      unformatted: boolean,
      includeBaseMapped: boolean,
      item: Zotero.Item,
      original: Function,
    ) => {
      return ztoolkit.ExtraField.getExtraField(item, field) || "";
    },
  );

  ztoolkit.FieldHook.register(
    "getField",
    "abstractTranslation",
    (
      field: string,
      unformatted: boolean,
      includeBaseMapped: boolean,
      item: Zotero.Item,
      original: Function,
    ) => {
      return ztoolkit.ExtraField.getExtraField(item, field) || "";
    },
  );
  // TODO: Use official API when available
  if (getPref("showItemBoxTitleTranslation") !== false) {
    // await ztoolkit.ItemBox.register(
    //   "titleTranslation",
    //   getString("field-titleTranslation"),
    //   (field, unformatted, includeBaseMapped, item, original) => {
    //     return ztoolkit.ExtraField.getExtraField(item, field) || "";
    //   },
    //   {
    //     editable: false,
    //     setFieldHook: (field, value, loadIn, item, original) => {
    //       ztoolkit.ExtraField.setExtraField(item, field, value);
    //       return true;
    //     },
    //     index: 2,
    //     multiline: true,
    //   },
    // );
  }

  if (getPref("showItemBoxAbstractTranslation") !== false) {
    // await ztoolkit.ItemBox.register(
    //   "abstractTranslation",
    //   getString("field-abstractTranslation"),
    //   (field, unformatted, includeBaseMapped, item, original) => {
    //     return ztoolkit.ExtraField.getExtraField(item, field) || "";
    //   },
    //   {
    //     editable: false,
    //     setFieldHook: (field, value, loadIn, item, original) => {
    //       ztoolkit.ExtraField.setExtraField(item, field, value);
    //       return true;
    //     },
    //     index: 3,
    //     multiline: true,
    //     collapsible: true,
    //   },
    // );
  }
}
