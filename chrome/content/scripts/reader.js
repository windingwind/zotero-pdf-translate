Zotero.ZoteroPDFTranslate.reader = {
  /*
    Reader Functions
  */
  getReader: function () {
    return Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
  },

  getWindowReader: function () {
    let windowReaders = [];
    let tabs = Zotero_Tabs._tabs.map((e) => e.id);
    for (let i = 0; i < Zotero.Reader._readers.length; i++) {
      let flag = false;
      for (let j = 0; j < tabs.length; j++) {
        if (Zotero.Reader._readers[i].tabID == tabs[j]) {
          flag = true;
          break;
        }
      }
      if (!flag) {
        windowReaders.push(Zotero.Reader._readers[i]);
      }
    }
    return windowReaders;
  },

  getReaderTab: function () {
    let tabs = document.getElementsByTagName("tabbox");
    for (let i = 0; i < tabs.length; i++) {
      let tabpanels = tabs[i].getElementsByTagName("tabpanel");
      if (
        tabpanels.length &&
        tabpanels[0].children.length &&
        tabpanels[0].children[0].item &&
        tabpanels[0].children[0].item.getField("title") ==
          Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)._title.split(
            " - "
          )[0]
      ) {
        return tabs[i];
      }
    }
    return undefined;
  },

  getSelectedText: function () {
    let currentReader = Zotero.ZoteroPDFTranslate.reader.getReader();
    if (!currentReader) {
      return "";
    }
    let _ =
      currentReader._iframeWindow.document.getElementsByTagName("textarea");

    for (let i = 0; i < _.length; i++) {
      // Choose the selection textare
      if (_[i].style["z-index"] == -1 && _[i].style["width"] == "0px") {
        // Trim
        return _[i].value.replace(/(^\s*)|(\s*$)/g, "");
      }
    }
    return "";
  },
};
