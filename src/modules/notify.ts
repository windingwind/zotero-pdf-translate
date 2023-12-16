// export function registerNotify(types: _ZoteroTypes.Notifier.Type[]) {
//   const callback = {
//     notify: async (...data: Parameters<_ZoteroTypes.Notifier.Notify>) => {
//       if (!addon?.data.alive) {
//         unregisterNotify(notifyID);
//         return;
//       }
//       addon.hooks.onNotify(...data);
//     },
//   };

//   // Register the callback in Zotero as an item observer
//   const notifyID = Zotero.Notifier.registerObserver(callback, types);
// }

export function registerNotify() {
  const callback = {
    notify: async (
      event: string,
      type: string,
      ids: number[] | string[],
      extraData: { [key: string]: any },
    ) => {
      ztoolkit.log({ type });
      if (type == "item") {
        for (const id of ids) {
          const item = Zotero.Items.get(id);
          const abstract = item.getField("abstractNote");
          ztoolkit.log({ abstract });
          // const fulltext = [];
          // if (item.isRegularItem()) { // not an attachment already
          //     const attachmentIDs = item.getAttachments();
          //     for (const id of attachmentIDs) {
          //         const attachment = Zotero.Items.get(id);
          //         if (attachment.attachmentContentType == 'application/pdf'
          //                 || attachment.attachmentContentType == 'text/html') {
          //             fulltext.push(await attachment.attachmentText);
          //         }
          //     }
          // }
          // ztoolkit.log({ fulltext });
        }
      }
      if (!addon?.data.alive) {
        unregisterNotify(notifyID);
        return;
      }
      addon.hooks.onNotify(event, type, ids, extraData);
    },
  };

  // Register the callback in Zotero as an item observer
  const notifyID = Zotero.Notifier.registerObserver(callback, [
    "tab",
    "item",
    "file",
  ]);
}

function unregisterNotify(notifyID: string) {
  Zotero.Notifier.unregisterObserver(notifyID);
}
