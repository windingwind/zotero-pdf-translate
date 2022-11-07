import { TransConfig } from "./config";
import { baidu } from "./translate/baidu";
import { baidufield } from "./translate/baidufield";
import { caiyun } from "./translate/caiyun";
import { cnki } from "./translate/cnki";
import { deeplfree, deeplpro, deepl } from "./translate/deepl";
import { google, googleapi, _google } from "./translate/google";
import { microsoft } from "./translate/microsoft";
import {
  niutrans,
  niutranspro,
  niutransapi,
  niutransLog,
} from "./translate/niutrans";
import { openl } from "./translate/openl";
import { tencent } from "./translate/tencent";
import { youdao } from "./translate/youdao";
import { youdaozhiyun } from "./translate/youdaozhiyun";
import { youdaodict } from "./dict/youdaodict";
import { bingdict } from "./dict/bingdict";
import { freedictionaryapi } from "./dict/freedictionaryapi";
import { webliodict } from "./dict/weblio";
import PDFTranslate from "./addon";
import { TransArgs } from "./base";
import { collinsdict } from "./dict/collins";

class TransEngine extends TransConfig {
  _translateTime: number;
  _useModified: boolean;
  _lastAnnotationID: number;
  _enableNote: boolean;
  baidu: Function;
  baidufield: Function;
  caiyun: Function;
  cnki: Function;
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
  niutransLog: Function;
  tencent: Function;
  youdao: Function;
  youdaozhiyun: Function;
  youdaodict: Function;
  bingdict: Function;
  freedictionaryapi: Function;
  webliodict: Function;
  collinsdict: Function;

  constructor(parent: PDFTranslate) {
    super(parent);
    this._translateTime = 0;
    this._useModified = false;
    this._lastAnnotationID = -1;
    this._enableNote = false;

    this.baidu = baidu;
    this.baidufield = baidufield;
    this.caiyun = caiyun;
    this.cnki = cnki;
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
    this.niutransLog = niutransLog;
    this.openl = openl;
    this.tencent = tencent;
    this.youdao = youdao;
    this.youdaozhiyun = youdaozhiyun;
    this.youdaodict = youdaodict;
    this.bingdict = bingdict;
    this.freedictionaryapi = freedictionaryapi;
    this.webliodict = webliodict;
    this.collinsdict = collinsdict;
  }

  async callTranslate(text: string = "", disableCache: boolean = true) {
    text = text || this._Addon._selectedText;
    Zotero.debug(`callTranslate: ${text}`);

    if (this._useModified) {
      Zotero.debug("ZoteroPDFTranslate: Using modified text");
      text = this._Addon._sourceText;
    }
    if (
      !disableCache &&
      // Blank
      (/^\s*$/.test(text) ||
        // Unchanged
        this._Addon._sourceText === text)
    ) {
      Zotero.debug("ZoteroPDFTranslate: Using cache");
      this._Addon.view.updateAllResults(this._Addon._translatedText);
      this._Addon.view.updatePopupStyle();
      return true;
    }

    Zotero.debug(`Real text is ${text}`);
    this._Addon._sourceText = text;
    this._Addon._translatedText = "";
    this._Addon.view.updateAllTranslatePanelData();
    this._Addon.view.updateAllResults(this._Addon._translatedText);
    this._Addon.view.updatePopupStyle();

    let t = new Date().getTime();
    this._translateTime = t;
    Zotero.debug(`ZoteroPDFTranslate: Translate ${t} start.`);

    this.callTranslateExtra();

    let result = await this.getTranslation();

    Zotero.debug(`ZoteroPDFTranslate: Translate ${t} returns ${result.status}`);
    if (this._translateTime > t) {
      Zotero.debug(`ZoteroPDFTranslate: Translate ${t} overwritten.`);
      return true;
    }

    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup && this._Addon.view.popupTextBox) {
      this._Addon.view.popupTextBox.remove();
      this._Addon.view.buildPopupPanel();
    }
    // Update result
    this._Addon.view.updateAllResults(result.res);
    this._Addon.view.updatePopupStyle();
    return true;
  }

  async callTranslateExtra() {
    let text: string = this._Addon._sourceText;
    let _window: Window = this._Addon.view.standaloneWindow;
    if (!text.trim() || !_window || _window.closed) {
      return;
    }
    Zotero.debug("ZoteroPDFTranslate: callTranslateExtra");
    let extraEngines: string[] = (
      Zotero.Prefs.get("ZoteroPDFTranslate.extraEngines") as string
    )
      .split(",")
      .filter((e: string) => e);
    let i = 0;
    for (let engine of extraEngines) {
      let result = await this.getTranslation(engine, text);
      Zotero.debug(`ZoteroPDFTranslate: TranslateExtra returns ${result}`);
      this._Addon.view.updateExtraResults(_window.document, result.res, i);
      i++;
    }
  }

  async callTranslateAnnotation(
    item: Zotero.Item,
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
      this._Addon.view.updateAllTranslatePanelData();

      if (this._Addon._sourceText != item.annotationText) {
        this._Addon._sourceText = item.annotationText;
        let result = await this.getTranslation();
        if (!result.status) {
          this._Addon.view.showProgressWindow(
            "Annotation Translate Failed",
            result.res,
            "fail"
          );
          return false;
        }
      }
      let text = this._Addon._translatedText;
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
      this._Addon.view.showProgressWindow(
        "Annotation Translation Saved",
        text.length < 20 ? text : text.slice(0, 15) + "..."
      );
      if (Zotero.Prefs.get("ZoteroPDFTranslate.enableCommentEdit")) {
        this._Addon.view.updateAllResults(this._Addon._translatedText);
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
        if (this._Addon._sourceText !== annotation.text) {
          this._Addon._sourceText = annotation.text;
          await this.getTranslation();
        }
        annotation.text = (Zotero.Prefs.get(
          "ZoteroPDFTranslate.enableNoteReplaceMode"
        ) as boolean)
          ? this._Addon._translatedText
          : `${this._Addon._sourceText}\n----\n${this._Addon._translatedText}\n`;
      }
    } catch (e) {
      Zotero.debug(`ZoteroPDFTranslate.callTranslateNote Error: ${e}`);
    }
    this._enableNote = false;
    Zotero.debug(`ZoteroPDFTranslate.callTranslateNote : ${annotations}`);
    return annotations;
  }

  public async callTranslateTitle(
    items: Array<Zotero.Item>,
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
        this._Addon._sourceText = titleText;
        let success = await this.getTranslation();
        if (!success) {
          Zotero.debug("ZoteroPDFTranslate.callTranslateTitle failed");
          return status;
        }
        for (let _ of this._Addon._translatedText.split(itemSplitter)) {
          let itemID = _.split(titleSplitter)[0].trim();
          let newTitle = _.split(titleSplitter)[1];
          Zotero.debug(`${itemID}, ${newTitle}`);
          // Retry
          try {
            let item = Zotero.Items.get(itemID) as Zotero.Item;
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
      this._Addon._sourceText = item.getField("title");
      let success = await this.getTranslation();
      if (!success) {
        Zotero.debug("ZoteroPDFTranslate.callTranslateTitle failed");
        return status;
      }
      try {
        if (!noSave) {
          item.setField("shortTitle", "🔤" + this._Addon._translatedText);
          await item.saveTx();
        }
        status[item.id] = this._Addon._translatedText;
      } catch (e) {
        Zotero.debug(e);
      }
    }

    for (let itemID in status) {
      if (!noRetry && !status[itemID]) {
        let _status = await this.callTranslateTitle(
          Zotero.Items.get([itemID]) as Zotero.Item[],
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
      this._Addon.view.showProgressWindow(
        "Title Translation",
        `${successCount} items updated, ${failCount} failed, ${
          itemCount - successCount - failCount
        } skipped.`
      );
    }
    return status;
  }

  public async callTranslateAbstract(
    items: Array<Zotero.Item>,
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
        this._Addon._sourceText = titleText;
        let success = await this.getTranslation();
        if (!success) {
          Zotero.debug("ZoteroPDFTranslate.callTranslateAbstract failed");
          return status;
        }
        for (let _ of this._Addon._translatedText.split(itemSplitter)) {
          let itemID = _.split(titleSplitter)[0].trim();
          let newTitle = _.split(titleSplitter)[1];
          Zotero.debug(`${itemID}, ${newTitle}`);
          // Retry
          try {
            let item = Zotero.Items.get(itemID) as Zotero.Item;
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
      this._Addon._sourceText = item.getField("abstractNote");
      let success = await this.getTranslation();
      if (!success) {
        Zotero.debug("ZoteroPDFTranslate.callTranslateTitle failed");
        return status;
      }
      try {
        if (!noSave) {
          item.setField(
            "abstractNote",
            "🔤" + this._Addon._translatedText + item.getField("abstractNote")
          );
          await item.saveTx();
        }
        status[item.id] = this._Addon._translatedText;
      } catch (e) {
        Zotero.debug(e);
      }
    }

    for (let itemID in status) {
      if (!noRetry && !status[itemID]) {
        let _status = await this.callTranslateAbstract(
          Zotero.Items.get([itemID]) as Zotero.Item[],
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
      this._Addon.view.showProgressWindow(
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
  ): Promise<{ status: boolean; res: string }> {
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
        engine = Zotero.Prefs.get("ZoteroPDFTranslate.dictSource") as string;
        retry = true;
      } else {
        engine = Zotero.Prefs.get(
          "ZoteroPDFTranslate.translateSource"
        ) as string;
      }
    }

    this.checkSecret(window, engine, args.secret);

    // bool return for success or fail
    let translateStatus: { status: boolean; res: string } = await this[engine](
      text
    );
    if (!translateStatus.status && retry) {
      engine = Zotero.Prefs.get("ZoteroPDFTranslate.translateSource") as string;
      translateStatus = await this[engine](text);
    }
    return translateStatus;
  }

  public getLanguageDisable(currentLanguage: string = undefined): boolean {
    if (typeof currentLanguage == "undefined") {
      currentLanguage = this.getRootItem(
        Zotero.Items.get(this._Addon.reader.currentReader.itemID) as Zotero.Item
      )
        .getField("language")
        .split("-")[0];
    }
    let disable = false;
    if (currentLanguage) {
      let disabledLanguages = (
        Zotero.Prefs.get("ZoteroPDFTranslate.disabledLanguages") as string
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

  public getRootItem(item: Zotero.Item): Zotero.Item {
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
      engine = Zotero.Prefs.get("ZoteroPDFTranslate.translateSource") as string;
    }
    let secret = JSON.parse(
      Zotero.Prefs.get("ZoteroPDFTranslate.secretObj") as string
    )[engine];
    if (typeof secret === "undefined") {
      secret = "";
    }
    let sl = Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage") as string;
    if (typeof sl === "undefined") {
      sl = this.defaultSourceLanguage;
    }
    let tl = Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage") as string;
    if (typeof tl === "undefined") {
      tl = this.defaultTargetLanguage;
    }
    text = (text ? text : this._Addon._sourceText)
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
      return String(e);
    }
  }
  private getErrorInfo(errorType: string, errorInfo: string) {
    if (errorType == "request") {
      return `${this._Addon.locale.getString(
        "translate_api",
        "error_request"
      )} \n\n ${this._Addon.locale.getString(
        "translate_engine",
        Zotero.Prefs.get("ZoteroPDFTranslate.translateSource") as string
      )}.\n${errorInfo}`;
    } else if (errorType == "parse") {
      return `${this._Addon.locale.getString(
        "translate_api",
        "error_parse"
      )}${errorInfo}`;
    } else {
      return `${this._Addon.locale.getString(
        "translate_api",
        "error_other"
      )}${errorInfo}`;
    }
  }
  async requestTranslate(
    request_func: Function,
    parse_func: Function
  ): Promise<{ status: boolean; res: string }> {
    let xhr = await this.safeRun(request_func);
    Zotero.debug(xhr);

    if (xhr && xhr.status && xhr.status === 200) {
      let res = await this.safeRun(parse_func, xhr);
      if (res) {
        return {
          status: true,
          res: res,
        };
      }
    }
    return {
      status: false,
      res: this.getErrorInfo("request", xhr),
    };
  }
}

export default TransEngine;
