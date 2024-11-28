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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      original: Function,
    ) => {
      return ztoolkit.ExtraField.getExtraField(item, field) || "";
    },
  );
}
