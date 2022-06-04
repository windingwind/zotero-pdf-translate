import { TransBase } from "./base";

class TransReader extends TransBase {
  currentReader: ReaderObj;
  constructor(parent: PDFTranslate) {
    super(parent);
  }
  async getReader(): Promise<ReaderObj> {
    const reader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
    await reader._initPromise;
    return reader;
  }

  getWindowReader(): Array<ReaderObj> {
    let windowReaders: Array<ReaderObj> = [];
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
    if (!Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)) {
      return undefined;
    }
    return document.getElementById(`${Zotero_Tabs.selectedID}-context`);
  }

  getSelectedText(currentReader: ReaderObj): string {
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
