import { getPref } from "../utils/prefs";

export { registerItemPaneInfoRows };

function registerItemPaneInfoRows() {
  if (!Zotero.ItemPaneManager.registerInfoRow) {
    return;
  }

  if (getPref("showItemBoxTitleTranslation") !== false) {
    Zotero.ItemPaneManager.registerInfoRow({
      rowID: "titleTranslation",
      pluginID: addon.data.config.addonID,
      label: {
        l10nID: `${addon.data.config.addonRef}-field-titleTranslation`,
      },
      onGetData: (options) => {
        return (
          ztoolkit.ExtraField.getExtraField(options.item, "titleTranslation") ||
          ""
        );
      },
      onSetData: (options) => {
        ztoolkit.ExtraField.setExtraField(
          options.item,
          "titleTranslation",
          options.value,
        );
      },
      position: "start",
      editable: true,
    });
  }

  if (getPref("showItemBoxAbstractTranslation") !== false) {
    Zotero.ItemPaneManager.registerInfoRow({
      rowID: "abstractTranslation",
      pluginID: addon.data.config.addonID,
      label: {
        l10nID: `${addon.data.config.addonRef}-field-abstractTranslation`,
      },
      onGetData: (options) => {
        return (
          ztoolkit.ExtraField.getExtraField(
            options.item,
            "abstractTranslation",
          ) || ""
        );
      },
      onSetData: (options) => {
        ztoolkit.ExtraField.setExtraField(
          options.item,
          "abstractTranslation",
          options.value,
        );
      },
      position: "afterCreators",
      editable: true,
      multiline: true,
    });
  }
}
