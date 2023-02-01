import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";

export function registerExtraColumns() {
  ztoolkit.ItemTree.register(
    "titleTranslation",
    getString("columns.titleTranslation"),
    (
      field: string,
      unformatted: boolean,
      includeBaseMapped: boolean,
      item: Zotero.Item
    ) => {
      return ztoolkit.ExtraField.getExtraField(item, "titleTranslation") || "";
    }
  );
}

export function registerTitleRenderer() {
  ztoolkit.ItemTree.addRenderCellHook(
    "title",
    (index: number, data: string, column: any, original: Function) => {
      if (getPref("titleColumnMode") === "result") {
        const item = (ZoteroPane.itemsView.getRow(index) as any)
          .ref as Zotero.Item;
        data =
          ztoolkit.ExtraField.getExtraField(item, "titleTranslation") || data;
      }
      const span = original(index, data, column) as HTMLSpanElement;
      return span;
    }
  ).then(() => ztoolkit.ItemTree.refresh());
}
