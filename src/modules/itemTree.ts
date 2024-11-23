import { config } from "../../package.json";
import { getString } from "../utils/locale";

export function registerExtraColumns() {
  // TEMP: Remove after Zotero 7.0.10
  const registerColumn =
    Zotero.ItemTreeManager.registerColumn ||
    Zotero.ItemTreeManager.registerColumns;
  registerColumn({
    dataKey: "titleTranslation",
    label: getString("field-titleTranslation"),
    dataProvider: (item, dataKey) =>
      ztoolkit.ExtraField.getExtraField(item, "titleTranslation") || "",
    pluginID: config.addonID,
    zoteroPersist: ["width", "hidden", "sortDirection"],
  });
}
