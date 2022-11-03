import PDFTranslate from "./addon";
import AddonBase from "./module";
import { niutransLogin } from "./translate/niutrans";

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

    if (type == 'translate') {
      let otherTransOptions = this._document.getElementById("other-trans-input");
      let niuTransOptions = this._document.getElementById("niutrans-login-btn");
      if (menu.value == 'niutransLog') {
          niuTransOptions.hidden = false;
          otherTransOptions.hidden = true;
          let memoryObj = JSON.parse(Zotero.Prefs.get("ZoteroPDFTranslate.niutransMemoryLibList") as string)
          let dictOBbj = JSON.parse(Zotero.Prefs.get("ZoteroPDFTranslate.niutransDictLibList") as string)
          this.initDictLibList(dictOBbj)
          this.initMemoryLibList(memoryObj)
      } else {
          niuTransOptions.hidden = true;
          otherTransOptions.hidden = false;
      }
    }
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
  async niutransLogin(){
    let username: XUL.Textbox = this._document.getElementById("zoteroniutrans-username");
    let password: XUL.Textbox = this._document.getElementById("zoteroniutrans-password");
    if(typeof username.value === "undefined" || username.value === null || username.value === "") {
      Zotero.alert(
        window,
        `${this._Addon.locale.getString("niutrans_tip", "tipTitle")}`,
        `${this._Addon.locale.getString("niutrans_tip", "tipUserName")}`
      );
      return;
    }
    if(typeof password.value === "undefined" || password.value === null || password.value === "") {
      Zotero.alert(
        window,
        `${this._Addon.locale.getString("niutrans_tip", "tipTitle")}`,
        `${this._Addon.locale.getString("niutrans_tip", "tipPassword")}`
      );
      return;
    }
    let button = this._document.getElementById("zoteroniutrans-loginbutton");
    button.setAttribute("disabled", "true")
    try {
      let loginInfo = await niutransLogin(username.value,password.value)
      if (loginInfo.loginFlag) {
        let messagetextbox = this._document.getElementById("zoteroniutrans-messagetextbox");
        messagetextbox.setAttribute("value",`${this._Addon.locale.getString("niutrans_tip", "successMessageTip")}`);
        let memoryObj = JSON.parse(Zotero.Prefs.get("ZoteroPDFTranslate.niutransMemoryLibList") as string)
        let dictOBbj = JSON.parse(Zotero.Prefs.get("ZoteroPDFTranslate.niutransDictLibList") as string)
        this.initDictLibList(dictOBbj)
        this.initMemoryLibList(memoryObj)
      }else{
        Zotero.alert(
          window,
          `${this._Addon.locale.getString("niutrans_tip", "errorTipTitle")}`,
          loginInfo.loginErrorMessage
        );
      }
    } catch (error) {
      Zotero.alert(
        window,
        `${this._Addon.locale.getString("niutrans_tip", "errorTipTitle")}`,
        `${this._Addon.locale.getString("niutrans_tip", "errorMessage")}`
      );
    } finally {
      button.setAttribute("disabled", "false")
    }
  }
  initDictLibList (xhr){
    let dictLibListElement = this._document.getElementById("zoteroniutrans-dictLibList");
    while(dictLibListElement.firstChild) {
      dictLibListElement.removeChild(dictLibListElement.firstChild)
    }
    if(xhr.flag == 0) {
    } else {
      let dlist = xhr.dlist;
      let isUseDictNo:string;

      let arr = new Array();
      for(let item in dlist) {
        let dict = dlist[item];
        let dic = {
          dictName:dict.dictName,
          isUse:dict.isUse,
          dictNo:dict.dictNo
        };
        arr[item] = dic;

        if(dict.isUse == 1) {
          isUseDictNo = dict.dictNo;
        }

        let newDictLib = this._document.createElement("menuitem");
        newDictLib.setAttribute("label", dict.dictName);
        newDictLib.setAttribute("value", dict.dictNo);
        dictLibListElement.appendChild(newDictLib);
      }
      let dictNo = Zotero.Prefs.get("ZoteroPDFTranslate.niutransDictNo");
      if(typeof dictNo === "undefined" || dictNo === null || dictNo === "") {
        if(typeof isUseDictNo === "undefined" || isUseDictNo === null || isUseDictNo === "") {
          if(arr.length && arr.length > 0) {
            Zotero.Prefs.set("ZoteroPDFTranslate.niutransDictNo", arr[0].dictNo);
          }
        } else {
          Zotero.Prefs.set("ZoteroPDFTranslate.niutransDictNo", isUseDictNo);
        }
      } else {
        Zotero.Prefs.set("ZoteroPDFTranslate.niutransDictNo", "");
        Zotero.Prefs.set("ZoteroPDFTranslate.niutransDictNo", dictNo);
      }
    }
  }
  initMemoryLibList (xhr){
    let memoryLibListElement = this._document.getElementById("zoteroniutrans-memoryLibList");
    while(memoryLibListElement.firstChild) {
      memoryLibListElement.removeChild(memoryLibListElement.firstChild)
    }
    if(xhr.flag == 0) {
    } else {
      let mlist = xhr.mlist;
      let isUseMemoryNo:string;

      let arr = new Array();
      for(let item in mlist) {
        let memory = mlist[item];
        let mem = {
          memoryName:memory.memoryName,
          isUse:memory.isUse,
          memoryNo:memory.memoryNo
        };
        arr[item] = mem;

        if(memory.isUse == 1) {
          isUseMemoryNo = memory.memoryNo;
        }

        let newMemoryLib = this._document.createElement("menuitem");
        newMemoryLib.setAttribute("label", memory.memoryName);
        newMemoryLib.setAttribute("value", memory.memoryNo);
        memoryLibListElement.appendChild(newMemoryLib);
      }
      let memoryNo = Zotero.Prefs.get("ZoteroPDFTranslate.niutransMemoryNo");
      if(typeof memoryNo === "undefined" || memoryNo === null || memoryNo === "") {
        if(typeof isUseMemoryNo === "undefined" || isUseMemoryNo === null || isUseMemoryNo === "") {
          if(arr.length && arr.length > 0) {
            Zotero.Prefs.set("ZoteroPDFTranslate.niutransMemoryNo", arr[0].memoryNo);
          }
        } else {
          Zotero.Prefs.set("ZoteroPDFTranslate.niutransMemoryNo", isUseMemoryNo);
        }
      } else {
        Zotero.Prefs.set("ZoteroPDFTranslate.niutransMemoryNo", "");
        Zotero.Prefs.set("ZoteroPDFTranslate.niutransMemoryNo", memoryNo);
      }
    }
  }
  cleanPasswordAndApikey() {
    Zotero.Prefs.set("ZoteroPDFTranslate.niutransPassword", "");
    let passwordElement: XUL.Textbox = this._document.getElementById("zoteroniutrans-password");
    passwordElement.value = "";
    Zotero.Prefs.set("ZoteroPDFTranslate.niutransApikey", "");
    let messagetextbox = this._document.getElementById("zoteroniutrans-messagetextbox");
    messagetextbox.setAttribute("value","");
    this.cleanDictNoAndMemoryNo();
  }
  
  cleanApikey() {
    Zotero.Prefs.set("ZoteroPDFTranslate.niutransApikey", "");
    let messagetextbox = this._document.getElementById("zoteroniutrans-messagetextbox");
    messagetextbox.setAttribute("value","");
    this.cleanDictNoAndMemoryNo();
  }
  
  cleanDictNoAndMemoryNo = function() {
    Zotero.Prefs.set("ZoteroPDFTranslate.niutransDictNo", "");
    Zotero.Prefs.set("ZoteroPDFTranslate.niutransMemoryNo", "");
    Zotero.Prefs.set("ZoteroPDFTranslate.niutransDictLibList", "");
    Zotero.Prefs.set("ZoteroPDFTranslate.niutransMemoryLibList", "");
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
