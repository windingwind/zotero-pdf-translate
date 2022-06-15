import { TransBase } from "./base";

class TransPref extends TransBase {
  private _document: Document;
  constructor(parent: PDFTranslate) {
    super(parent);
  }
  initPreferences(_document: Document) {
    this._document = _document;
    Zotero.debug("ZoteroPDFTranslate: Initialize preferences.");
    this.updateSourceParam("translate");
    this.updateSourceParam("dict");
    this.buildLanguageSettings();
    this.updatePreviewPannel();
    this.updateAnnotationTranslationSettings();
  }

  updateSourceParam(type: string) {
    Zotero.debug("ZoteroPDFTranslate: updateSourceParam.");
    let menu: XUL.Menulist = this._document.getElementById(
      `zotero-prefpane-zoteropdftranslate-settings-${type}-source`
    );
    let param: XUL.Textbox = this._document.getElementById(
      `zotero-prefpane-zoteropdftranslate-settings-${type}-param`
    );

    let userSecrets = JSON.parse(
      Zotero.Prefs.get("ZoteroPDFTranslate.secretObj")
    );
    let secret = "";
    if (userSecrets.hasOwnProperty(menu.value)) {
      secret = userSecrets[menu.value];
    } else {
      secret = this._PDFTranslate.translate.defaultSecret[menu.value];
      userSecrets[menu.value] = secret;
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.secretObj",
        JSON.stringify(userSecrets)
      );
    }
    param.value = secret;
  }

  updateParamObj(type: string) {
    let menu: XUL.Menulist = this._document.getElementById(
      `zotero-prefpane-zoteropdftranslate-settings-${type}-source`
    );
    let param: XUL.Textbox = this._document.getElementById(
      `zotero-prefpane-zoteropdftranslate-settings-${type}-param`
    );

    let userSecrets = JSON.parse(
      Zotero.Prefs.get("ZoteroPDFTranslate.secretObj")
    );

    userSecrets[menu.value] = param.value;
    Zotero.Prefs.set(
      "ZoteroPDFTranslate.secretObj",
      JSON.stringify(userSecrets)
    );
  }

  updatePreviewPannel() {
    Zotero.debug("ZoteroPDFTranslate: updatePreviewPannel.");
    let pannel = this._document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-preview"
    );
    let text: XUL.Textbox = this._document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-font-size"
    );
    pannel.style["font-size"] = `${parseInt(text.value)}px`;
  }

  updateAnnotationTranslationSettings() {
    Zotero.debug("ZoteroPDFTranslate: updateannotationTranslationSettings.");
    let enableAnnotationTranslation = this._document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-enable-comment"
    ) as XUL.Checkbox;
    const position: XUL.Element = this._document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-annotation-translation-position"
    );
    position.disabled = !enableAnnotationTranslation.checked;

    const commentEdit: XUL.Checkbox = this._document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-enable-commentedit"
    );
    if (!enableAnnotationTranslation.checked || position.value === "body") {
      commentEdit.checked = false;
      commentEdit.disabled = true;
    } else {
      commentEdit.disabled = false;
    }
  }

  private buildLanguageSettings() {
    let SLMenuList: XUL.Menulist = this._document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-translate-sl"
    );
    let SLMenuPopup = this._document.createElement("menupopup");
    let sl = Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage");
    let slIndex = 0;

    let TLMenuList: XUL.Menulist = this._document.getElementById(
      "zotero-prefpane-zoteropdftranslate-settings-translate-tl"
    );
    let TLMenuPopup = this._document.createElement("menupopup");
    let tl = Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage");
    let tlIndex = 0;

    let i = 0;
    for (let lang of this._PDFTranslate.translate.LangCultureNames) {
      let SLMenuItem = this._document.createElement("menuitem");
      SLMenuItem.setAttribute("label", lang.DisplayName);
      SLMenuItem.setAttribute("value", lang.LangCultureName);
      SLMenuItem.addEventListener("command", (e: XULEvent) => {
        let newSL = e.target.value;
        Zotero.Prefs.set("ZoteroPDFTranslate.sourceLanguage", newSL);
      });
      if (lang.LangCultureName == sl) {
        slIndex = i;
      }

      let TLMenuItem = this._document.createElement("menuitem");
      TLMenuItem.setAttribute("label", lang.DisplayName);
      TLMenuItem.setAttribute("value", lang.LangCultureName);
      TLMenuItem.addEventListener("command", (e: XULEvent) => {
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
