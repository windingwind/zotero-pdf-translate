import baidu from "./translate/baidu";
import caiyun from "./translate/caiyun";
import deepl from "./translate/deepl";
import google from "./translate/google";
import microsoft from "./translate/microsoft";
import niutrans from "./translate/niutrans";
import tencent from "./translate/tencent";
import youdao from "./translate/youdao";
import config from "./translate/config";

translate = {
  _timestamp: 0,
  _enableNote: false,

  callTranslate: async function (currentReader, force = false) {
    let text = Zotero.ZoteroPDFTranslate.reader.getSelectedText(currentReader);

    if (!text) {
      return false;
    }

    // Empty or unchanged
    if (
      !force &&
      (!text.replace(/[\r\n]/g, "").replace(/\s+/g, "") ||
        Zotero.ZoteroPDFTranslate._sourceText === text)
    ) {
      Zotero.ZoteroPDFTranslate.view.updateResults();
      Zotero.ZoteroPDFTranslate.view.updatePopupStyle(currentReader);
      return true;
    }

    Zotero.ZoteroPDFTranslate._sourceText = text;
    Zotero.ZoteroPDFTranslate._translatedText = "";
    Zotero.ZoteroPDFTranslate._debug = "";
    Zotero.ZoteroPDFTranslate.view.updateSideBarPanelMenu();
    Zotero.ZoteroPDFTranslate.view.updateResults();
    Zotero.ZoteroPDFTranslate.view.updatePopupStyle(currentReader);

    let t = Date.parse(new Date());
    Zotero.ZoteroPDFTranslate.translate._timestamp = t;
    Zotero.debug(`ZoteroPDFTranslate: Translate ${t} start.`);

    let success = await Zotero.ZoteroPDFTranslate.translate.getTranslation();

    Zotero.debug(`ZoteroPDFTranslate: Translate ${t} returns ${success}`);
    if (Zotero.ZoteroPDFTranslate.translate._timestamp > t) {
      Zotero.debug(`ZoteroPDFTranslate: Translate ${t} overwritten.`);
      return true;
    }

    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup && Zotero.ZoteroPDFTranslate.view.popupTextBox) {
      Zotero.ZoteroPDFTranslate.view.popupTextBox.remove();
      Zotero.ZoteroPDFTranslate.view.buildPopupPanel(currentReader);
    }
    // Update result
    Zotero.ZoteroPDFTranslate.view.updateResults();
    Zotero.ZoteroPDFTranslate.view.updatePopupStyle(currentReader);
    return true;
  },

  callTranslateAnnotation: async function (item) {
    let disable = Zotero.ZoteroPDFTranslate.translate.getLanguageDisable(
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
      Zotero.ZoteroPDFTranslate.view.updateSideBarPanelMenu();

      if (Zotero.ZoteroPDFTranslate._sourceText != item.annotationText) {
        Zotero.ZoteroPDFTranslate._sourceText = item.annotationText;
        let success =
          await Zotero.ZoteroPDFTranslate.translate.getTranslation();
        if (!success) {
          Zotero.ZoteroPDFTranslate.view.showProgressWindow(
            "Annotation Translate Failed",
            Zotero.ZoteroPDFTranslate._debug,
            "fail"
          );
          return false;
        }
      }
      let text = Zotero.ZoteroPDFTranslate._translatedText;
      item.annotationComment = text;
      item.saveTx();
      Zotero.ZoteroPDFTranslate.view.showProgressWindow(
        "Annotation Translate Saved",
        text.length < 20 ? text : text.slice(0, 15) + "..."
      );
    }
    return true;
  },

  callTranslateNote: async function (annotations) {
    try {
      for (let annotation of annotations) {
        if (Zotero.ZoteroPDFTranslate._sourceText !== annotation.text) {
          Zotero.ZoteroPDFTranslate._sourceText = annotation.text;
          await Zotero.ZoteroPDFTranslate.translate.getTranslation();
        }
        annotation.text = `${Zotero.ZoteroPDFTranslate._sourceText}\n----\n${Zotero.ZoteroPDFTranslate._translatedText}\n`;
      }
    } catch (e) {
      Zotero.debug(`ZoteroPDFTranslate.callTranslateNote Error: ${e}`);
    }
    Zotero.ZoteroPDFTranslate.translate._enableNote = false;
    Zotero.debug(`ZoteroPDFTranslate.callTranslateNote : ${annotations}`);
    return annotations;
  },

  getTranslation: async function () {
    // Call current translate engine
    let translateSource = Zotero.Prefs.get(
      "ZoteroPDFTranslate.translateSource"
    );
    // bool return for success or fail
    return await Zotero.ZoteroPDFTranslate.translate[translateSource]();
  },

  getLanguageDisable: function (
    currentLanguage = undefined,
    currentReader = undefined
  ) {
    if (!currentLanguage) {
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
  },

  getArgs: function () {
    let secret = Zotero.Prefs.get("ZoteroPDFTranslate.secret");
    if (typeof secret === "undefined") {
      secret = Zotero.ZoteroPDFTranslate.defaultSecret["caiyun"];
    }
    let sl = Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage");
    if (typeof sl === "undefined") {
      sl = Zotero.ZoteroPDFTranslate.defaultSourceLanguage;
    }
    let tl = Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage");
    if (typeof tl === "undefined") {
      tl = Zotero.ZoteroPDFTranslate.defaultTargetLanguage;
    }
    let text = Zotero.ZoteroPDFTranslate._sourceText.replace(/\n/g, " ");
    return {
      secret,
      sl,
      tl,
      text,
    };
  },
  safeRun: async function (func, args = null) {
    try {
      return await func(args);
    } catch (e) {
      Zotero.debug(e);
      Zotero.ZoteroPDFTranslate._debug = e;
      return false;
    }
  },
  getErrorInfo: function (errorType) {
    if (errorType == "request") {
      return `[Request Error]
Engine not available, invalid secret, or request too fast.
Using another translation engine or posting the issue here: https://github.com/windingwind/zotero-pdf-translate/issues
        ${Zotero.ZoteroPDFTranslate._debug}`;
    } else if (errorType == "parse") {
      return `[Parse Error]
Report issue here: https://github.com/windingwind/zotero-pdf-translate/issues
        ${Zotero.ZoteroPDFTranslate._debug}`;
    } else {
      return `[Unknown Error]
Report issue here: https://github.com/windingwind/zotero-pdf-translate/issues
        ${Zotero.ZoteroPDFTranslate._debug}`;
    }
  },
  requestTranslate: async function (request_func, parse_func) {
    let xhr = await this.safeRun(request_func);
    Zotero.debug(xhr);

    if (xhr && xhr.status && xhr.status === 200) {
      let res = await this.safeRun(parse_func, xhr);
      if (res) {
        return true;
      }
    }
    Zotero.ZoteroPDFTranslate._debug = this.getErrorInfo("request");
    return false;
  },
};

Object.assign(
  translate,
  config,
  baidu,
  caiyun,
  deepl,
  google,
  microsoft,
  niutrans,
  tencent,
  youdao
);

export default translate;
