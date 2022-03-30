Zotero.ZoteroPDFTranslate.reader = {
  /*
    Reader Functions
  */
  getReader: function () {
    return Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
  },

  getReaderID: function () {
    for (let i = 0; i < Zotero.Reader._readers.length; i++) {
      if (Zotero.Reader._readers[i].tabID === Zotero_Tabs.selectedID) {
        return i;
      }
    }
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
