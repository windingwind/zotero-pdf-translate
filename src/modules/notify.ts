export function registerNotify(types: _ZoteroTypes.Notifier.Type[]) {
  const callback = {
    notify: async (
      event: string,
      type: string,
      ids: Array<string>,
      extraData: { [key: string]: any }
    ) => {
      if (!addon?.data.alive) {
        unregisterNotify(notifyID);
        return;
      }
      addon.hooks.onNotify(event, type, ids, extraData);
    },
  };

  // Register the callback in Zotero as an item observer
  const notifyID = Zotero.Notifier.registerObserver(callback, types);

  // Unregister callback when the window closes (important to avoid a memory leak)
  window.addEventListener(
    "unload",
    (e: Event) => {
      unregisterNotify(notifyID);
    },
    false
  );
}

function unregisterNotify(notifyID: string) {
  Zotero.Notifier.unregisterObserver(notifyID);
}
