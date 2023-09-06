import { getString } from "../utils/locale";

export async function registerExtraColumns() {
  await ztoolkit.ItemTree.register(
    "titleTranslation",
    getString("field-titleTranslation"),
    (
      field: string,
      unformatted: boolean,
      includeBaseMapped: boolean,
      item: Zotero.Item,
    ) => {
      return ztoolkit.ExtraField.getExtraField(item, field) || "";
    },
  );
}
