import { config } from "../../package.json";
import { getString } from "../utils/locale";

export function registerExtraColumns() {
  Zotero.ItemTreeManager.registerColumn({
    dataKey: "titleTranslation",
    label: getString("field-titleTranslation"),
    dataProvider: (item, dataKey) =>
      ztoolkit.ExtraField.getExtraField(item, "titleTranslation") || "",
    pluginID: config.addonID,
    zoteroPersist: ["width", "hidden", "sortDirection"],
  });
}
