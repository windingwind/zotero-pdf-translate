import { getChatServiceId } from "./chat";

const concatKey = Zotero.isMac ? "Meta" : "Control";

/**
 * Follow-up Q&A shortcut: Ctrl/⌘ + Enter opens the chat panel with the
 * current selection as context.
 */
function tryChatShortcut(ev: KeyboardEvent) {
  if (!getChatServiceId()) {
    return;
  }
  const target = ev.target as HTMLElement | null;
  // Never steal the key from text fields (e.g. the chat composer itself, or a
  // note editor)
  if (
    typeof target?.closest === "function" &&
    target.closest('input, textarea, [contenteditable="true"]')
  ) {
    return;
  }
  const selectedType = Zotero.getMainWindow().Zotero_Tabs.selectedType;
  if (selectedType !== "reader") {
    return;
  }
  addon.hooks.onChatAskLastTask();
}

export function registerShortcuts() {
  ztoolkit.Keyboard.register((ev, data) => {
    if (data.type === "keydown") {
      if (ev.key === concatKey) {
        addon.data.translate.concatKey = true;
      }
    }
    if (data.type === "keyup") {
      addon.data.translate.concatKey = false;
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
        tryChatShortcut(ev);
      }
      if (data.keyboard?.equals("accel,T")) {
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
      }
    }
  });
}
