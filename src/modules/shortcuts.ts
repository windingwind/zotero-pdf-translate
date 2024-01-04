export function registerShortcuts() {
  ztoolkit.Keyboard.register((ev, data) => {
    if (data.type === "keyup" && data.keyboard) {
      if (data.keyboard.equals("accel,T")) {
        addon.hooks.onShortcuts(Zotero_Tabs.selectedType);
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
