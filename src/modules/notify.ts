export function registerNotify(types: _ZoteroTypes.Notifier.Type[]) {
  const callback = {
    notify: async (...data: Parameters<_ZoteroTypes.Notifier.Notify>) => {
      if (!addon?.data.alive) {
        unregisterNotify(notifyID);
        return;
      }
      addon.hooks.onNotify(...data);
    },
  };

  // Register the callback in Zotero as an item observer
  const notifyID = Zotero.Notifier.registerObserver(callback, types);
}

function unregisterNotify(notifyID: string) {
  Zotero.Notifier.unregisterObserver(notifyID);
}
