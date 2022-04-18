import { TransConfig } from "./translate/config";
import { baidu } from "./translate/baidu";
import { caiyun } from "./translate/caiyun";
import { deeplfree, deeplpro, deepl } from "./translate/deepl";
import { google, googleapi } from "./translate/google";
import { microsoft } from "./translate/microsoft";
import { niutrans, niutranspro, niutransapi } from "./translate/niutrans";
import { tencent } from "./translate/tencent";
import { youdao } from "./translate/youdao";

class TransEngine extends TransConfig {
  _timestamp: number;
  _enableNote: boolean;
  config: TransConfig;
  baidu: Function;
  caiyun: Function;
  deeplpro: Function;
  deeplfree: Function;
  deepl: Function;
  google: Function;
  googleapi: Function;
  microsoft: Function;
  niutrans: Function;
  niutranspro: Function;
  niutransapi: Function;
  tencent: Function;
  youdao: Function;

  constructor(parent: PDFTranslate) {
    super(parent);
    this._timestamp = 0;
    this._enableNote = false;

    this.baidu = baidu;
    this.caiyun = caiyun;
    this.deeplfree = deeplfree;
    this.deeplpro = deeplpro;
    this.deepl = deepl;
    this.google = google;
    this.googleapi = googleapi;
    this.microsoft = microsoft;
    this.niutrans = niutrans;
    this.niutranspro = niutranspro;
    this.niutransapi = niutransapi;
    this.tencent = tencent;
    this.youdao = youdao;
  }

  async callTranslate(currentReader: ReaderObj, force: boolean = false) {
    let text = this._PDFTranslate.reader.getSelectedText(currentReader);
    if (!text) {
      return false;
    }

    if (
      force &&
      this._PDFTranslate._sourceText &&
      this._PDFTranslate._sourceText != text
    ) {
      Zotero.debug("ZoteroPDFTranslate: Using modified text");
      text = this._PDFTranslate._sourceText;
    }

    // Empty or unchanged
    if (
      !force &&
      (!text.replace(/[\r\n]/g, "").replace(/\s+/g, "") ||
        this._PDFTranslate._sourceText === text)
    ) {
      this._PDFTranslate.view.updateResults();
      this._PDFTranslate.view.updatePopupStyle(currentReader);
      return true;
    }

    this._PDFTranslate._sourceText = text;
    this._PDFTranslate._translatedText = "";
    this._PDFTranslate._debug = "";
    this._PDFTranslate.view.updateSideBarPanelMenu();
    this._PDFTranslate.view.updateResults();
    this._PDFTranslate.view.updatePopupStyle(currentReader);

    let t = new Date().getTime();
    this._timestamp = t;
    Zotero.debug(`ZoteroPDFTranslate: Translate ${t} start.`);

    let success = await this.getTranslation();

    Zotero.debug(`ZoteroPDFTranslate: Translate ${t} returns ${success}`);
    if (this._timestamp > t) {
      Zotero.debug(`ZoteroPDFTranslate: Translate ${t} overwritten.`);
      return true;
    }

    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup && this._PDFTranslate.view.popupTextBox) {
      this._PDFTranslate.view.popupTextBox.remove();
      this._PDFTranslate.view.buildPopupPanel(currentReader);
    }
    // Update result
    this._PDFTranslate.view.updateResults();
    this._PDFTranslate.view.updatePopupStyle(currentReader);
    return true;
  }

  async callTranslateAnnotation(item: ZoteroItem) {
    this._timestamp = new Date().getTime();
    let disable = this.getLanguageDisable(
      item.parentItem.parentItem.getField("language").split("-")[0]
    );
    if (
      Zotero.Prefs.get("ZoteroPDFTranslate.enableComment") &&
      !disable &&
      item.isAnnotation() &&
      item.annotationType == "highlight" &&
      !item.annotationComment
    ) {
      // Update sidebar
      this._PDFTranslate.view.updateSideBarPanelMenu();

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
      item.annotationComment = text;
      item.saveTx();
      this._PDFTranslate.view.showProgressWindow(
        "Annotation Translate Saved",
        text.length < 20 ? text : text.slice(0, 15) + "..."
      );
    }
    return true;
  }

  async callTranslateNote(annotations: Array<Annotation>) {
    this._timestamp = new Date().getTime();
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

  public async callTranslateTitle(titleText: string) {
    this._timestamp = new Date().getTime();
    this._PDFTranslate._sourceText = titleText;
    let success = await this.getTranslation();
    if (!success) {
      Zotero.debug("ZoteroPDFTranslate.callTranslateTitle failed");
      return false;
    }
    for (let _ of this._PDFTranslate._translatedText.split("🤩")) {
      let itemID = _.split("🤣")[0].trim();
      let newTitle = _.split("🤣")[1];
      Zotero.debug(`${itemID}, ${newTitle}`);
      let item = Zotero.Items.get(itemID);
      if (item) {
        item.setField("shortTitle", newTitle + "🔤");
        item.saveTx();
      }
    }
    return true;
  }

  private async getTranslation(): Promise<boolean> {
    // Call current translate engine
    let translateSource = Zotero.Prefs.get(
      "ZoteroPDFTranslate.translateSource"
    );
    // bool return for success or fail
    return await this[translateSource]();
  }

  getLanguageDisable(
    currentLanguage: string = undefined,
    currentReader: ReaderObj = undefined
  ): boolean {
    if (typeof currentLanguage == "undefined") {
      currentLanguage = Zotero.Items.get(currentReader.itemID)
        .parentItem.getField("language")
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

  private getArgs(): TransArgs {
    let secret = Zotero.Prefs.get("ZoteroPDFTranslate.secret");
    if (typeof secret === "undefined") {
      secret = this.defaultSecret["caiyun"];
    }
    let sl = Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage");
    if (typeof sl === "undefined") {
      sl = this.defaultSourceLanguage;
    }
    let tl = Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage");
    if (typeof tl === "undefined") {
      tl = this.defaultTargetLanguage;
    }
    let text = this._PDFTranslate._sourceText.replace(/\n/g, " ");
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
  async requestTranslate(request_func, parse_func) {
    let xhr = await this.safeRun(request_func);
    Zotero.debug(xhr);

    if (xhr && xhr.status && xhr.status === 200) {
      let res = await this.safeRun(parse_func, xhr);
      if (res) {
        return true;
      }
    }
    this._PDFTranslate._debug = this.getErrorInfo("request");
    return false;
  }
}

export default TransEngine;
