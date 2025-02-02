export function registerShortcuts() {
  ztoolkit.Keyboard.register((ev, data) => {
    if (data.type === "keyup" && data.keyboard) {
      if (data.keyboard.equals("accel,T")) {
        const win = Zotero.getMainWindow();
        if (Services.focus.activeWindow == win) {
          addon.hooks.onShortcuts(win.Zotero_Tabs.selectedType);
        } else {
          addon.hooks.onShortcuts("reader");
        }
      }
    }
    if (data.type === "keydown") {
      if (ev.key === "Alt") {
        addon.data.translate.concatKey = true;
      }
    }
    if (data.type === "keyup") {
      if (ev.key === "Alt") {
        addon.data.translate.concatKey = false;
      }
    }
  });
}
