import { TransBase } from "./base";

class TransView extends TransBase {
  popupTextBox: XUL.Textbox;
  sideBarTextboxSource: XUL.Textbox;
  sideBarTextboxTranslated: XUL.Textbox;
  tab: XUL.Element;
  tabPanel: XUL.Element;
  progressWindowIcon: object;

  constructor(parent: PDFTranslate) {
    super(parent);
    this.progressWindowIcon = {
      success: "chrome://zotero/skin/tick.png",
      fail: "chrome://zotero/skin/cross.png",
      default: "chrome://zoteropdftranslate/skin/favicon.png",
    };
  }

  async updateTranslatePanel() {
    Zotero.debug("ZoteroPDFTranslate: Update Translate Panels");

    await Zotero.uiReadyPromise;

    let currentReader = this._PDFTranslate.reader.getReader();
    if (!currentReader) {
      return false;
    }
    await currentReader._waitForReader();

    await this.buildSideBarPanel();

    this.updateSideBarPanelMenu();

    let disable = this._PDFTranslate.translate.getLanguageDisable(
      undefined,
      currentReader
    );

    currentReader._window.addEventListener(
      "pointerup",
      (function (currentReader, disable) {
        return function (event) {
          Zotero.ZoteroPDFTranslate.events.onSelect(
            event,
            currentReader,
            disable
          );
        };
      })(currentReader, disable)
    );
  }

  async updateWindowTranslatePanel(currentReader: ReaderObj) {
    Zotero.debug("ZoteroPDFTranslate: Update Window Translate Panels");

    await Zotero.uiReadyPromise;

    await currentReader._waitForReader();

    let disable = this._PDFTranslate.translate.getLanguageDisable(
      undefined,
      currentReader
    );

    currentReader._window.addEventListener(
      "pointerup",
      (function (currentReader, disable) {
        return function (event) {
          this._PDFTranslate.events.onSelect(event, currentReader, disable);
        };
      })(currentReader, disable)
    );
  }

  getSideBarOpen(): boolean {
    let _contextPaneSplitterStacked = document.getElementById(
      "zotero-context-splitter-stacked"
    );

    let _contextPaneSplitter = document.getElementById(
      "zotero-context-splitter"
    );

    let splitter =
      Zotero.Prefs.get("layout") == "stacked"
        ? _contextPaneSplitterStacked
        : _contextPaneSplitter;

    return splitter.getAttribute("state") != "collapsed";
  }

  async buildSideBarPanel() {
    Zotero.debug("ZoteroPDFTranslate: buildSideBarPanel");
    let tab = this.tab;
    if (!tab) {
      tab = document.createElement("tab");
      tab.setAttribute("id", "pdf-translate-tab");
      tab.setAttribute("label", "Translate");
      this.tab = tab;
    }

    // The first tabbox is zotero main pane tabbox
    let n = 0;
    let tabbox = this._PDFTranslate.reader.getReaderTab();
    while (!tabbox) {
      if (n >= 500) {
        Zotero.debug("ZoteroPDFTranslate: Waiting for reader failed");
        // this.showProgressWindow(
        //   "PDF Translate",
        //   "Sidebar Load Failed",
        //   "fail"
        // );
        return;
      }
      await Zotero.Promise.delay(10);
      tabbox = this._PDFTranslate.reader.getReaderTab();
      n++;
    }
    tabbox.getElementsByTagName("tabs")[0].appendChild(tab);
    let itemCount = tabbox.getElementsByTagName("tabs")[0].itemCount;

    let panelInfo = this.tabPanel;
    if (!panelInfo) {
      panelInfo = document.createElement("tabpanel");
      panelInfo.setAttribute("id", "pdf-translate-tabpanel");
      panelInfo.setAttribute("flex", "1");

      let vbox = document.createElement("vbox");
      vbox.setAttribute("flex", "1");
      vbox.setAttribute("align", "stretch");
      vbox.style.padding = "0px 10px 10px 10px";

      let hboxTranslate: XUL.Box = document.createElement("hbox");
      hboxTranslate.setAttribute("id", "pdf-translate-tabpanel-engine-hbox");
      hboxTranslate.setAttribute("flex", "1");
      hboxTranslate.setAttribute("align", "center");
      hboxTranslate.maxHeight = 50;
      hboxTranslate.minHeight = 50;
      hboxTranslate.style.height = "80px";

      let hboxLanguage: XUL.Box = document.createElement("hbox");
      hboxLanguage.setAttribute("id", "pdf-translate-tabpanel-language-hbox");
      hboxLanguage.setAttribute("flex", "1");
      hboxLanguage.setAttribute("align", "center");
      hboxLanguage.maxHeight = 50;
      hboxLanguage.minHeight = 50;
      hboxLanguage.style.height = "80px";

      let hboxCopy: XUL.Box = document.createElement("hbox");
      hboxCopy.setAttribute("id", "pdf-translate-tabpanel-copy-hbox");
      hboxCopy.setAttribute("flex", "1");
      hboxCopy.setAttribute("align", "center");
      hboxCopy.maxHeight = 50;
      hboxCopy.minHeight = 50;
      hboxCopy.style.height = "80px";

      let SLMenuList = document.createElement("menulist");
      SLMenuList.setAttribute("id", "pdf-translate-sl");
      SLMenuList.style.width = "145px";
      SLMenuList.setAttribute(
        "value",
        Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage")
      );
      let SLMenuPopup = document.createElement("menupopup");
      SLMenuList.appendChild(SLMenuPopup);
      for (let lang of this._PDFTranslate.translate.LangCultureNames) {
        let menuitem = document.createElement("menuitem");
        menuitem.setAttribute("label", lang.DisplayName);
        menuitem.setAttribute("value", lang.LangCultureName);
        menuitem.addEventListener("command", (e: XULEvent) => {
          let newSL = e.target.value;
          Zotero.Prefs.set("ZoteroPDFTranslate.sourceLanguage", newSL);
        });
        SLMenuPopup.appendChild(menuitem);
      }

      let languageLabel = document.createElement("label");
      languageLabel.setAttribute("id", "pdf-translate-switch");
      languageLabel.setAttribute("flex", "1");
      languageLabel.style["text-align"] = "center";
      languageLabel.style["font-size"] = "14px";
      languageLabel.setAttribute("value", "➡️");
      languageLabel.addEventListener("mouseover", (e: XULEvent) => {
        e.target.setAttribute("value", "🔃");
      });
      languageLabel.addEventListener("mouseleave", (e: XULEvent) => {
        e.target.setAttribute("value", "➡️");
      });
      languageLabel.addEventListener("click", (e) => {
        let SLMenu: XUL.Menulist = document.getElementById("pdf-translate-sl");
        let TLMenu: XUL.Menulist = document.getElementById("pdf-translate-tl");
        let sl = SLMenu.value;
        let tl = TLMenu.value;
        Zotero.Prefs.set("ZoteroPDFTranslate.sourceLanguage", tl);
        Zotero.Prefs.set("ZoteroPDFTranslate.targetLanguage", sl);
        SLMenu.value = tl;
        TLMenu.value = sl;
      });

      let TLMenuList = document.createElement("menulist");
      TLMenuList.setAttribute("id", "pdf-translate-tl");
      TLMenuList.style.width = "145px";
      TLMenuList.setAttribute(
        "value",
        Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage")
      );
      let TLMenuPopup = document.createElement("menupopup");
      TLMenuList.appendChild(TLMenuPopup);
      for (let lang of this._PDFTranslate.translate.LangCultureNames) {
        let menuitem = document.createElement("menuitem");
        menuitem.setAttribute("label", lang.DisplayName);
        menuitem.setAttribute("value", lang.LangCultureName);
        menuitem.addEventListener("command", (e: XULEvent) => {
          let newTL = e.target.value;
          Zotero.Prefs.set("ZoteroPDFTranslate.targetLanguage", newTL);
        });
        TLMenuPopup.appendChild(menuitem);
      }
      hboxLanguage.append(SLMenuList, languageLabel, TLMenuList);

      let menuLabel = document.createElement("label");
      menuLabel.setAttribute("value", "Engine");
      let menulist = document.createElement("menulist");
      menulist.setAttribute("id", "pdf-translate-engine");
      menulist.setAttribute("flex", "1");
      menulist.setAttribute(
        "value",
        Zotero.Prefs.get("ZoteroPDFTranslate.translateSource")
      );
      let menupopup = document.createElement("menupopup");
      menulist.appendChild(menupopup);
      for (let source of this._PDFTranslate.translate.sources) {
        let menuitem = document.createElement("menuitem");
        menuitem.setAttribute(
          "label",
          this._PDFTranslate.translate.sourcesName[source]
        );
        menuitem.setAttribute("value", source);
        menuitem.addEventListener("command", (e: XULEvent) => {
          let newSource = e.target.value;
          Zotero.Prefs.set("ZoteroPDFTranslate.translateSource", newSource);
          let userSecrets = JSON.parse(
            Zotero.Prefs.get("ZoteroPDFTranslate.secretObj")
          );
          Zotero.Prefs.set("ZoteroPDFTranslate.secret", userSecrets[newSource]);
          this._PDFTranslate.events.onTranslateButtonClick(e);
        });
        menupopup.appendChild(menuitem);
      }

      let buttonTranslate = document.createElement("button");
      buttonTranslate.setAttribute("id", "pdf-translate-call-button");
      buttonTranslate.setAttribute("label", "Translate");
      buttonTranslate.setAttribute("flex", "1");
      buttonTranslate.addEventListener("click", (e: XULEvent) => {
        this._PDFTranslate.events.onTranslateButtonClick(e);
      });

      hboxTranslate.append(menuLabel, menulist, buttonTranslate);

      let buttonCopySource = document.createElement("button");
      buttonCopySource.setAttribute("label", "Copy Raw");
      buttonCopySource.setAttribute("flex", "1");
      buttonCopySource.addEventListener("click", (e: XULEvent) => {
        this._PDFTranslate.events.onCopyToClipBoard(
          this._PDFTranslate._sourceText
        );
      });

      let buttonCopyTranslated = document.createElement("button");
      buttonCopyTranslated.setAttribute("label", "Copy Result");
      buttonCopyTranslated.setAttribute("flex", "1");
      buttonCopyTranslated.addEventListener("click", (e: XULEvent) => {
        this._PDFTranslate.events.onCopyToClipBoard(
          this._PDFTranslate._translatedText
        );
      });

      let buttonCopyBoth = document.createElement("button");
      buttonCopyBoth.setAttribute("label", "Copy Both");
      buttonCopyBoth.setAttribute("flex", "1");
      buttonCopyBoth.addEventListener("click", (e: XULEvent) => {
        this._PDFTranslate.events.onCopyToClipBoard(
          `${this._PDFTranslate._sourceText}\n----\n${this._PDFTranslate._translatedText}`
        );
      });

      hboxCopy.append(buttonCopySource, buttonCopyTranslated, buttonCopyBoth);

      let textboxSource: XUL.Textbox = document.createElement("textbox");
      textboxSource.setAttribute("id", "pdf-translate-tabpanel-source");
      textboxSource.setAttribute("flex", "1");
      textboxSource.setAttribute("multiline", true);
      textboxSource.addEventListener("input", (event: XULEvent) => {
        this._PDFTranslate._sourceText = event.target.value;
      });
      textboxSource.style["font-size"] = `${Zotero.Prefs.get(
        "ZoteroPDFTranslate.fontSize"
      )}px`;

      let rawResultOrder = Zotero.Prefs.get(
        "ZoteroPDFTranslate.rawResultOrder"
      );
      let splitter = document.createElement("splitter");
      splitter.setAttribute("id", "pdf-translate-tabpanel-splitter");
      splitter.setAttribute("collapse", rawResultOrder ? "after" : "before");
      let grippy = document.createElement("grippy");
      splitter.append(grippy);

      let textboxTranslated: XUL.Textbox = document.createElement("textbox");
      textboxTranslated.setAttribute("multiline", true);
      textboxTranslated.setAttribute("flex", "1");
      textboxTranslated.setAttribute("id", "pdf-translate-tabpanel-translated");
      textboxTranslated.style["font-size"] = `${Zotero.Prefs.get(
        "ZoteroPDFTranslate.fontSize"
      )}px`;

      vbox.append(
        hboxTranslate,
        hboxLanguage,
        rawResultOrder ? textboxTranslated : textboxSource,
        splitter,
        rawResultOrder ? textboxSource : textboxTranslated,
        hboxCopy
      );
      panelInfo.append(vbox);
      this.tabPanel = panelInfo;

      this.sideBarTextboxSource = textboxSource;
      this.sideBarTextboxTranslated = textboxTranslated;
    }
    tabbox.getElementsByTagName("tabpanels")[0].appendChild(panelInfo);
    tabbox.selectedIndex = itemCount - 1;
  }

  updateSideBarPanelMenu() {
    Zotero.debug("ZoteroPDFTranslate: updateSideBarPanelMenu");
    this.checkSideBarPanel();
    let SLMenuList: XUL.Menulist = document.getElementById("pdf-translate-sl");
    let TLMenuList: XUL.Menulist = document.getElementById("pdf-translate-tl");
    let engineMenuList: XUL.Menulist = document.getElementById(
      "pdf-translate-engine"
    );
    let sourceLanguage = Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage");
    if (SLMenuList && SLMenuList.value != sourceLanguage) {
      for (let i = 0; i < SLMenuList.itemCount; i++) {
        if (SLMenuList.getItemAtIndex(i).value == sourceLanguage) {
          SLMenuList.selectedIndex = i;
          break;
        }
      }
    }
    let targetLanguage = Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage");
    if (TLMenuList && TLMenuList.value != targetLanguage) {
      for (let i = 0; i < TLMenuList.itemCount; i++) {
        if (TLMenuList.getItemAtIndex(i).value == targetLanguage) {
          TLMenuList.selectedIndex = i;
          break;
        }
      }
    }
    let engine = Zotero.Prefs.get("ZoteroPDFTranslate.translateSource");
    if (engineMenuList && engineMenuList.value != engine) {
      for (let i = 0; i < engineMenuList.itemCount; i++) {
        if (engineMenuList.getItemAtIndex(i).value == engine) {
          engineMenuList.selectedIndex = i;
          break;
        }
      }
    }

    let showSidebarEngine = Zotero.Prefs.get(
      "ZoteroPDFTranslate.showSidebarEngine"
    );
    try {
      document.getElementById("pdf-translate-tabpanel-engine-hbox").hidden =
        !showSidebarEngine;

      let showSidebarLanguage = Zotero.Prefs.get(
        "ZoteroPDFTranslate.showSidebarLanguage"
      );
      document.getElementById("pdf-translate-tabpanel-language-hbox").hidden =
        !showSidebarLanguage;

      let showSidebarRaw = Zotero.Prefs.get(
        "ZoteroPDFTranslate.showSidebarRaw"
      );
      document.getElementById("pdf-translate-tabpanel-source").hidden =
        !showSidebarRaw;
      document.getElementById("pdf-translate-tabpanel-splitter").hidden =
        !showSidebarRaw;

      let showSidebarCopy = Zotero.Prefs.get(
        "ZoteroPDFTranslate.showSidebarCopy"
      );
      document.getElementById("pdf-translate-tabpanel-copy-hbox").hidden =
        !showSidebarCopy;
    } catch (e) {
      Zotero.debug("ZoteroPDFTranslate: updateSideBarPanelMenu error");
      Zotero.debug(e);
    }
  }

  checkSideBarPanel() {
    let panel = document.getElementById("pdf-translate-tabpanel");
    if (!panel) {
      this.buildSideBarPanel();
    }
  }

  buildPopupPanel(currentReader: ReaderObj = undefined) {
    Zotero.debug("ZoteroPDFTranslate: buildPopupPanel");
    if (!currentReader) {
      currentReader = this._PDFTranslate.reader.getReader();
    }
    let selectionMenu =
      currentReader._iframeWindow.document.getElementById("selection-menu");
    if (!currentReader || !selectionMenu) {
      return false;
    }
    this.onPopopItemChange(selectionMenu);

    // Create text
    let textbox = currentReader._window.document.createElement("textbox");
    textbox.setAttribute("id", "pdf-translate-popup");
    textbox.setAttribute("multiline", true);
    textbox.style["font-size"] = `${Zotero.Prefs.get(
      "ZoteroPDFTranslate.fontSize"
    )}px`;

    textbox.setAttribute("width", 105);
    textbox.setAttribute("height", 30);
    selectionMenu.style.width = `105px`;
    selectionMenu.style.height = `50px`;

    textbox.onmousedown = (e) => {
      e.preventDefault();
    };
    textbox.addEventListener("click", (e) => {
      let text = this._PDFTranslate._translatedText
        ? this._PDFTranslate._translatedText
        : this._PDFTranslate._sourceText;
      this._PDFTranslate.events.onCopyToClipBoard(text);
    });

    selectionMenu.appendChild(textbox);
    this.popupTextBox = textbox;
  }

  buildPopupButton(currentReader: ReaderObj = undefined) {
    Zotero.debug("ZoteroPDFTranslate: buildPopupButton");
    if (!currentReader) {
      currentReader = this._PDFTranslate.reader.getReader();
    }
    let selectionMenu =
      currentReader._iframeWindow.document.getElementById("selection-menu");

    this.onPopopItemChange(selectionMenu);

    // Create button
    let button = currentReader._window.document.createElement("button");
    button.setAttribute("id", "pdf-translate-popup-button");
    button.setAttribute("label", "Translate");
    button.setAttribute(
      "image",
      "chrome://zoteropdftranslate/skin/favicon@0.5x.png"
    );
    button.onclick = (e: XULEvent) => {
      this._PDFTranslate.events.onTranslateButtonClick(e, currentReader);
    };
    button.style.width = `${selectionMenu.scrollWidth}px`;
    button.style.height = "26px";

    selectionMenu.appendChild(button);
  }

  buildPopupTranslationToNoteButton(
    currentReader: ReaderObj = undefined,
    selectionMenu: XUL.Element = undefined
  ) {
    if (!currentReader) {
      currentReader = this._PDFTranslate.reader.getReader();
    }
    if (!currentReader || !selectionMenu) {
      return false;
    }
    Zotero.debug("ZoteroPDFTranslate: buildPopupTranslateNoteButton");
    let addToNoteButton =
      selectionMenu.getElementsByClassName("wide-button")[0];
    let translationToNote = currentReader._iframeWindow.document.getElementById(
      "pdf-translate-popup-add-to-note-button"
    );
    if (addToNoteButton) {
      if (
        Zotero.Prefs.get("ZoteroPDFTranslate.enableNote") &&
        !translationToNote
      ) {
        let button = currentReader._window.document.createElement("button");
        button.setAttribute("id", "pdf-translate-popup-add-to-note-button");
        button.setAttribute("label", Zotero.getString("pdfReader.addToNote"));
        button.setAttribute(
          "image",
          "chrome://zoteropdftranslate/skin/favicon@0.5x.png"
        );
        button.onclick = (e) => {
          this._PDFTranslate.events.onTranslateNoteButtonClick(
            e,
            currentReader,
            addToNoteButton
          );
        };
        button.style.width = `${selectionMenu.scrollWidth}px`;
        button.style.height = "26px";
        addToNoteButton.after(button);
      }
    }
    return true;
  }

  removePopupPanel(currentReader: ReaderObj) {
    let currentButton = currentReader._iframeWindow.document.getElementById(
      "pdf-translate-popup-button"
    );
    currentButton && currentButton.remove();

    let currentPanel = currentReader._iframeWindow.document.getElementById(
      "pdf-translate-popup"
    );
    currentPanel && currentPanel.remove();
  }

  updatePopupStyle(currentReader: ReaderObj): void {
    Zotero.debug("ZoteroPDFTranslate: updatePopupStyle");
    let selectionMenu =
      currentReader._iframeWindow.document.getElementById("selection-menu");
    if (!this.popupTextBox || !selectionMenu) {
      return;
    }

    // Get current H & W
    // @ts-ignore
    let textHeight = document.getAnonymousNodes(this.popupTextBox)[0]
      .childNodes[0].scrollHeight;
    let textWidth = Number(this.popupTextBox.width);
    if (textHeight / textWidth > 0.75) {
      // Update width
      // @ts-ignore
      let newWidth = parseInt(textWidth + 20);
      this.popupTextBox.setAttribute("width", newWidth);
      selectionMenu.style.width = `${newWidth}px`;
      // Check until H/W<0.75
      this.updatePopupStyle(currentReader);
      return;
    }
    this.popupTextBox.style.height = `${textHeight}px`;
    selectionMenu.style.height = `${textHeight + 20}px`;

    // Update button width
    let buttons = selectionMenu.getElementsByTagName("button");
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].style.width = selectionMenu.style.width;
    }
  }

  onPopopItemChange(selectionMenu: XUL.Element) {
    selectionMenu.addEventListener(
      "DOMSubtreeModified",
      function () {
        this.buildPopupTranslationToNoteButton(undefined, selectionMenu);
        if (parseInt(selectionMenu.style.height) < selectionMenu.scrollHeight)
          selectionMenu.style.height = `${selectionMenu.scrollHeight}px`;
      }.bind(this),
      false
    );
  }

  updateResults() {
    // Update error info if not success
    if (this._PDFTranslate._debug) {
      this._PDFTranslate._translatedText = this._PDFTranslate._debug;
    }
    if (this.sideBarTextboxSource) {
      this.sideBarTextboxSource.value = this._PDFTranslate._sourceText;
    }
    if (this.sideBarTextboxTranslated) {
      this.sideBarTextboxTranslated.value = this._PDFTranslate._translatedText;
    }
    if (this.popupTextBox) {
      try {
        this.popupTextBox.setAttribute(
          "value",
          this._PDFTranslate._translatedText
            ? this._PDFTranslate._translatedText
            : this._PDFTranslate._sourceText
        );
      } catch (e) {
        Zotero.debug(e);
      }
    }
  }

  showProgressWindow(
    header: string,
    context: string,
    type: string = "default",
    t: number = 5000
  ) {
    // Zotero.ZoteroTag.progressWindow.close();
    let progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
    progressWindow.changeHeadline(header);
    progressWindow.progress = new progressWindow.ItemProgress(
      this.progressWindowIcon[type],
      context
    );
    progressWindow.show();
    if (t > 0) {
      progressWindow.startCloseTimer(t);
    }
  }
}

export default TransView;
