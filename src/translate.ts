import { TransConfig } from "./config";
import { baidu } from "./translate/baidu";
import { baidufield } from "./translate/baidufield";
import { caiyun } from "./translate/caiyun";
import { deeplfree, deeplpro, deepl } from "./translate/deepl";
import { google, googleapi, _google } from "./translate/google";
import { microsoft } from "./translate/microsoft";
import { niutrans, niutranspro, niutransapi } from "./translate/niutrans";
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
    } else if (
      !disableCache &&
      // Blank
      (!text.replace(/[\r\n]/g, "").replace(/\s+/g, "") ||
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
      item.annotationComment = `${
        item.annotationComment ? item.annotationComment : ""
      }\n${text}`;
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
      .replace(
        /[^\ -~\u00A0-\u00AC\u00AE-\u0377\u037A-\u037F\u0384-\u038A\u038C\u038E-\u03A1\u03A3-\u052F\u0531-\u0556\u0559-\u058A\u058D-\u058F\u0591-\u05C7\u05D0-\u05EA\u05EF-\u05F4\u0606-\u061B\u061D-\u06DC\u06DE-\u070D\u0710-\u074A\u074D-\u07B1\u07C0-\u07FA\u07FD-\u082D\u0830-\u083E\u0840-\u085B\u085E\u0860-\u086A\u0870-\u088E\u0898-\u08E1\u08E3-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09FE\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A76\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AF1\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B55-\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B77\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BFA\u0C00-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3C-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C5D\u0C60-\u0C63\u0C66-\u0C6F\u0C77-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDD\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4F\u0D54-\u0D63\u0D66-\u0D7F\u0D81-\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2-\u0DF4\u0E01-\u0E3A\u0E3F-\u0E5B\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00-\u0F47\u0F49-\u0F6C\u0F71-\u0F97\u0F99-\u0FBC\u0FBE-\u0FCC\u0FCE-\u0FDA\u1000-\u10C5\u10C7\u10CD\u10D0-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u137C\u1380-\u1399\u13A0-\u13F5\u13F8-\u13FD\u1400-\u169C\u16A0-\u16F8\u1700-\u1715\u171F-\u1736\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17DD\u17E0-\u17E9\u17F0-\u17F9\u1800-\u180D\u180F-\u1819\u1820-\u1878\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1940\u1944-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u19DE-\u1A1B\u1A1E-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA0-\u1AAD\u1AB0-\u1ACE\u1B00-\u1B4C\u1B50-\u1B7E\u1B80-\u1BF3\u1BFC-\u1C37\u1C3B-\u1C49\u1C4D-\u1C88\u1C90-\u1CBA\u1CBD-\u1CC7\u1CD0-\u1CFA\u1D00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FC4\u1FC6-\u1FD3\u1FD6-\u1FDB\u1FDD-\u1FEF\u1FF2-\u1FF4\u1FF6-\u1FFE\u2000-\u200A\u2010-\u2029\u202F-\u205F\u2070\u2071\u2074-\u208E\u2090-\u209C\u20A0-\u20C0\u20D0-\u20F0\u2100-\u218B\u2190-\u2426\u2440-\u244A\u2460-\u2B73\u2B76-\u2B95\u2B97-\u2CF3\u2CF9-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D70\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2E5D\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303F\u3041-\u3096\u3099-\u30FF\u3105-\u312F\u3131-\u318E\u3190-\u31E3\u31F0-\u321E\u3220-\uA48C\uA490-\uA4C6\uA4D0-\uA62B\uA640-\uA6F7\uA700-\uA7CA\uA7D0\uA7D1\uA7D3\uA7D5-\uA7D9\uA7F2-\uA82C\uA830-\uA839\uA840-\uA877\uA880-\uA8C5\uA8CE-\uA8D9\uA8E0-\uA953\uA95F-\uA97C\uA980-\uA9CD\uA9CF-\uA9D9\uA9DE-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA5C-\uAAC2\uAADB-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB6B\uAB70-\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBC2\uFBD3-\uFD8F\uFD92-\uFDC7\uFDCF\uFDF0-\uFE19\uFE20-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFE70-\uFE74\uFE76-\uFEFC\uFF01-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]/g,
        " "
      )
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
