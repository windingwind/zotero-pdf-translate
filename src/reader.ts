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

  getReaderTab(): Element {
    if (!this.currentReader) {
      return undefined;
    }
    let tabs = document.getElementsByTagName("tabbox");
    let readerTitle = this.currentReader._title.split(" - ")[0];
    for (let i = 0; i < tabs.length; i++) {
      let tabpanels = tabs[i].getElementsByTagName("tabpanel");
      if (
        // Skip ZoteroPane tab
        tabs[i].getAttribute("id") != "zotero-view-tabbox" &&
        tabpanels.length &&
        tabpanels[0].children.length &&
        // @ts-ignore
        tabpanels[0].children[0].item &&
        Zotero_Tabs.selectedID != "zotero-pane" &&
        // Have the same title, use substr to avoid the ' - ' in title causing error
        // @ts-ignore
        tabpanels[0].children[0].item
          .getField("title")
          .substr(0, readerTitle.length) == readerTitle &&
        // Skip the current tab, work around to get sidebar with 2 attachments
        // TODO: fix with more attachments
        Array.prototype.every.call(
          tabs[i].getElementsByTagName("tab"),
          (e: Element) => e.id != "pdf-translate-tab"
        )
      ) {
        return tabs[i];
      }
    }
    return undefined;
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
