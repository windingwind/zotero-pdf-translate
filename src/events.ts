import { TransBase } from "./base";

class TransEvents extends TransBase {
  private _readerSelect: number;
  private _titleTranslation: boolean;
  private notifierCallback: object;
  constructor(parent: PDFTranslate) {
    super(parent);
    this._readerSelect = 0;
    this._titleTranslation = false;
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
          const reader = Zotero.Reader.getByTabID(ids[0]);
          await reader._initPromise;
          this.onReaderSelect(reader);
        }
        if (
          (event == "close" && type == "tab") ||
          (event == "open" && type == "file")
        ) {
          Zotero.debug("ZoteroPDFTranslate: open window event detected.");
          this.onWindowReaderCheck();
          setTimeout(this.onWindowReaderCheck.bind(this), 1000);
        }
        if (event == "add" && type == "item") {
          Zotero.debug("ZoteroPDFTranslate: add annotation event detected.");
          // Disable the reader loading annotation update
          if (new Date().getTime() - this._readerSelect < 3000) {
            return;
          }
          this.onAnnotationAdd(ids);
        }
        if (
          (event == "select" &&
            type == "tab" &&
            extraData[ids[0]].type == "reader") ||
          (event === "add" &&
            type === "item" &&
            Zotero.Items.get(ids).filter((item) => {
              return item.isAnnotation();
            }).length > 0) ||
          (event === "close" && type === "tab") ||
          (event === "open" && type === "file")
        ) {
          Zotero.debug("ZoteroPDFTranslate: buildTranslateAnnotationButton");
          this.onAnnotationButtonAdd();
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
  }

  public async onSelect(
    event: Event,
    currentReader: ReaderObj,
    disableAuto: boolean
  ) {
    // Zotero.debug(event);
    // console.log(event);
    // Work around to only allow event from ifrme
    if (
      !event.target ||
      // @ts-ignore
      !event.target.closest ||
      // @ts-ignore
      !event.target.closest("#outerContainer")
    ) {
      return false;
    }
    if (!currentReader) {
      currentReader = await this._PDFTranslate.reader.getReader();
    }
    this._PDFTranslate.reader.currentReader = currentReader;
    // Disable modified text translation in side-bar
    this._PDFTranslate.translate._useModified = false;
    // Disable annotation modification
    this._PDFTranslate.translate._lastAnnotationID = -1;
    this._PDFTranslate.view.hideSideBarAnnotationBox(true);

    let enable = Zotero.Prefs.get("ZoteroPDFTranslate.enable");
    let isConcat = (event as KeyboardEvent).altKey;
    let text = this._PDFTranslate.reader.getSelectedText(currentReader).trim();
    this._PDFTranslate._selectedText = isConcat
      ? this._PDFTranslate._selectedText + " " + text
      : text;
    Zotero.debug(
      `ZoteroPDFTranslate: Selected ${this._PDFTranslate._selectedText}`
    );
    let currentButton = currentReader._iframeWindow.document.getElementById(
      "pdf-translate-popup-button"
    );
    let currentNode = currentReader._iframeWindow.document.getElementById(
      "pdf-translate-popup"
    );
    if (
      !enable ||
      !this._PDFTranslate._selectedText ||
      currentButton ||
      currentNode
    ) {
      return false;
    }

    if (isConcat) {
      this._PDFTranslate.view.showProgressWindow(
        "PDF Translate",
        `Selected Text: ${this._PDFTranslate._selectedText}`
      );
    }

    Zotero.debug(
      `ZoteroPDFTranslate: onTranslate. language disable=${disableAuto}`
    );

    let enableAuto =
      Zotero.Prefs.get("ZoteroPDFTranslate.enableAuto") && !disableAuto;
    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup) {
      if (enableAuto) {
        this._PDFTranslate.view.buildPopupPanel();
      } else {
        this._PDFTranslate.view.buildPopupButton();
      }
    }

    if (enableAuto) {
      await this._PDFTranslate.translate.callTranslate(
        this._PDFTranslate._selectedText
      );
    }
  }

  public async onReaderSelect(reader): Promise<void> {
    this._readerSelect = new Date().getTime();
    this._PDFTranslate.reader.currentReader = reader;
    this._PDFTranslate.view.updateTranslatePanel(reader);
    this.bindAddToNote(this._PDFTranslate.reader.currentReader);
  }

  public onAnnotationAdd(ids: Array<string>): void {
    Zotero.debug("ZoteroPDFTranslate: add annotation translation");
    let items = Zotero.Items.get(ids);

    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      this._PDFTranslate.translate.callTranslateAnnotation(item);
    }
  }

  public async onAnnotationButtonAdd() {
    for (const reader of Zotero.Reader._readers) {
      let t = 0;
      while (
        t < 100 &&
        !(await this._PDFTranslate.view.updateTranslateAnnotationButton(reader))
      ) {
        await Zotero.Promise.delay(50);
        t += 1;
      }
    }
  }

  public onAnnotationUpdateButtonClick(event: XULEvent): void {
    if (this._PDFTranslate.translate._lastAnnotationID < 0) {
      return;
    }
    Zotero.debug("ZoteroPDFTranslate: onAnnotationUpdateButtonClick");
    let item: ZoteroItem = Zotero.Items.get(
      this._PDFTranslate.translate._lastAnnotationID
    );
    if (item && item.isAnnotation() && item.annotationType == "highlight") {
      item.annotationText = this._PDFTranslate._sourceText;
      item.annotationComment = this._PDFTranslate._translatedText;
      item.saveTx();
    }
  }

  public onTranslateKey(event: XULEvent) {
    if (Zotero_Tabs.selectedID == "zotero-pane") {
      this.onSwitchTitle(!this._titleTranslation);
    } else {
      this.onTranslateButtonClick(event);
    }
  }

  public onTranslateButtonClick(event: XULEvent): void {
    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup) {
      this._PDFTranslate.view.removePopupPanel();
      this._PDFTranslate.view.buildPopupPanel();
    }

    this._PDFTranslate.translate.callTranslate(
      "",
      event && event.target.getAttribute("id") == "pdf-translate-call-button"
    );
    event.preventDefault();
  }

  public async onTranslateTitle(selectedType: string, force: boolean = false) {
    let isFeed =
      Zotero.Libraries.get(ZoteroPane.getSelectedLibraryID()).libraryType ==
      "feed";
    if (!ZoteroPane.canEdit() && !isFeed) {
      ZoteroPane.displayCannotEditLibraryMessage();
      return false;
    }

    Zotero.debug(`ZoteroPDFTranslate: onTranslateTitle, type=${selectedType}`);
    let items: ZoteroItem[] = [];
    if (selectedType == "collection") {
      if (isFeed) {
        this._PDFTranslate.view.showProgressWindow(
          "Title Translation",
          "Feed collections not supported. Select feed items instead.",
          "fail"
        );
        return false;
      }
      let collection = ZoteroPane.getSelectedCollection(false);

      if (collection) {
        collection.getChildItems(false, false).forEach(function (item) {
          items.push(item);
        });
      }
    } else if (selectedType == "items") {
      items = ZoteroPane.getSelectedItems();
    }

    let status = await this._PDFTranslate.translate.callTranslateTitle(
      items,
      force
    );
    await Zotero.Promise.delay(200);
    Zotero.debug(status);
    this.onSwitchTitle(true);
    return true;
  }

  public async onSwitchTitle(show: boolean) {
    Zotero.debug(`ZoteroPDFTranslate: onSwitchTitle, ${show}`);
    this._titleTranslation = show;
    let rowElements = ZoteroPane.itemsView.domEl.getElementsByClassName("row");

    let rows: ZoteroItem[] = ZoteroPane.itemsView._rows;

    for (let rowElement of rowElements) {
      let currentRow = rows[rowElement.id.split("-")[5]];
      if (
        this._PDFTranslate.translate.getLanguageDisable(
          currentRow.getField("language").split("-")[0]
        ) ||
        // Skip blank
        (show && currentRow.getField("shortTitle").indexOf("🔤") < 0)
      ) {
        continue;
      }
      let newInnerHTML = show
        ? // Switch to origin titles
          currentRow.getField("shortTitle")
        : // Switch to translated titles
          currentRow.getField("title");
      let titleElement = rowElement.getElementsByClassName(
        "cell-text"
      )[0] as Element;
      if (titleElement.innerHTML === newInnerHTML) {
        continue;
      }
      titleElement.innerHTML = newInnerHTML;
      Zotero.debug(`ZoteroPDFTranslate: switch in ${rowElement.id}`);
    }
  }

  public async onTranslateAbstract(
    selectedType: string,
    force: boolean = false
  ) {
    let isFeed =
      Zotero.Libraries.get(ZoteroPane.getSelectedLibraryID()).libraryType ==
      "feed";
    if (!ZoteroPane.canEdit() && !isFeed) {
      ZoteroPane.displayCannotEditLibraryMessage();
      return false;
    }

    Zotero.debug(
      `ZoteroPDFTranslate: onTranslateAbstract, type=${selectedType}`
    );
    let items: ZoteroItem[] = [];
    if (selectedType == "collection") {
      if (isFeed) {
        this._PDFTranslate.view.showProgressWindow(
          "Abstract Translation",
          "Feed collections not supported. Select feed items instead.",
          "fail"
        );
        return false;
      }
      let collection = ZoteroPane.getSelectedCollection(false);

      if (collection) {
        collection.getChildItems(false, false).forEach(function (item) {
          items.push(item);
        });
      }
    } else if (selectedType == "items") {
      items = ZoteroPane.getSelectedItems();
    }

    let status = await this._PDFTranslate.translate.callTranslateAbstract(
      items,
      force
    );
    Zotero.debug(status);
    return true;
  }

  public async onTranslateNoteButtonClick(
    event: Event,
    addToNoteButton: XUL.Element
  ): Promise<void> {
    this._PDFTranslate.translate._enableNote = true;
    addToNoteButton.click();
  }

  public async onOpenStandaloneWindow() {
    if (
      this._PDFTranslate.view.standaloneWindow &&
      !this._PDFTranslate.view.standaloneWindow.closed
    ) {
      this._PDFTranslate.view.standaloneWindow.focus();
    } else {
      let win = window.open(
        "chrome://zoteropdftranslate/content/standalone.xul",
        "_blank",
        "chrome,extrachrome,menubar,resizable,scrollbars,status,width=356,height=600"
      );
      this._PDFTranslate.view.standaloneWindow = win;
    }
  }

  private initKeys(_document: Document = undefined): void {
    if (!_document) {
      _document = document;
    }
    let shortcuts: Array<Shortcut> = [
      {
        id: "oldTranslate",
        func: this.onTranslateKey.bind(this),
        modifiers: null,
        key: "t",
        keycode: undefined,
      },
      {
        id: "translate",
        func: this.onTranslateKey.bind(this),
        modifiers: "accel",
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
  private async onWindowReaderCheck() {
    let readers = this._PDFTranslate.reader.getWindowReader();
    for (let i = 0; i < readers.length; i++) {
      if (!readers[i].PDFTranslateLoad) {
        this._PDFTranslate.reader.currentReader = readers[i];
        await this._PDFTranslate.view.updateWindowTranslatePanel(readers[i]);
        readers[i].PDFTranslateLoad = true;
      }
    }
  }

  private async bindAddToNote(currentReader: ReaderObj): Promise<boolean> {
    Zotero.debug("ZoteroPDFTranslate.bindAddToNote");
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

    let annotationTranslationPosition = Zotero.Prefs.get(
      "ZoteroPDFTranslate.annotationTranslationPosition"
    );
    if (typeof annotationTranslationPosition === "undefined") {
      annotationTranslationPosition = "comment";
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.annotationTranslationPosition",
        annotationTranslationPosition
      );
    }

    let enableCommentEdit = Zotero.Prefs.get(
      "ZoteroPDFTranslate.enableCommentEdit"
    );
    if (typeof enableCommentEdit === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enableCommentEdit", true);
    }
    if (annotationTranslationPosition === "body") {
      // Disable enableCommentEdit when translations are saved to the annotation body
      Zotero.Prefs.set("ZoteroPDFTranslate.enableCommentEdit", false);
    }

    let enableNote = Zotero.Prefs.get("ZoteroPDFTranslate.enableNote");
    if (typeof enableNote === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enableNote", true);
    }

    let enableDict = Zotero.Prefs.get("ZoteroPDFTranslate.enableDict");
    if (typeof enableDict === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enableDict", true);
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

    let keepWindowTop = Zotero.Prefs.get("ZoteroPDFTranslate.keepWindowTop");
    if (typeof keepWindowTop === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.keepWindowTop", false);
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

    let dictSource = Zotero.Prefs.get("ZoteroPDFTranslate.dictSource");
    validSource = false;
    for (let e of this._PDFTranslate.translate.sources) {
      if (dictSource == e) {
        validSource = true;
      }
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

    if (!dictSource || !validSource) {
      if (targetLanguage.startsWith("zh")) {
        dictSource = "youdaodict";
      } else {
        dictSource = "freedictionaryapi";
      }
      Zotero.Prefs.set("ZoteroPDFTranslate.dictSource", dictSource);
    }

    let secretObj = Zotero.Prefs.get("ZoteroPDFTranslate.secretObj");
    if (typeof secretObj === "undefined") {
      secretObj = this._PDFTranslate.translate.defaultSecret;
      secretObj[translateSource] =
        this._PDFTranslate.translate.defaultSecret[translateSource];
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

    let extraEngines = Zotero.Prefs.get("ZoteroPDFTranslate.extraEngines");
    if (typeof extraEngines === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.extraEngines", "");
    }
  }
}

export default TransEvents;
