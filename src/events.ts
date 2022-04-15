import { TransBase } from "./base";

class TransEvents extends TransBase {
  private _readerSelect: number;
  private notifierCallback: object;
  constructor(parent: PDFTranslate) {
    super(parent);
    this._readerSelect = 0;
    this.notifierCallback = {
      // Call view.updateTranslatePanels when a tab is added or selected
      notify: async (
        event: string,
        type: string,
        ids: Array<string>,
        extraData: object
      ) => {
        if (
          event == "select" &&
          type == "tab" &&
          extraData[ids[0]].type == "reader"
        ) {
          Zotero.debug("ZoteroPDFTranslate: open attachment event detected.");
          this.onReaderSelect();
        }
        if (
          (event == "close" && type == "tab") ||
          (event == "open" && type == "file")
        ) {
          Zotero.debug("ZoteroPDFTranslate: open window event detected.");
          this.onWindowReaderCheck();
          setTimeout(this.onWindowReaderCheck, 1000);
        }
        if (event == "add" && type == "item") {
          Zotero.debug("ZoteroPDFTranslate: add annotation event detected.");
          // Disable the reader loading annotation update
          if (new Date().getTime() - this._readerSelect < 3000) {
            return;
          }
          this.onAnnotationAdd(ids);
        }
      },
    };
  }

  public async onInit() {
    Zotero.debug("ZoteroPDFTranslate: init called");

    this.resetState();

    this.onWindowReaderCheck();

    // Register the callback in Zotero as an item observer
    let notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, [
      "tab",
      "item",
      "file",
    ]);

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener(
      "unload",
      function (e) {
        Zotero.Notifier.unregisterObserver(notifierID);
      },
      false
    );

    this.initKeys();

    this._PDFTranslate.view.updateTranslatePanel();
  }

  public async onSelect(
    event: Event,
    currentReader: ReaderObj,
    disableAuto: boolean
  ) {
    // Zotero.debug(e)
    // Work around to only allow event from ifrme
    if (
      event.target &&
      // @ts-ignore
      event.target.closest &&
      // @ts-ignore
      !event.target.closest("#outerContainer")
    ) {
      return false;
    }

    let enable = Zotero.Prefs.get("ZoteroPDFTranslate.enable");
    let text = this._PDFTranslate.reader.getSelectedText(currentReader);
    let currentButton = currentReader._iframeWindow.document.getElementById(
      "pdf-translate-popup-button"
    );
    let currentNode = currentReader._iframeWindow.document.getElementById(
      "pdf-translate-popup"
    );
    if (!enable || !text || currentButton || currentNode) {
      return false;
    }

    Zotero.debug(
      `ZoteroPDFTranslate: onTranslate. language disable=${disableAuto}`
    );

    let enableAuto =
      Zotero.Prefs.get("ZoteroPDFTranslate.enableAuto") && !disableAuto;
    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup) {
      if (enableAuto) {
        this._PDFTranslate.view.buildPopupPanel(currentReader);
      } else {
        this._PDFTranslate.view.buildPopupButton(currentReader);
      }
    }

    if (enableAuto) {
      await this._PDFTranslate.translate.callTranslate(currentReader);
    }
  }

  public onReaderSelect(): void {
    this._readerSelect = new Date().getTime();
    this._PDFTranslate.view.updateTranslatePanel();
    this.bindAddToNote();
  }

  public onAnnotationAdd(ids: Array<string>): void {
    Zotero.debug("ZoteroPDFTranslate: add annotation translation");
    let items = Zotero.Items.get(ids);

    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      this._PDFTranslate.translate.callTranslateAnnotation(item);
    }
  }

  public onTranslateButtonClick(
    event: XULEvent,
    currentReader = undefined
  ): void {
    if (!currentReader) {
      currentReader = this._PDFTranslate.reader.getReader();
    }
    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup) {
      this._PDFTranslate.view.removePopupPanel(currentReader);
      this._PDFTranslate.view.buildPopupPanel(currentReader);
    }

    this._PDFTranslate.translate.callTranslate(
      currentReader,
      event && event.target.getAttribute("id") == "pdf-translate-call-button"
    );
  }

  public async onTranslateNoteButtonClick(
    event: Event,
    currentReader: Reader,
    addToNoteButton: XUL.Element
  ): Promise<void> {
    if (!currentReader) {
      currentReader = this._PDFTranslate.reader.getReader();
    }
    this._PDFTranslate.translate._enableNote = true;
    addToNoteButton.click();
  }

  private initKeys(_document: Document = undefined): void {
    if (!_document) {
      _document = document;
    }
    let shortcuts: Array<Shortcut> = [
      {
        id: 0,
        func: this.onTranslateButtonClick.bind(this),
        modifiers: null,
        key: "t",
        keycode: undefined,
      },
    ];
    let keyset = _document.createElement("keyset");
    keyset.setAttribute("id", "pdf-translate-keyset");

    for (let i in shortcuts) {
      keyset.appendChild(this.createKey(shortcuts[i], _document));
    }
    _document.getElementById("mainKeyset").parentNode.appendChild(keyset);
  }

  private createKey(keyObj: Shortcut, _document: Document): Element {
    let key = _document.createElement("key");
    key.setAttribute("id", "pdf-translate-key-" + keyObj.id);
    key.setAttribute("oncommand", "//");
    key.addEventListener("command", keyObj.func);
    if (keyObj.modifiers) {
      key.setAttribute("modifiers", keyObj.modifiers);
    }
    if (keyObj.key) {
      key.setAttribute("key", keyObj.key);
    } else if (keyObj.keycode) {
      key.setAttribute("keycode", keyObj.keycode);
    } else {
      // No key or keycode.  Set to empty string to disable.
      key.setAttribute("key", "");
    }
    return key;
  }

  public onCopyToClipBoard(text: string): void {
    Zotero.Utilities.Internal.copyTextToClipboard(text);
    this._PDFTranslate.view.showProgressWindow(
      "Copy To Clipboard",
      text.length < 20 ? text : text.slice(0, 15) + "..."
    );
  }

  // Check readers in seperate window
  private onWindowReaderCheck(): void {
    let readers = this._PDFTranslate.reader.getWindowReader();
    for (let i = 0; i < readers.length; i++) {
      if (!readers[i].PDFTranslateLoad) {
        this._PDFTranslate.view.updateWindowTranslatePanel(readers[i]);
        readers[i].PDFTranslateLoad = true;
      }
    }
  }

  private async bindAddToNote(): Promise<boolean> {
    Zotero.debug("ZoteroPDFTranslate.bindAddToNote");
    let currentReader = this._PDFTranslate.reader.getReader();
    if (!currentReader) {
      return false;
    }
    await currentReader._waitForReader();

    if (currentReader._addToNoteTranslate) {
      return true;
    }
    currentReader._addToNoteOrigin = currentReader._addToNote;
    currentReader._addToNoteTranslate = async (annotations) => {
      Zotero.debug("ZoteroPDFTranslate.addToNoteTranslate Start");
      if (
        this._PDFTranslate.translate._enableNote &&
        Zotero.Prefs.get("ZoteroPDFTranslate.enableNote")
      ) {
        Zotero.debug("ZoteroPDFTranslate.addToNoteTranslate Allowed");
        annotations = await this._PDFTranslate.translate.callTranslateNote(
          annotations
        );
      }
      currentReader._addToNoteOrigin.call(currentReader, annotations);
    };
    currentReader._addToNote = currentReader._addToNoteTranslate;
    return true;
  }

  private resetState(): void {
    // Reset preferrence state.
    let enable = Zotero.Prefs.get("ZoteroPDFTranslate.enable");
    if (typeof enable === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enable", true);
    }

    let enableAuto = Zotero.Prefs.get("ZoteroPDFTranslate.enableAuto");
    if (typeof enableAuto === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enableAuto", true);
    }

    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (typeof enablePopup === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enablePopup", true);
    }

    let enableComment = Zotero.Prefs.get("ZoteroPDFTranslate.enableComment");
    if (typeof enableComment === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enableComment", true);
    }

    let enableNote = Zotero.Prefs.get("ZoteroPDFTranslate.enableNote");
    if (typeof enableNote === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enableNote", true);
    }

    let fontSize = Zotero.Prefs.get("ZoteroPDFTranslate.fontSize");
    if (!fontSize) {
      Zotero.Prefs.set("ZoteroPDFTranslate.fontSize", "12");
    }

    let rawResultOrder = Zotero.Prefs.get("ZoteroPDFTranslate.rawResultOrder");
    if (typeof rawResultOrder === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.rawResultOrder", false);
    }

    let showSidebarEngine = Zotero.Prefs.get(
      "ZoteroPDFTranslate.showSidebarEngine"
    );
    if (typeof showSidebarEngine === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.showSidebarEngine", true);
    }

    let showSidebarLanguage = Zotero.Prefs.get(
      "ZoteroPDFTranslate.showSidebarLanguage"
    );
    if (typeof showSidebarLanguage === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.showSidebarLanguage", true);
    }

    let showSidebarRaw = Zotero.Prefs.get("ZoteroPDFTranslate.showSidebarRaw");
    if (typeof showSidebarRaw === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.showSidebarRaw", true);
    }

    let showSidebarCopy = Zotero.Prefs.get(
      "ZoteroPDFTranslate.showSidebarCopy"
    );
    if (typeof showSidebarCopy === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.showSidebarCopy", true);
    }

    let translateSource = Zotero.Prefs.get(
      "ZoteroPDFTranslate.translateSource"
    );
    let validSource = false;
    for (let e of this._PDFTranslate.translate.sources) {
      if (translateSource == e) {
        validSource = true;
      }
    }

    if (!translateSource || !validSource) {
      // Change default translate engine for zh-CN users
      if (Services.locale.getRequestedLocale() === "zh-CN") {
        translateSource = "googleapi";
      } else {
        translateSource = this._PDFTranslate.translate.sources[0];
      }
      Zotero.Prefs.set("ZoteroPDFTranslate.translateSource", translateSource);
    }

    let langs = this._PDFTranslate.translate.LangCultureNames.map(
      (e) => e.LangCultureName
    );

    let sourceLanguage = Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage");
    let targetLanguage = Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage");
    let validSL = false;
    let validTL = false;
    for (let e of langs) {
      if (sourceLanguage == e) {
        validSL = true;
      }
      if (targetLanguage == e) {
        validTL = true;
      }
    }
    if (!sourceLanguage || !validSL) {
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.sourceLanguage",
        this._PDFTranslate.translate.defaultSourceLanguage
      );
    }

    if (!targetLanguage || !validTL) {
      targetLanguage = Services.locale.getRequestedLocale();
      Zotero.Prefs.set("ZoteroPDFTranslate.targetLanguage", targetLanguage);
    }

    let secret = Zotero.Prefs.get("ZoteroPDFTranslate.secret");
    if (typeof secret === "undefined") {
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.secret",
        this._PDFTranslate.translate.defaultSecret[translateSource]
      );
    }

    let secretObj = Zotero.Prefs.get("ZoteroPDFTranslate.secretObj");
    if (typeof secretObj === "undefined") {
      secretObj = this._PDFTranslate.translate.defaultSecret;
      secretObj[translateSource] = secret;
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.secretObj",
        JSON.stringify(secretObj)
      );
    }

    let disabledLanguages = Zotero.Prefs.get(
      "ZoteroPDFTranslate.disabledLanguages"
    );
    if (typeof disabledLanguages === "undefined") {
      if (Services.locale.getRequestedLocale() === "zh-CN") {
        Zotero.Prefs.set(
          "ZoteroPDFTranslate.disabledLanguages",
          "zh,中文,中文;"
        );
      } else {
        Zotero.Prefs.set("ZoteroPDFTranslate.disabledLanguages", "");
      }
    }
  }
}

export default TransEvents;
