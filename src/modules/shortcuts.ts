export function registerShortcuts() {
  ztoolkit.Keyboard.register((ev, data) => {
    if (data.type === "keyup" && data.keyboard) {
      if (data.keyboard.equals("accel,T")) {
        const isReaderWindow =
          ev.target?.ownerGlobal?.location?.href ===
          "chrome://zotero/content/reader.xhtml";
        if (!isReaderWindow) {
          addon.hooks.onShortcuts(
            Zotero.getMainWindow().Zotero_Tabs.selectedType,
          );
        } else {
          addon.hooks.onShortcuts("reader");
        }
        addon.data.translate.concatKey = false;
      }
    }
    const concatKey = Zotero.isMac ? "Meta" : "Control";
    if (data.type === "keydown") {
      if (ev.key === concatKey) {
        addon.data.translate.concatKey = true;
      }
    }
    if (data.type === "keyup") {
      if (ev.key === concatKey) {
        addon.data.translate.concatKey = false;
      }
    }
  });
}
