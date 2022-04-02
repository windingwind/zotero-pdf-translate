initZPDFTranslatePreferences = function () {
  Zotero.debug("ZoteroPDFTranslate: Initialize preferences.");
  Zotero.ZoteroPDFTranslate.resetState();
  // Store current secret
  let userSecrets = JSON.parse(
    Zotero.Prefs.get("ZoteroPDFTranslate.secretObj")
  );
  userSecrets[Zotero.Prefs.get("ZoteroPDFTranslate.translateSource")] =
    Zotero.Prefs.get("ZoteroPDFTranslate.secret");
  Zotero.Prefs.set("ZoteroPDFTranslate.secretObj", JSON.stringify(userSecrets));
  buildLanguageSettings();
  updatePreviewPannel();
};

buildLanguageSettings = function () {
  let SLMenuList = document.getElementById(
    "zotero-prefpane-zoteropdftranslate-settings-translate-sl"
  );
  let SLMenuPopup = document.createElement("menupopup");
  let sl = Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage");
  let slIndex = 0;

  let TLMenuList = document.getElementById(
    "zotero-prefpane-zoteropdftranslate-settings-translate-tl"
  );
  let TLMenuPopup = document.createElement("menupopup");
  let tl = Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage");
  let tlIndex = 0;

  let i = 0;
  for (let lang of Zotero.ZoteroPDFTranslate.translate.LangCultureNames) {
    let SLMenuItem = document.createElement("menuitem");
    SLMenuItem.setAttribute("label", lang.DisplayName);
    SLMenuItem.setAttribute("value", lang.LangCultureName);
    SLMenuItem.addEventListener("command", (e) => {
      let newSL = e.target.value;
      Zotero.Prefs.set("ZoteroPDFTranslate.sourceLanguage", newSL);
    });
    if (lang.LangCultureName == sl) {
      slIndex = i;
    }

    let TLMenuItem = document.createElement("menuitem");
    TLMenuItem.setAttribute("label", lang.DisplayName);
    TLMenuItem.setAttribute("value", lang.LangCultureName);
    TLMenuItem.addEventListener("command", (e) => {
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
};

updateSourceParam = function () {
  Zotero.debug("ZoteroPDFTranslate: updateSourceParam.");
  let menu = document.getElementById(
    "zotero-prefpane-zoteropdftranslate-settings-translate-source"
  );
  let param = document.getElementById(
    "zotero-prefpane-zoteropdftranslate-settings-translate-param"
  );

  let userSecrets = JSON.parse(
    Zotero.Prefs.get("ZoteroPDFTranslate.secretObj")
  );
  let secret = "";
  if (userSecrets.hasOwnProperty(menu.value)) {
    secret = userSecrets[menu.value];
  } else {
    secret = Zotero.ZoteroPDFTranslate.translate.defaultSecret[menu.value];
    userSecrets[menu.value] = secret;
    Zotero.Prefs.set(
      "ZoteroPDFTranslate.secretObj",
      JSON.stringify(userSecrets)
    );
  }
  param.value = secret;
  Zotero.Prefs.set("ZoteroPDFTranslate.secret", secret);
};

updatePreviewPannel = function () {
  Zotero.debug("ZoteroPDFTranslate: updatePreviewPannel.");
  let pannel = document.getElementById(
    "zotero-prefpane-zoteropdftranslate-settings-preview"
  );
  let text = document.getElementById(
    "zotero-prefpane-zoteropdftranslate-settings-font-size"
  );
  pannel.style["font-size"] = `${parseInt(text.value)}px`;
};
