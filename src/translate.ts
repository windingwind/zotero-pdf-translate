import { TransConfig } from "./config";
import { baidu } from "./translate/baidu";
import { baidufield } from "./translate/baidufield";
import { caiyun } from "./translate/caiyun";
import { deeplfree, deeplpro, deepl } from "./translate/deepl";
import { google, googleapi, _google } from "./translate/google";
import { microsoft } from "./translate/microsoft";
import { niutrans, niutranspro, niutransapi } from "./translate/niutrans";
import { openl } from "./translate/openl";
import { tencent } from "./translate/tencent";
import { youdao } from "./translate/youdao";
import { youdaozhiyun } from "./translate/youdaozhiyun";
import { youdaodict } from "./dict/youdaodict";
import { bingdict } from "./dict/bingdict";
import { freedictionaryapi } from "./dict/freedictionaryapi";

class TransEngine extends TransConfig {
  _translateTime: number;
  _useModified: boolean;
  _lastAnnotationID: number;
  _enableNote: boolean;
  baidu: Function;
  baidufield: Function;
  caiyun: Function;
  deeplpro: Function;
  deeplfree: Function;
  deepl: Function;
  google: Function;
  googleapi: Function;
  _google: Function;
  microsoft: Function;
  niutrans: Function;
  niutranspro: Function;
  niutransapi: Function;
  openl: Function;
  tencent: Function;
  youdao: Function;
  youdaozhiyun: Function;
  youdaodict: Function;
  bingdict: Function;
  freedictionaryapi: Function;

  constructor(parent: PDFTranslate) {
    super(parent);
    this._translateTime = 0;
    this._useModified = false;
    this._lastAnnotationID = -1;
    this._enableNote = false;

    this.baidu = baidu;
    this.baidufield = baidufield;
    this.caiyun = caiyun;
    this.deeplfree = deeplfree;
    this.deeplpro = deeplpro;
    this.deepl = deepl;
    this.google = google;
    this.googleapi = googleapi;
    this._google = _google;
    this.microsoft = microsoft;
    this.niutrans = niutrans;
    this.niutranspro = niutranspro;
    this.niutransapi = niutransapi;
    this.openl = openl;
    this.tencent = tencent;
    this.youdao = youdao;
    this.youdaozhiyun = youdaozhiyun;
    this.youdaodict = youdaodict;
    this.bingdict = bingdict;
    this.freedictionaryapi = freedictionaryapi;
  }

  async callTranslate(text: string = "", disableCache: boolean = true) {
    text = text || this._PDFTranslate._selectedText;
    Zotero.debug(`callTranslate: ${text}`);

    if (this._useModified) {
      Zotero.debug("ZoteroPDFTranslate: Using modified text");
      text = this._PDFTranslate._sourceText;
    }
    if (
      !disableCache &&
      // Blank
      (/^\s*$/.test(text) ||
        // Unchanged
        this._PDFTranslate._sourceText === text)
    ) {
      Zotero.debug("ZoteroPDFTranslate: Using cache");
      this._PDFTranslate.view.updateAllResults();
      this._PDFTranslate.view.updatePopupStyle();
      return true;
    }

    Zotero.debug(`Real text is ${text}`);
    this._PDFTranslate._sourceText = text;
    this._PDFTranslate._translatedText = "";
    this._PDFTranslate._debug = "";
    this._PDFTranslate.view.updateAllTranslatePanelData(document);
    this._PDFTranslate.view.updateAllResults();
    this._PDFTranslate.view.updatePopupStyle();

    let t = new Date().getTime();
    this._translateTime = t;
    Zotero.debug(`ZoteroPDFTranslate: Translate ${t} start.`);

    this.callTranslateExtra();

    let success = await this.getTranslation();

    Zotero.debug(`ZoteroPDFTranslate: Translate ${t} returns ${success}`);
    if (this._translateTime > t) {
      Zotero.debug(`ZoteroPDFTranslate: Translate ${t} overwritten.`);
      return true;
    }

    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup && this._PDFTranslate.view.popupTextBox) {
      this._PDFTranslate.view.popupTextBox.remove();
      this._PDFTranslate.view.buildPopupPanel();
    }
    // Update result
    this._PDFTranslate.view.updateAllResults();
    this._PDFTranslate.view.updatePopupStyle();
    return true;
  }

  async callTranslateExtra() {
    let text: string = this._PDFTranslate._sourceText;
    let _window: Window = this._PDFTranslate.view.standaloneWindow;
    if (!text.trim() || !_window || _window.closed) {
      return;
    }
    Zotero.debug("ZoteroPDFTranslate: callTranslateExtra");
    let extraEngines: string[] = Zotero.Prefs.get(
      "ZoteroPDFTranslate.extraEngines"
    )
      .split(",")
      .filter((e: string) => e);
    let i = 0;
    for (let engine of extraEngines) {
      let translatedText = await this.getTranslation(engine, text);
      Zotero.debug(
        `ZoteroPDFTranslate: TranslateExtra returns ${translatedText}`
      );
      this._PDFTranslate.view.updateExtraResults(
        _window.document,
        translatedText,
        i
      );
      i++;
    }
  }

  async callTranslateAnnotation(
    item: ZoteroItem,
    forceTranslate: boolean = false
  ) {
    this._translateTime = new Date().getTime();
    let disable = this.getLanguageDisable(
      this.getRootItem(item).getField("language").split("-")[0]
    );
    if (
      item.isAnnotation() &&
      item.annotationType == "highlight" &&
      (forceTranslate ||
        (Zotero.Prefs.get("ZoteroPDFTranslate.enableComment") && !disable)) &&
      (forceTranslate || !item.annotationComment)
    ) {
      // Update sidebar
      this._PDFTranslate.view.updateAllTranslatePanelData();

      if (this._PDFTranslate._sourceText != item.annotationText) {
        this._PDFTranslate._sourceText = item.annotationText;
        let success = await this.getTranslation();
        if (!success) {
          this._PDFTranslate.view.showProgressWindow(
            "Annotation Translate Failed",
            this._PDFTranslate._debug,
            "fail"
          );
          return false;
        }
      }
      let text = this._PDFTranslate._translatedText;
      const position = Zotero.Prefs.get(
        "ZoteroPDFTranslate.annotationTranslationPosition"
      );
      if (position === "comment") {
        item.annotationComment = `${
          item.annotationComment ? item.annotationComment : ""
        }\n${text}`;
      } else if (position == "body") {
        item.annotationText = `${
          item.annotationText ? item.annotationText : ""
        }\n${text}`;
      }
      await item.saveTx();
      this._PDFTranslate.view.showProgressWindow(
        "Annotation Translation Saved",
        text.length < 20 ? text : text.slice(0, 15) + "..."
      );
      if (Zotero.Prefs.get("ZoteroPDFTranslate.enableCommentEdit")) {
        this._PDFTranslate.view.updateAllResults();
      }
      this._lastAnnotationID = item.id;
      return true;
    }
    return false;
  }

  async callTranslateNote(annotations: Array<Annotation>) {
    this._translateTime = new Date().getTime();
    try {
      for (let annotation of annotations) {
        if (this._PDFTranslate._sourceText !== annotation.text) {
          this._PDFTranslate._sourceText = annotation.text;
          await this.getTranslation();
        }
        annotation.text = `${this._PDFTranslate._sourceText}\n----\n${this._PDFTranslate._translatedText}\n`;
      }
    } catch (e) {
      Zotero.debug(`ZoteroPDFTranslate.callTranslateNote Error: ${e}`);
    }
    this._enableNote = false;
    Zotero.debug(`ZoteroPDFTranslate.callTranslateNote : ${annotations}`);
    return annotations;
  }

  public async callTranslateTitle(
    items: Array<ZoteroItem>,
    force: boolean = false,
    noAlert: boolean = false,
    noRetry: boolean = false,
    noSave: boolean = false
  ) {
    this._translateTime = new Date().getTime();
    let status = {};
    let itemCount = items.length;
    if (items.length > 1) {
      // Update titles in batch
      let titles: string[] = [];
      let titleSplitter = "©";
      let itemSplitter = "℗";

      while (items.length > 0) {
        let batchItems = items.splice(0, 10);
        for (let item of batchItems) {
          // Skip translated or language disabled title
          if (
            (!force && item.getField("shortTitle").indexOf("🔤") >= 0) ||
            this.getLanguageDisable(item.getField("language").split("-")[0])
          ) {
            continue;
          }
          titles.push(`${item.id} ${titleSplitter} ${item.getField("title")}`);
          status[item.id] = false;
        }

        Zotero.debug(
          `ZoteroPDFTranslate: callTranslateTitle, count=${titles.length}`
        );
        if (titles.length == 0) {
          return status;
        }
        let titleText = titles.join(` ${itemSplitter} `);
        this._PDFTranslate._sourceText = titleText;
        let success = await this.getTranslation();
        if (!success) {
          Zotero.debug("ZoteroPDFTranslate.callTranslateTitle failed");
          return status;
        }
        for (let _ of this._PDFTranslate._translatedText.split(itemSplitter)) {
          let itemID = _.split(titleSplitter)[0].trim();
          let newTitle = _.split(titleSplitter)[1];
          Zotero.debug(`${itemID}, ${newTitle}`);
          // Retry
          try {
            let item = Zotero.Items.get(itemID);
            if (item) {
              if (!noSave) {
                item.setField("shortTitle", "🔤" + newTitle);
                await item.saveTx();
              }
              status[itemID] = newTitle;
            }
          } catch (e) {
            Zotero.debug(e);
          }
        }
      }
    } else {
      let item = items[0];
      if (
        (!force && item.getField("shortTitle").indexOf("🔤") >= 0) ||
        this.getLanguageDisable(item.getField("language").split("-")[0])
      ) {
        return status;
      }
      status[item.id] = false;
      this._PDFTranslate._sourceText = item.getField("title");
      let success = await this.getTranslation();
      if (!success) {
        Zotero.debug("ZoteroPDFTranslate.callTranslateTitle failed");
        return status;
      }
      try {
        if (!noSave) {
          item.setField(
            "shortTitle",
            "🔤" + this._PDFTranslate._translatedText
          );
          await item.saveTx();
        }
        status[item.id] = this._PDFTranslate._translatedText;
      } catch (e) {
        Zotero.debug(e);
      }
    }

    for (let itemID in status) {
      if (!noRetry && !status[itemID]) {
        let _status = await this.callTranslateTitle(
          Zotero.Items.get([itemID]),
          force,
          true,
          true,
          noSave
        );
        status[itemID] = _status[itemID];
      }
    }
    let successCount = 0;
    let failCount = 0;
    for (let i in status) {
      if (status[i]) {
        successCount += 1;
      } else {
        failCount += 1;
      }
    }
    if (!noAlert) {
      this._PDFTranslate.view.showProgressWindow(
        "Title Translation",
        `${successCount} items updated, ${failCount} failed, ${
          itemCount - successCount - failCount
        } skipped.`
      );
    }
    return status;
  }

  public async callTranslateAbstract(
    items: Array<ZoteroItem>,
    force: boolean = false,
    noAlert: boolean = false,
    noRetry: boolean = false,
    noSave: boolean = false
  ) {
    this._translateTime = new Date().getTime();
    let status = {};
    let itemCount = items.length;
    if (items.length > 1) {
      // Update titles in batch
      let titles: string[] = [];
      let titleSplitter = "©";
      let itemSplitter = "℗";

      while (items.length > 0) {
        let batchItems = items.splice(0, 10);
        for (let item of batchItems) {
          // Skip translated or language disabled title
          if (
            (!force && item.getField("abstractNote").indexOf("🔤") >= 0) ||
            this.getLanguageDisable(item.getField("language").split("-")[0])
          ) {
            continue;
          }
          titles.push(
            `${item.id} ${titleSplitter} ${item.getField("abstractNote")}`
          );
          status[item.id] = false;
        }

        Zotero.debug(
          `ZoteroPDFTranslate: callTranslateAbstract, count=${titles.length}`
        );
        if (titles.length == 0) {
          return status;
        }
        let titleText = titles.join(` ${itemSplitter} `);
        this._PDFTranslate._sourceText = titleText;
        let success = await this.getTranslation();
        if (!success) {
          Zotero.debug("ZoteroPDFTranslate.callTranslateAbstract failed");
          return status;
        }
        for (let _ of this._PDFTranslate._translatedText.split(itemSplitter)) {
          let itemID = _.split(titleSplitter)[0].trim();
          let newTitle = _.split(titleSplitter)[1];
          Zotero.debug(`${itemID}, ${newTitle}`);
          // Retry
          try {
            let item = Zotero.Items.get(itemID);
            if (item) {
              if (!noSave) {
                item.setField(
                  "abstractNote",
                  "🔤" + newTitle + item.getField("abstractNote")
                );
                await item.saveTx();
              }
              status[itemID] = newTitle;
            }
          } catch (e) {
            Zotero.debug(e);
          }
        }
      }
    } else {
      let item = items[0];
      if (
        (!force && item.getField("abstractNote").indexOf("🔤") >= 0) ||
        this.getLanguageDisable(item.getField("language").split("-")[0])
      ) {
        return status;
      }
      status[item.id] = false;
      this._PDFTranslate._sourceText = item.getField("abstractNote");
      let success = await this.getTranslation();
      if (!success) {
        Zotero.debug("ZoteroPDFTranslate.callTranslateTitle failed");
        return status;
      }
      try {
        if (!noSave) {
          item.setField(
            "abstractNote",
            "🔤" +
              this._PDFTranslate._translatedText +
              item.getField("abstractNote")
          );
          await item.saveTx();
        }
        status[item.id] = this._PDFTranslate._translatedText;
      } catch (e) {
        Zotero.debug(e);
      }
    }

    for (let itemID in status) {
      if (!noRetry && !status[itemID]) {
        let _status = await this.callTranslateAbstract(
          Zotero.Items.get([itemID]),
          force,
          true,
          true,
          noSave
        );
        status[itemID] = _status[itemID];
      }
    }
    let successCount = 0;
    let failCount = 0;
    for (let i in status) {
      if (status[i]) {
        successCount += 1;
      } else {
        failCount += 1;
      }
    }
    if (!noAlert) {
      this._PDFTranslate.view.showProgressWindow(
        "Abstract Translation",
        `${successCount} items updated, ${failCount} failed, ${
          itemCount - successCount - failCount
        } skipped.`
      );
    }
    return status;
  }

  public async getTranslation(
    engine: string = undefined,
    text: string = undefined
  ): Promise<boolean | string> {
    // If Text is defined, result will not be stored in the global _translatedText
    // Call current translate engine
    let args = this.getArgs(engine, text);
    let retry = false;
    Zotero.debug(args);
    if (!engine) {
      // Only Eng-Chn and Eng-Eng translation support word definition now
      if (
        Zotero.Prefs.get("ZoteroPDFTranslate.enableDict") &&
        args.text.trim().split(/[^a-z,A-Z]+/).length == 1
      ) {
        engine = Zotero.Prefs.get("ZoteroPDFTranslate.dictSource");
        retry = true;
      } else {
        engine = Zotero.Prefs.get("ZoteroPDFTranslate.translateSource");
      }
    }

    // bool return for success or fail
    let translateStatus: boolean | string = await this[engine](text);
    if (!translateStatus && retry) {
      this._PDFTranslate._debug = "";
      engine = Zotero.Prefs.get("ZoteroPDFTranslate.translateSource");
      translateStatus = await this[engine](text);
    }
    return translateStatus;
  }

  public getLanguageDisable(currentLanguage: string = undefined): boolean {
    if (typeof currentLanguage == "undefined") {
      currentLanguage = this.getRootItem(
        Zotero.Items.get(this._PDFTranslate.reader.currentReader.itemID)
      )
        .getField("language")
        .split("-")[0];
    }
    let disable = false;
    if (currentLanguage) {
      let disabledLanguages = Zotero.Prefs.get(
        "ZoteroPDFTranslate.disabledLanguages"
      ).split(",");
      for (let i = 0; i < disabledLanguages.length; i++) {
        if (disabledLanguages[i] == currentLanguage) {
          disable = true;
          break;
        }
      }
    }
    return disable;
  }

  public getRootItem(item: ZoteroItem): ZoteroItem {
    let rootItem = item;
    while (rootItem.parentItem) {
      rootItem = rootItem.parentItem;
    }
    return rootItem;
  }

  private getArgs(
    engine: string = undefined,
    text: string = undefined
  ): TransArgs {
    if (!engine) {
      engine = Zotero.Prefs.get("ZoteroPDFTranslate.translateSource");
    }
    let secret = JSON.parse(Zotero.Prefs.get("ZoteroPDFTranslate.secretObj"))[
      engine
    ];
    if (typeof secret === "undefined") {
      secret = "";
    }
    let sl = Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage");
    if (typeof sl === "undefined") {
      sl = this.defaultSourceLanguage;
    }
    let tl = Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage");
    if (typeof tl === "undefined") {
      tl = this.defaultTargetLanguage;
    }
    text = (text ? text : this._PDFTranslate._sourceText)
      .replace(/[\u0000-\u001F\u007F-\u009F]/gu, " ")
      .normalize("NFKC");

    return {
      secret,
      sl,
      tl,
      text,
    };
  }

  private async safeRun(func: Function, args: any = null) {
    try {
      return await func(args);
    } catch (e) {
      Zotero.debug(e);
      this._PDFTranslate._debug = e;
      return false;
    }
  }
  private getErrorInfo(errorType: string) {
    if (errorType == "request") {
      return `[Request Error]
Engine not available, invalid secret, or request too fast.
Use another translation engine or post the issue here: https://github.com/windingwind/zotero-pdf-translate/issues
The message below is from ${
        this.sourcesName[Zotero.Prefs.get("ZoteroPDFTranslate.translateSource")]
      }, not Zotero or the PDF Translate addon.
        ${this._PDFTranslate._debug}`;
    } else if (errorType == "parse") {
      return `[Parse Error]
Report issue here: https://github.com/windingwind/zotero-pdf-translate/issues
        ${this._PDFTranslate._debug}`;
    } else {
      return `[Unknown Error]
Report issue here: https://github.com/windingwind/zotero-pdf-translate/issues
        ${this._PDFTranslate._debug}`;
    }
  }
  async requestTranslate(
    request_func: Function,
    parse_func: Function
  ): Promise<string | boolean> {
    let xhr = await this.safeRun(request_func);
    Zotero.debug(xhr);

    if (xhr && xhr.status && xhr.status === 200) {
      let res = await this.safeRun(parse_func, xhr);
      if (res) {
        return res;
      }
    }
    this._PDFTranslate._debug = this.getErrorInfo("request");
    return false;
  }
}

export default TransEngine;
