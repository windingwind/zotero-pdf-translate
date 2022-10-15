import PDFTranslate from "./addon";
import AddonBase from "./module";

class TransPref extends AddonBase {
  private _window: Window;
  constructor(parent: PDFTranslate) {
    super(parent);
  }
  initPreferences(_window: Window) {
    this._window = _window;
    Zotero.debug("ZoteroPDFTranslate: Initialize preferences.");
    this.updateSourceParam("translate");
    this.updateSourceParam("dict");
    this.buildLanguageSettings();
    this.updatePreviewPannel();
    this.updateAnnotationTranslationSettings();
    this.updateAddToNoteSettings();
  }

  updateSourceParam(type: string, checkSecretFormat: boolean = false) {
    Zotero.debug("ZoteroPDFTranslate: updateSourceParam.");
    let menu: XUL.Menulist = this._window.document.getElementById(
      `zotero-prefpane-zoteropdftranslate-settings-${type}-source`
    );
    let param: XUL.Textbox = this._window.document.getElementById(
      `zotero-prefpane-zoteropdftranslate-settings-${type}-param`
    );

    let userSecrets = JSON.parse(
      Zotero.Prefs.get("ZoteroPDFTranslate.secretObj") as string
    );
    let secret = "";
    if (userSecrets.hasOwnProperty(menu.value)) {
      secret = userSecrets[menu.value];
    } else {
      secret = this._Addon.translate.defaultSecret[menu.value];
      userSecrets[menu.value] = secret;
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.secretObj",
        JSON.stringify(userSecrets)
      );
    }
    param.value = secret;
    if (checkSecretFormat) {
      this._Addon.translate.checkSecret(this._window, menu.value, secret);
    }
  }

  updateParamObj(type: string) {
    let menu: XUL.Menulist = this._window.document.getElementById(
      `zotero-prefpane-zoteropdftranslate-settings-${type}-source`
    );
    let param: XUL.Textbox = this._window.document.getElementById(
      `zotero-prefpane-zoteropdftranslate-settings-${type}-param`
    );

    let userSecrets = JSON.parse(
      Zotero.Prefs.get("ZoteroPDFTranslate.secretObj") as string
    );

    userSecrets[menu.value] = param.value;
    Zotero.Prefs.set(
      "ZoteroPDFTranslate.secretObj",
      JSON.stringify(userSecrets)
    );
  }

  checkParamObj(type: string) {
    let menu: XUL.Menulist = this._window.document.getElementById(
      `zotero-prefpane-zoteropdftranslate-settings-${type}-source`
    );
    let param: XUL.Textbox = this._window.document.getElementById(
      `zotero-prefpane-zoteropdftranslate-settings-${type}-param`
    );
    this._Addon.translate.checkSecret(this._window, menu.value, param.value);
  }

  updatePreviewPannel() {
    Zotero.debug("ZoteroPDFTranslate: updatePreviewPannel.");
    let pannel = this._window.document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-preview"
    );
    let fontSizeText: XUL.Textbox = this._window.document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-font-size"
    );
    let lineHeightText: XUL.Textbox = this._window.document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-line-height"
    );
    pannel.style["font-size"] = `${parseInt(fontSizeText.value)}px`;
    pannel.style.lineHeight =
      parseFloat(lineHeightText.value) < 0 ? "1" : lineHeightText.value;
  }

  updateAnnotationTranslationSettings() {
    Zotero.debug("ZoteroPDFTranslate: updateannotationTranslationSettings.");
    let enableAnnotationTranslation = this._window.document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-enable-comment"
    ) as XUL.Checkbox;
    const position: XUL.Element = this._window.document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-annotation-translation-position"
    );
    position.disabled = !enableAnnotationTranslation.checked;

    const commentEdit: XUL.Checkbox = this._window.document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-enable-commentedit"
    );
    if (!enableAnnotationTranslation.checked || position.value === "body") {
      commentEdit.checked = false;
      commentEdit.disabled = true;
    } else {
      commentEdit.disabled = false;
    }
  }

  updateAddToNoteSettings() {
    Zotero.debug("ZoteroPDFTranslate: updateAddToNoteSettings.");
    let enableAddToNote = this._window.document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-enable-note"
    ) as XUL.Checkbox;
    const mode: XUL.Element = this._window.document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-enable-note-replace"
    );
    mode.disabled = !enableAddToNote.checked;
  }

  private buildLanguageSettings() {
    let SLMenuList: XUL.Menulist = this._window.document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-translate-sl"
    );
    let SLMenuPopup = this._window.document.createElement("menupopup");
    let sl = Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage");
    let slIndex = 0;

    let TLMenuList: XUL.Menulist = this._window.document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-translate-tl"
    );
    let TLMenuPopup = this._window.document.createElement("menupopup");
    let tl = Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage");
    let tlIndex = 0;

    let i = 0;
    for (let lang of this._Addon.translate.LangCultureNames) {
      let SLMenuItem = this._window.document.createElement("menuitem");
      SLMenuItem.setAttribute("label", lang.DisplayName);
      SLMenuItem.setAttribute("value", lang.LangCultureName);
      SLMenuItem.addEventListener("command", (e: XUL.XULEvent) => {
        let newSL = e.target.value;
        Zotero.Prefs.set("ZoteroPDFTranslate.sourceLanguage", newSL);
      });
      if (lang.LangCultureName == sl) {
        slIndex = i;
      }

      let TLMenuItem = this._window.document.createElement("menuitem");
      TLMenuItem.setAttribute("label", lang.DisplayName);
      TLMenuItem.setAttribute("value", lang.LangCultureName);
      TLMenuItem.addEventListener("command", (e: XUL.XULEvent) => {
        let newTL = e.target.value;
        Zotero.Prefs.set("ZoteroPDFTranslate.targetLanguage", newTL);
      });
      if (lang.LangCultureName == tl) {
        tlIndex = i;
      }

      SLMenuPopup.appendChild(SLMenuItem);
      TLMenuPopup.appendChild(TLMenuItem);
      i += 1;
    }
    SLMenuList.appendChild(SLMenuPopup);
    TLMenuList.appendChild(TLMenuPopup);

    SLMenuList.selectedIndex = slIndex;
    TLMenuList.selectedIndex = tlIndex;
  }
}

export default TransPref;
