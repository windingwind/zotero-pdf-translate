export { registerCustomFields };

function registerCustomFields() {
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
}
