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
  updatePreviewPannel();
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
    Zotero.Prefs.set("ZoteroPDFTranslate.secretObj", JSON.stringify(userSecrets));
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
