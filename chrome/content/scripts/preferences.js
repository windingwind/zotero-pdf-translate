initPreferences = function () {
  Zotero.debug("ZoteroPDFTranslate: Initialize preferences.");
  Zotero.ZoteroPDFTranslate.resetState();
};

updateSourceParam = function () {
  Zotero.debug("ZoteroPDFTranslate: updateSourceParam.");
  let menu = document.getElementById(
    "zotero-prefpane-zoteropdftranslate-settings-translate-source"
  );
  let param = document.getElementById(
    "zotero-prefpane-zoteropdftranslate-settings-translate-param"
  );
  let translateParam =
    Zotero.ZoteroPDFTranslate.translate.defaultParam[menu.value];
  param.value = translateParam;
};
