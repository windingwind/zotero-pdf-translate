Zotero.ZoteroPDFTranslate = {
  _disableTranslate: false,
  _sourceText: "",
  _translatedText: "",
  _debug: "",
  _readerSelect: 0,

  init: async function () {
    Zotero.debug("ZoteroPDFTranslate: init called");

    Zotero.ZoteroPDFTranslate.resetState();
    // Register the callback in Zotero as an item observer
    var notifierID = Zotero.Notifier.registerObserver(
      Zotero.ZoteroPDFTranslate.notifierCallback,
      ["tab", "file", "item"]
    );

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener(
      "unload",
      function (e) {
        Zotero.Notifier.unregisterObserver(notifierID);
      },
      false
    );

    Zotero.ZoteroPDFTranslate.initKeys();

    Zotero.ZoteroPDFTranslate.view.updateTranslatePanel();
  },

  notifierCallback: {
    // Call view.updateTranslatePanels when a tab is added or selected
    notify: async function (event, type, ids, extraData) {
      Zotero.debug("ZoteroPDFTranslate: open file event detected.");
      if (event == "select" && type == "tab") {
        if (extraData[ids[0]].type !== "reader") {
          return;
        }
        Zotero.ZoteroPDFTranslate.onReaderSelect();
      }
      if (event == "open" && type == "file") {
      }
      if (event == "add" && type == "item") {
        // Disable the reader loading annotation update
        if (
          new Date().getTime() - Zotero.ZoteroPDFTranslate._readerSelect <
          3000
        ) {
          return;
        }
        Zotero.ZoteroPDFTranslate.onAnnotationAdd(ids);
      }
    },
  },

  initKeys: function () {
    let shortcuts = [
      {
        id: 0,
        func: Zotero.ZoteroPDFTranslate.onButtonClick,
        modifiers: null,
        key: "t",
      },
    ];
    let keyset = document.createElement("keyset");
    keyset.setAttribute("id", "pdf-translate-keyset");

    for (let i in shortcuts) {
      keyset.appendChild(Zotero.ZoteroPDFTranslate.createKey(shortcuts[i]));
    }
    document.getElementById("mainKeyset").parentNode.appendChild(keyset);
  },

  createKey: function (keyObj) {
    let key = document.createElement("key");
    key.setAttribute("id", "pdf-translate-key-" + keyObj.id);
    key.setAttribute("oncommand", "//");
    key.addEventListener("command", keyObj.func);
    if (keyObj.modifiers) {
      key.setAttribute("modifiers", keyObj.modifiers);
    }
    if (keyObj.key) {
      key.setAttribute("key", keyObj.key);
    } else if (keyObj.keycode) {
      key.setAttribute("keycode", keyObj.keycode);
    } else {
      // No key or keycode.  Set to empty string to disable.
      key.setAttribute("key", "");
    }
    return key;
  },

  onReaderSelect: function () {
    Zotero.ZoteroPDFTranslate._readerSelect = new Date().getTime();
    Zotero.ZoteroPDFTranslate.view.updateTranslatePanel();
  },

  onAnnotationAdd: function (ids) {
    let items = Zotero.Items.get(ids);

    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      Zotero.ZoteroPDFTranslate.translate.callTranslateAnnotation(item);
    }
  },

  onSelect: async function (event) {
    Zotero.debug(`ZoteroPDFTranslate: onTranslate`);
    // Zotero.debug(e)

    // Work around to only allow event from ifrme
    if (
      event.target &&
      event.target.closest &&
      !event.target.closest("#outerContainer")
    ) {
      return false;
    }

    let enable = Zotero.Prefs.get("ZoteroPDFTranslate.enable");
    let text = Zotero.ZoteroPDFTranslate.reader.getSelectedText();
    let currentButton = Zotero.ZoteroPDFTranslate.reader
      .getReader()
      ._iframeWindow.document.getElementById("pdf-translate-popup-button");
    let currentNode = Zotero.ZoteroPDFTranslate.reader
      .getReader()
      ._iframeWindow.document.getElementById("pdf-translate-popup");
    if (!enable || !text || currentButton || currentNode) {
      return false;
    }

    let enableAuto =
      Zotero.Prefs.get("ZoteroPDFTranslate.enableAuto") &&
      !Zotero.ZoteroPDFTranslate._disableTranslate;
    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup) {
      if (enableAuto) {
        Zotero.ZoteroPDFTranslate.view.buildPopupPanel();
      } else {
        Zotero.ZoteroPDFTranslate.view.buildPopupButton();
      }
    }

    if (enableAuto) {
      await Zotero.ZoteroPDFTranslate.translate.callTranslate();
    }
  },

  onButtonClick: function (e) {
    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup) {
      Zotero.ZoteroPDFTranslate.view.removePopupPanel();
      Zotero.ZoteroPDFTranslate.view.buildPopupPanel();
    }

    Zotero.ZoteroPDFTranslate.translate.callTranslate((force = true));
  },

  resetState: function () {
    // Reset preferrence state.
    let enable = Zotero.Prefs.get("ZoteroPDFTranslate.enable");
    if (typeof enable === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enable", true);
    }

    let enableAuto = Zotero.Prefs.get("ZoteroPDFTranslate.enableAuto");
    if (typeof enableAuto === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enableAuto", true);
    }

    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (typeof enablePopup === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enablePopup", true);
    }

    let enableComment = Zotero.Prefs.get("ZoteroPDFTranslate.enableComment");
    if (typeof enableComment === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enableComment", true);
    }

    let fontSize = Zotero.Prefs.get("ZoteroPDFTranslate.fontSize");
    if (!fontSize) {
      Zotero.Prefs.set("ZoteroPDFTranslate.fontSize", "12");
    }

    let rawResultOrder = Zotero.Prefs.get("ZoteroPDFTranslate.rawResultOrder");
    if (typeof rawResultOrder === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.rawResultOrder", false);
    }

    let translateSource = Zotero.Prefs.get(
      "ZoteroPDFTranslate.translateSource"
    );
    let validSource = false;
    for (let e of Zotero.ZoteroPDFTranslate.translate.sources) {
      if (translateSource == e) {
        validSource = true;
      }
    }

    if (!translateSource || !validSource) {
      // Change default translate engine for zh-CN users
      if (Services.locale.getRequestedLocale() === "zh-CN") {
        translateSource = "googleapi";
      } else {
        translateSource = Zotero.ZoteroPDFTranslate.translate.sources[0];
      }
      Zotero.Prefs.set("ZoteroPDFTranslate.translateSource", translateSource);
    }

    let langs = Zotero.ZoteroPDFTranslate.translate.LangCultureNames.map(
      (e) => e.LangCultureName
    );

    let sourceLanguage = Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage");
    let targetLanguage = Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage");
    let validSL = false;
    let validTL = false;
    for (let e of langs) {
      if (sourceLanguage == e) {
        validSL = true;
      }
      if (targetLanguage == e) {
        validTL = true;
      }
    }
    if (!sourceLanguage || !validSL) {
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.sourceLanguage",
        Zotero.ZoteroPDFTranslate.translate.defaultSourceLanguage
      );
    }

    if (!targetLanguage || !validTL) {
      targetLanguage = Services.locale.getRequestedLocale();
      Zotero.Prefs.set("ZoteroPDFTranslate.targetLanguage", targetLanguage);
    }

    let secret = Zotero.Prefs.get("ZoteroPDFTranslate.secret");
    if (typeof secret === "undefined") {
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.secret",
        Zotero.ZoteroPDFTranslate.translate.defaultSecret[translateSource]
      );
    }

    let secretObj = Zotero.Prefs.get("ZoteroPDFTranslate.secretObj");
    if (typeof secretObj === "undefined") {
      secretObj = Zotero.ZoteroPDFTranslate.translate.defaultSecret;
      secretObj[translateSource] = secret;
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.secretObj",
        JSON.stringify(secretObj)
      );
    }

    let disabledLanguages = Zotero.Prefs.get(
      "ZoteroPDFTranslate.disabledLanguages"
    );
    if (!disabledLanguages) {
      Zotero.Prefs.set("ZoteroPDFTranslate.disabledLanguages", "");
    }
  },
};
