import { TransBase } from "./base";

class TransView extends TransBase {
  popupTextBox: XUL.Textbox;
  tab: XUL.Element;
  tabPanel: XUL.Element;
  standaloneWindow: Window;
  progressWindowIcon: object;

  constructor(parent: PDFTranslate) {
    super(parent);
    this.progressWindowIcon = {
      success: "chrome://zotero/skin/tick.png",
      fail: "chrome://zotero/skin/cross.png",
      default: "chrome://zoteropdftranslate/skin/favicon.png",
    };
  }

  async updateTranslatePanel(currentReader: ReaderObj) {
    Zotero.debug("ZoteroPDFTranslate: Update Translate Panels");

    await Zotero.uiReadyPromise;

    if (!currentReader) {
      return false;
    }
    await currentReader._waitForReader();

    await this.buildSideBarPanel();

    this.updateAllTranslatePanelData();

    let disable = this._PDFTranslate.translate.getLanguageDisable(undefined);

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

    if (!currentReader) {
      return false;
    }
    await currentReader._waitForReader();

    let disable = this._PDFTranslate.translate.getLanguageDisable(undefined);

    currentReader._window.addEventListener(
      "pointerup",
      ((currentReader, disable) => {
        return (event) => {
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

      let vbox = this.buildTranslatePanel(document);

      let hboxOpenWindow: XUL.Box = document.createElement("hbox");
      hboxOpenWindow.setAttribute(
        "id",
        "pdf-translate-tabpanel-openwindow-hbox"
      );
      hboxOpenWindow.setAttribute("flex", "1");
      hboxOpenWindow.setAttribute("align", "center");
      hboxOpenWindow.maxHeight = 50;
      hboxOpenWindow.minHeight = 50;
      hboxOpenWindow.style.height = "80px";

      let buttonOpenWindow = document.createElement("button");
      buttonOpenWindow.setAttribute("label", "Open in Standalone Window");
      buttonOpenWindow.setAttribute("flex", "1");
      buttonOpenWindow.addEventListener("click", (e: XULEvent) => {
        this._PDFTranslate.events.onOpenStandaloneWindow(e);
      });

      hboxOpenWindow.append(buttonOpenWindow);
      vbox.append(hboxOpenWindow);

      panelInfo.append(vbox);
      this.tabPanel = panelInfo;
    }
    tabbox.getElementsByTagName("tabpanels")[0].appendChild(panelInfo);
    // this.sideBarTextboxSource = document.getElementById(
    //   "pdf-translate-tabpanel-source"
    // );
    // this.sideBarTextboxTranslated = document.getElementById(
    //   "pdf-translate-tabpanel-translated"
    // );
    tabbox.selectedIndex = itemCount - 1;
  }

  buildTranslatePanel(_document: Document): XUL.Box {
    let vbox = _document.createElement("vbox");
    vbox.setAttribute("id", "pdf-translate-vbox");
    vbox.setAttribute("flex", "1");
    vbox.setAttribute("align", "stretch");
    vbox.style.padding = "0px 10px 10px 10px";

    let hboxTranslate: XUL.Box = _document.createElement("hbox");
    hboxTranslate.setAttribute("id", "pdf-translate-tabpanel-engine-hbox");
    hboxTranslate.setAttribute("flex", "1");
    hboxTranslate.setAttribute("align", "center");
    hboxTranslate.maxHeight = 50;
    hboxTranslate.minHeight = 50;
    hboxTranslate.style.height = "80px";

    let hboxLanguage: XUL.Box = _document.createElement("hbox");
    hboxLanguage.setAttribute("id", "pdf-translate-tabpanel-language-hbox");
    hboxLanguage.setAttribute("flex", "1");
    hboxLanguage.setAttribute("align", "center");
    hboxLanguage.maxHeight = 50;
    hboxLanguage.minHeight = 50;
    hboxLanguage.style.height = "80px";

    let hboxAnnotation: XUL.Box = _document.createElement("hbox");
    hboxAnnotation.setAttribute("id", "pdf-translate-tabpanel-annotation-hbox");
    hboxAnnotation.setAttribute("flex", "1");
    hboxAnnotation.setAttribute("align", "center");
    hboxAnnotation.maxHeight = 50;
    hboxAnnotation.minHeight = 50;
    hboxAnnotation.hidden = true;
    hboxAnnotation.style.height = "80px";

    let hboxCopy: XUL.Box = _document.createElement("hbox");
    hboxCopy.setAttribute("id", "pdf-translate-tabpanel-copy-hbox");
    hboxCopy.setAttribute("flex", "1");
    hboxCopy.setAttribute("align", "center");
    hboxCopy.maxHeight = 50;
    hboxCopy.minHeight = 50;
    hboxCopy.style.height = "80px";

    let SLMenuList = _document.createElement("menulist");
    SLMenuList.setAttribute("id", "pdf-translate-sl");
    SLMenuList.style.width = "145px";
    SLMenuList.setAttribute(
      "value",
      Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage")
    );
    let SLMenuPopup = _document.createElement("menupopup");
    SLMenuList.appendChild(SLMenuPopup);
    for (let lang of this._PDFTranslate.translate.LangCultureNames) {
      let menuitem = _document.createElement("menuitem");
      menuitem.setAttribute("label", lang.DisplayName);
      menuitem.setAttribute("value", lang.LangCultureName);
      menuitem.addEventListener("command", (e: XULEvent) => {
        let newSL = e.target.value;
        Zotero.Prefs.set("ZoteroPDFTranslate.sourceLanguage", newSL);
      });
      SLMenuPopup.appendChild(menuitem);
    }

    let languageLabel = _document.createElement("label");
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
      let SLMenu: XUL.Menulist = _document.getElementById("pdf-translate-sl");
      let TLMenu: XUL.Menulist = _document.getElementById("pdf-translate-tl");
      let sl = SLMenu.value;
      let tl = TLMenu.value;
      Zotero.Prefs.set("ZoteroPDFTranslate.sourceLanguage", tl);
      Zotero.Prefs.set("ZoteroPDFTranslate.targetLanguage", sl);
      SLMenu.value = tl;
      TLMenu.value = sl;
    });

    let TLMenuList = _document.createElement("menulist");
    TLMenuList.setAttribute("id", "pdf-translate-tl");
    TLMenuList.style.width = "145px";
    TLMenuList.setAttribute(
      "value",
      Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage")
    );
    let TLMenuPopup = _document.createElement("menupopup");
    TLMenuList.appendChild(TLMenuPopup);
    for (let lang of this._PDFTranslate.translate.LangCultureNames) {
      let menuitem = _document.createElement("menuitem");
      menuitem.setAttribute("label", lang.DisplayName);
      menuitem.setAttribute("value", lang.LangCultureName);
      menuitem.addEventListener("command", (e: XULEvent) => {
        let newTL = e.target.value;
        Zotero.Prefs.set("ZoteroPDFTranslate.targetLanguage", newTL);
      });
      TLMenuPopup.appendChild(menuitem);
    }
    hboxLanguage.append(SLMenuList, languageLabel, TLMenuList);

    let menuLabel = _document.createElement("label");
    menuLabel.setAttribute("value", "Engine");
    let menulist = _document.createElement("menulist");
    menulist.setAttribute("id", "pdf-translate-engine");
    menulist.setAttribute("flex", "1");
    menulist.setAttribute(
      "value",
      Zotero.Prefs.get("ZoteroPDFTranslate.translateSource")
    );
    let menupopup = _document.createElement("menupopup");
    menulist.appendChild(menupopup);
    for (let source of this._PDFTranslate.translate.sources) {
      let menuitem = _document.createElement("menuitem");
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

    let buttonTranslate = _document.createElement("button");
    buttonTranslate.setAttribute("id", "pdf-translate-call-button");
    buttonTranslate.setAttribute("label", "Translate");
    buttonTranslate.setAttribute("flex", "1");
    buttonTranslate.addEventListener("click", (e: XULEvent) => {
      this._PDFTranslate.events.onTranslateButtonClick(e);
    });

    hboxTranslate.append(menuLabel, menulist, buttonTranslate);

    let buttonUpdateAnnotation = _document.createElement("button");
    buttonUpdateAnnotation.setAttribute("label", "Update Annotation");
    buttonUpdateAnnotation.setAttribute("flex", "1");
    buttonUpdateAnnotation.addEventListener("click", (e: XULEvent) => {
      this._PDFTranslate.events.onAnnotationUpdateButtonClick(e);
    });

    hboxAnnotation.append(buttonUpdateAnnotation);

    let buttonCopySource = _document.createElement("button");
    buttonCopySource.setAttribute("label", "Copy Raw");
    buttonCopySource.setAttribute("flex", "1");
    buttonCopySource.addEventListener("click", (e: XULEvent) => {
      this._PDFTranslate.events.onCopyToClipBoard(
        this._PDFTranslate._sourceText
      );
    });

    let buttonCopyTranslated = _document.createElement("button");
    buttonCopyTranslated.setAttribute("label", "Copy Result");
    buttonCopyTranslated.setAttribute("flex", "1");
    buttonCopyTranslated.addEventListener("click", (e: XULEvent) => {
      this._PDFTranslate.events.onCopyToClipBoard(
        this._PDFTranslate._translatedText
      );
    });

    let buttonCopyBoth = _document.createElement("button");
    buttonCopyBoth.setAttribute("label", "Copy Both");
    buttonCopyBoth.setAttribute("flex", "1");
    buttonCopyBoth.addEventListener("click", (e: XULEvent) => {
      this._PDFTranslate.events.onCopyToClipBoard(
        `${this._PDFTranslate._sourceText}\n----\n${this._PDFTranslate._translatedText}`
      );
    });

    hboxCopy.append(buttonCopySource, buttonCopyTranslated, buttonCopyBoth);

    let textboxSource: XUL.Textbox = _document.createElement("textbox");
    textboxSource.setAttribute("id", "pdf-translate-tabpanel-source");
    textboxSource.setAttribute("flex", "1");
    textboxSource.setAttribute("multiline", true);
    textboxSource.addEventListener("input", (event: XULEvent) => {
      this._PDFTranslate._sourceText = event.target.value;
      this._PDFTranslate.translate._useModified = true;
      if (this._PDFTranslate.events._lastAnnotationID >= 0) {
        this.switchSideBarAnnotationBox(false);
      }
    });
    textboxSource.style["font-size"] = `${Zotero.Prefs.get(
      "ZoteroPDFTranslate.fontSize"
    )}px`;

    let rawResultOrder = Zotero.Prefs.get("ZoteroPDFTranslate.rawResultOrder");
    let splitter = _document.createElement("splitter");
    splitter.setAttribute("id", "pdf-translate-tabpanel-splitter");
    splitter.setAttribute("collapse", rawResultOrder ? "after" : "before");
    let grippy = _document.createElement("grippy");
    splitter.append(grippy);

    let textboxTranslated: XUL.Textbox = _document.createElement("textbox");
    textboxTranslated.setAttribute("id", "pdf-translate-tabpanel-translated");
    textboxTranslated.setAttribute("flex", "1");
    textboxTranslated.setAttribute("multiline", true);
    textboxTranslated.addEventListener("input", (event: XULEvent) => {
      this._PDFTranslate._translatedText = event.target.value;
      this._PDFTranslate.translate._useModified = true;
      if (this._PDFTranslate.events._lastAnnotationID >= 0) {
        this.switchSideBarAnnotationBox(false);
      }
    });
    textboxTranslated.style["font-size"] = `${Zotero.Prefs.get(
      "ZoteroPDFTranslate.fontSize"
    )}px`;

    vbox.append(
      hboxTranslate,
      hboxLanguage,
      rawResultOrder ? textboxTranslated : textboxSource,
      splitter,
      rawResultOrder ? textboxSource : textboxTranslated,
      hboxAnnotation,
      hboxCopy
    );
    return vbox;
  }

  private updateTranslatePanelHidden(_document: Document) {
    try {
      let showSidebarEngine = Zotero.Prefs.get(
        "ZoteroPDFTranslate.showSidebarEngine"
      );
      _document.getElementById("pdf-translate-tabpanel-engine-hbox").hidden =
        !showSidebarEngine;

      let showSidebarLanguage = Zotero.Prefs.get(
        "ZoteroPDFTranslate.showSidebarLanguage"
      );
      _document.getElementById("pdf-translate-tabpanel-language-hbox").hidden =
        !showSidebarLanguage;

      let showSidebarRaw = Zotero.Prefs.get(
        "ZoteroPDFTranslate.showSidebarRaw"
      );
      _document.getElementById("pdf-translate-tabpanel-source").hidden =
        !showSidebarRaw;
      _document.getElementById("pdf-translate-tabpanel-splitter").hidden =
        !showSidebarRaw;

      let showSidebarCopy = Zotero.Prefs.get(
        "ZoteroPDFTranslate.showSidebarCopy"
      );
      _document.getElementById("pdf-translate-tabpanel-copy-hbox").hidden =
        !showSidebarCopy;
    } catch (e) {
      Zotero.debug("ZoteroPDFTranslate: updateTranslatePanelHidden error");
      Zotero.debug(e);
    }
  }

  switchSideBarAnnotationBox(hidden: boolean = true) {
    let annotationBox = document.getElementById(
      "pdf-translate-tabpanel-annotation-hbox"
    );
    if (!annotationBox) {
      return;
    }
    annotationBox.hidden =
      hidden && !Zotero.Prefs.get("ZoteroPDFTranslate.enableCommentEdit");
  }

  updateAllTranslatePanelData() {
    this.updateTranslatePanelData(document);
    if (this.standaloneWindow) {
      this.updateTranslatePanelData(this.standaloneWindow.document);
    }
  }

  private updateTranslatePanelData(_document: Document) {
    if (!_document) {
      return;
    }
    Zotero.debug("ZoteroPDFTranslate: updateTranslatePanelData");
    this.checkSideBarPanel();
    let SLMenuList: XUL.Menulist = _document.getElementById("pdf-translate-sl");
    let TLMenuList: XUL.Menulist = _document.getElementById("pdf-translate-tl");
    let engineMenuList: XUL.Menulist = _document.getElementById(
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

    this.updateTranslatePanelHidden(_document);
  }

  checkSideBarPanel() {
    let panel = document.getElementById("pdf-translate-tabpanel");
    if (!panel) {
      this.buildSideBarPanel();
    }
  }

  buildPopupPanel() {
    Zotero.debug("ZoteroPDFTranslate: buildPopupPanel");
    let currentReader = this._PDFTranslate.reader.currentReader;
    if (!currentReader) {
      return false;
    }
    let selectionMenu =
      currentReader._iframeWindow.document.getElementById("selection-menu");
    if (!selectionMenu) {
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

  buildPopupButton() {
    Zotero.debug("ZoteroPDFTranslate: buildPopupButton");
    let currentReader = this._PDFTranslate.reader.currentReader;
    if (!currentReader) {
      return false;
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

  buildPopupTranslationToNoteButton(selectionMenu: XUL.Element = undefined) {
    let currentReader = this._PDFTranslate.reader.currentReader;

    if (!currentReader || !selectionMenu) {
      return false;
    }
    let addToNoteButton =
      selectionMenu.getElementsByClassName("wide-button")[0];
    let translationToNote = currentReader._iframeWindow.document.getElementById(
      "pdf-translate-popup-add-to-note-button"
    );
    if (
      addToNoteButton &&
      Zotero.Prefs.get("ZoteroPDFTranslate.enableNote") &&
      !translationToNote
    ) {
      Zotero.debug("ZoteroPDFTranslate: buildPopupTranslateNoteButton");
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
          addToNoteButton
        );
      };
      button.style.width = `${selectionMenu.scrollWidth}px`;
      button.style.height = "26px";
      addToNoteButton.after(button);
    }
    return true;
  }

  removePopupPanel() {
    let currentReader = this._PDFTranslate.reader.currentReader;
    if (!currentReader) {
      return false;
    }
    let currentButton = currentReader._iframeWindow.document.getElementById(
      "pdf-translate-popup-button"
    );
    currentButton && currentButton.remove();

    let currentPanel = currentReader._iframeWindow.document.getElementById(
      "pdf-translate-popup"
    );
    currentPanel && currentPanel.remove();
  }

  updatePopupStyle(): void {
    let currentReader = this._PDFTranslate.reader.currentReader;
    if (!currentReader) {
      return;
    }
    Zotero.debug("ZoteroPDFTranslate: updatePopupStyle");
    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    let selectionMenu =
      currentReader._iframeWindow.document.getElementById("selection-menu");
    if (!enablePopup || !this.popupTextBox || !selectionMenu) {
      return;
    }

    // Get current H & W
    // @ts-ignore
    let anonyNodes: any = document.getAnonymousNodes(this.popupTextBox);
    if (!anonyNodes) {
      return;
    }
    let textHeight = anonyNodes[0].childNodes[0].scrollHeight;
    let textWidth = Number(this.popupTextBox.width);
    if (textHeight / textWidth > 0.75) {
      // Update width
      // @ts-ignore
      let newWidth = parseInt(textWidth + 20);
      this.popupTextBox.setAttribute("width", newWidth);
      selectionMenu.style.width = `${newWidth}px`;
      // Check until H/W<0.75
      this.updatePopupStyle();
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
    if (!selectionMenu) {
      return;
    }
    selectionMenu.addEventListener(
      "DOMSubtreeModified",
      function () {
        this.buildPopupTranslationToNoteButton(selectionMenu);
        if (parseInt(selectionMenu.style.height) < selectionMenu.scrollHeight)
          selectionMenu.style.height = `${selectionMenu.scrollHeight}px`;
      }.bind(this),
      false
    );
  }

  buildStandaloneWindow() {
    if (!this.standaloneWindow) {
      return;
    }
    let _document = this.standaloneWindow.document;
    let vbox = this.buildTranslatePanel(_document);

    _document
      .getElementById("pdf-translate-standalone-container")
      .appendChild(vbox);

    let buttonAddExtra: XUL.Element = _document.createElement("button");
    buttonAddExtra.setAttribute("id", `pdf-translate-remove-button-add-extra`);
    buttonAddExtra.setAttribute("label", "+");
    buttonAddExtra.setAttribute("tooltiptext", "Add Extra Engine");
    buttonAddExtra.style.maxWidth = "30px";
    buttonAddExtra.style.minWidth = "30px";
    buttonAddExtra.style.width = "30px";
    buttonAddExtra.addEventListener("click", (e: XULEvent) => {
      let extraEngines: string[] = Zotero.Prefs.get(
        "ZoteroPDFTranslate.extraEngines"
      ).split(",");
      extraEngines.push(Zotero.Prefs.get("ZoteroPDFTranslate.translateSource"));
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.extraEngines",
        extraEngines.filter((e) => e).join(",")
      );
      this.updateStandaloneWindowExtra(_document);
    });

    let keepWindowTop = Zotero.Prefs.get("ZoteroPDFTranslate.keepWindowTop");
    let buttonPin: XUL.Button = _document.createElement("button");
    buttonPin.setAttribute("id", "pdf-translate-pin");
    buttonPin.type = "checkbox";
    buttonPin.checked = keepWindowTop;
    buttonPin.setAttribute("tooltiptext", "Keep Window on Top");
    buttonPin.setAttribute("label", "📌");
    buttonPin.style.maxWidth = "30px";
    buttonPin.style.minWidth = "30px";
    buttonPin.style.width = "30px";
    buttonPin.style["-moz-appearance"] = "none";
    buttonPin.style.backgroundColor = keepWindowTop ? "#bcc4d2" : "#ffffff";

    buttonPin.addEventListener("click", (e: XULEvent) => {
      let newKeepWindowTop = !Zotero.Prefs.get(
        "ZoteroPDFTranslate.keepWindowTop"
      );
      Zotero.Prefs.set("ZoteroPDFTranslate.keepWindowTop", newKeepWindowTop);
      e.target.style.backgroundColor = newKeepWindowTop ? "#bcc4d2" : "#ffffff";
    });

    _document
      .getElementById("pdf-translate-tabpanel-engine-hbox")
      .append(buttonAddExtra, buttonPin);
    this.updateStandaloneWindowExtra(_document);
  }

  updateStandaloneWindowExtra(_document: Document) {
    let extraEngines: string[] = Zotero.Prefs.get(
      "ZoteroPDFTranslate.extraEngines"
    )
      .split(",")
      .filter((e: string) => e);

    Zotero.debug("ZoteroPDFTranslate: updateStandaloneWindowExtra");
    Zotero.debug(`Extra engines: ${extraEngines}`);

    let hbox: XUL.Box;
    hbox = _document.getElementById("pdf-translate-standalone-extra");
    if (hbox) {
      hbox.remove();
    }

    if (extraEngines.length == 0) {
      return;
    }

    hbox = _document.createElement("hbox");
    hbox.setAttribute("id", "pdf-translate-standalone-extra");
    hbox.setAttribute("flex", "1");
    hbox.setAttribute("align", "stretch");

    let vbox = _document.createElement("vbox");
    vbox.setAttribute("id", "pdf-translate-standalone-extra-container");
    vbox.setAttribute("flex", "1");
    vbox.setAttribute("align", "stretch");

    let i = 0;
    for (let engine of extraEngines) {
      if (this._PDFTranslate.translate.sources.indexOf(engine) < 0) {
        Zotero.debug(`Extra engine ${engine} skipped.`);
        continue;
      }
      // Build extra engine result
      let hboxInfo: XUL.Box = _document.createElement("hbox");
      hboxInfo.setAttribute(
        "id",
        `pdf-translate-standalone-hbox-info-extra-${i}`
      );
      hboxInfo.setAttribute("flex", "1");
      hboxInfo.setAttribute("align", "center");
      hboxInfo.maxHeight = 50;
      hboxInfo.minHeight = 50;
      hboxInfo.style.height = "80px";

      let menuLabel = _document.createElement("label");
      menuLabel.setAttribute("value", "Engine");
      let menulist = _document.createElement("menulist");
      menulist.setAttribute("id", `pdf-translate-engine-extra-${i}`);
      menulist.setAttribute("flex", "1");
      menulist.setAttribute("value", engine);
      let menupopup = _document.createElement("menupopup");
      menulist.appendChild(menupopup);
      for (let source of this._PDFTranslate.translate.sources) {
        let menuitem = _document.createElement("menuitem");
        menuitem.setAttribute(
          "label",
          this._PDFTranslate.translate.sourcesName[source]
        );
        menuitem.setAttribute("value", source);
        menuitem.addEventListener("command", (e: XULEvent) => {
          let newSource = e.target.value;
          let _ = e.target.parentElement.parentElement.id.split("-");
          let index = parseInt(_[_.length - 1]);
          let extraEngines: string[] = Zotero.Prefs.get(
            "ZoteroPDFTranslate.extraEngines"
          )
            .split(",")
            .filter((e) => e);
          if (extraEngines.length <= index) {
            this.updateStandaloneWindowExtra(_document);
            return;
          }
          extraEngines[index] = newSource;
          Zotero.Prefs.set(
            "ZoteroPDFTranslate.extraEngines",
            extraEngines.join(",")
          );
          this.updateStandaloneWindowExtra(_document);
        });
        menupopup.appendChild(menuitem);
      }

      let buttonRemove: XUL.Element = _document.createElement("button");
      buttonRemove.setAttribute("id", `pdf-translate-remove-button-extra-${i}`);
      buttonRemove.setAttribute("label", "-");
      buttonRemove.setAttribute("tooltiptext", "Remove Extra Engine");
      buttonRemove.style.maxWidth = "30px";
      buttonRemove.style.minWidth = "30px";
      buttonRemove.style.width = "30px";
      buttonRemove.addEventListener("click", (e: XULEvent) => {
        let _ = e.target.id.split("-");
        let index = parseInt(_[_.length - 1]);
        let extraEngines: string[] = Zotero.Prefs.get(
          "ZoteroPDFTranslate.extraEngines"
        ).split(",");
        if (extraEngines.length <= index) {
          this.updateStandaloneWindowExtra(_document);
          return;
        }
        extraEngines.splice(index, 1);
        Zotero.Prefs.set(
          "ZoteroPDFTranslate.extraEngines",
          extraEngines.filter((e) => e).join(",")
        );
        this.updateStandaloneWindowExtra(_document);
      });

      let textboxTranslated: XUL.Textbox = _document.createElement("textbox");
      textboxTranslated.setAttribute(
        "id",
        `pdf-translate-tabpanel-translated-extra-${i}`
      );
      textboxTranslated.setAttribute("flex", "1");
      textboxTranslated.setAttribute("multiline", true);
      textboxTranslated.style["font-size"] = `${Zotero.Prefs.get(
        "ZoteroPDFTranslate.fontSize"
      )}px`;

      hboxInfo.append(menuLabel, menulist, buttonRemove);
      vbox.append(hboxInfo, textboxTranslated);
      hbox.append(vbox);
      i++;
    }
    _document.getElementById("pdf-translate-vbox").appendChild(hbox);
  }

  updateAllResults() {
    this.updateResults(document);
    if (this.standaloneWindow) {
      this.updateResults(this.standaloneWindow.document);
    }
  }

  private updateResults(_document: Document) {
    // Update error info if not success
    if (this._PDFTranslate._debug) {
      this._PDFTranslate._translatedText = this._PDFTranslate._debug;
    }
    let sideBarTextboxSource: XUL.Textbox = _document.getElementById(
      "pdf-translate-tabpanel-source"
    );
    let sideBarTextboxTranslated: XUL.Textbox = _document.getElementById(
      "pdf-translate-tabpanel-translated"
    );
    if (sideBarTextboxSource) {
      sideBarTextboxSource.value = this._PDFTranslate._sourceText;
    }
    if (sideBarTextboxTranslated) {
      sideBarTextboxTranslated.value = this._PDFTranslate._translatedText;
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

  updateExtraResults(_document: Document, text: string, idx: number) {
    let textbox: XUL.Textbox = _document.getElementById(
      `pdf-translate-tabpanel-translated-extra-${idx}`
    );
    if (!textbox) {
      return;
    }
    textbox.value = text;
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
