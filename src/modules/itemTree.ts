import { config } from "../../package.json";
import { getString } from "../utils/locale";

export async function registerExtraColumns() {
  await Zotero.ItemTreeManager.registerColumns({
    dataKey: "titleTranslation",
    label: getString("field-titleTranslation"),
    dataProvider: (item, dataKey) =>
      ztoolkit.ExtraField.getExtraField(item, "titleTranslation") || "",
    pluginID: config.addonID,
    zoteroPersist: ["width", "hidden", "sortDirection"],
  });
}
