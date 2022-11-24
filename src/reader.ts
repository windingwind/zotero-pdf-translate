import PDFTranslate from "./addon";
import AddonBase from "./module";

class TransReader extends AddonBase {
  currentReader: _ZoteroReaderInstance;
  constructor(parent: PDFTranslate) {
    super(parent);
  }
  async getReader(): Promise<_ZoteroReaderInstance> {
    const reader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
    await reader?._initPromise;
    return reader;
  }

  getWindowReader(): Array<_ZoteroReaderInstance> {
    let windowReaders: Array<_ZoteroReaderInstance> = [];
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
  }

  getReaderTabContainer(): Element {
    const deck =
      document.querySelector(".notes-pane-deck").previousElementSibling;
    // @ts-ignore
    return deck.selectedPanel;
  }

  getSelectedText(currentReader: _ZoteroReaderInstance): string {
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
  }
}

export default TransReader;
