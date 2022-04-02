Zotero.ZoteroPDFTranslate.view = {
  popupTextBox: undefined,
  sideBarTextboxSource: undefined,
  sideBarTextboxTranslated: undefined,
  tab: undefined,
  tabPanel: undefined,

  /*
    UI Functions
  */
  updateTranslatePanel: async function () {
    Zotero.debug("ZoteroPDFTranslate: Update Translate Panels");

    await Zotero.uiReadyPromise;

    let currentReader = Zotero.ZoteroPDFTranslate.reader.getReader();
    if (!currentReader) {
      return false;
    }
    await currentReader._waitForReader();

    await Zotero.ZoteroPDFTranslate.view.buildSideBarPanel();

    Zotero.ZoteroPDFTranslate.view.updateSideBarPanelMenu();

    let disable = Zotero.ZoteroPDFTranslate.translate.getLanguageDisable(undefined, currentReader);

    currentReader._window.addEventListener(
      "pointerup",
      (function (currentReader, disable) {
        return function (event) {
          Zotero.ZoteroPDFTranslate.onSelect(event, currentReader, disable);
        };
      })(currentReader, disable)
    );
  },

  updateWindowTranslatePanel: async function (currentReader) {
    Zotero.debug("ZoteroPDFTranslate: Update Window Translate Panels");

    await Zotero.uiReadyPromise;

    await currentReader._waitForReader();

    let disable = Zotero.ZoteroPDFTranslate.translate.getLanguageDisable(undefined, currentReader);

    currentReader._window.addEventListener(
      "pointerup",
      (function (currentReader, disable) {
        return function (event) {
          Zotero.ZoteroPDFTranslate.onSelect(event, currentReader, disable);
        };
      })(currentReader, disable)
    );
  },

  getSideBarOpen: function () {
    let _contextPaneSplitterStacked = document.getElementById(
      "zotero-context-splitter-stacked"
    );

    let _contextPaneSplitter = document.getElementById(
      "zotero-context-splitter"
    );

    let splitter =
      Zotero.Prefs.get("layout") == "stacked"
        ? _contextPaneSplitterStacked
        : _contextPaneSplitter;

    return splitter.getAttribute("state") != "collapsed";
  },

  buildSideBarPanel: async function () {
    Zotero.debug("ZoteroPDFTranslate: buildSideBarPanel");
    let tab = Zotero.ZoteroPDFTranslate.view.tab;
    if (!tab) {
      tab = document.createElement("tab");
      tab.setAttribute("id", "pdf-translate-tab");
      tab.setAttribute("label", "Translate");
      Zotero.ZoteroPDFTranslate.view.tab = tab;
    }

    // The first tabbox is zotero main pane tabbox
    let n = 0;
    let tabbox = Zotero.ZoteroPDFTranslate.reader.getReaderTab();
    while (!tabbox) {
      if (n >= 500) {
        Zotero.debug("ZoteroPDFTranslate: Waiting for reader failed");
        // Zotero.ZoteroPDFTranslate.view.showProgressWindow(
        //   "PDF Translate",
        //   "Sidebar Load Failed",
        //   "fail"
        // );
        return;
      }
      await Zotero.Promise.delay(10);
      tabbox = Zotero.ZoteroPDFTranslate.reader.getReaderTab();
      n++;
    }
    tabbox.getElementsByTagName("tabs")[0].appendChild(tab);
    let itemCount = tabbox.getElementsByTagName("tabs")[0].itemCount;

    let panelInfo = Zotero.ZoteroPDFTranslate.view.tabPanel;
    if (!panelInfo) {
      panelInfo = document.createElement("tabpanel");
      panelInfo.setAttribute("id", "pdf-translate-tabpanel");
      panelInfo.setAttribute("flex", "1");

      let vbox = document.createElement("vbox");
      vbox.setAttribute("flex", "1");
      vbox.setAttribute("align", "stretch");
      vbox.style.padding = "0px 10px 10px 10px";

      let hboxTranslate = document.createElement("hbox");
      hboxTranslate.setAttribute("flex", "1");
      hboxTranslate.setAttribute("align", "center");
      hboxTranslate.maxHeight = 50;
      hboxTranslate.minHeight = 50;
      hboxTranslate.style.height = "80px";

      let hboxLanguage = document.createElement("hbox");
      hboxLanguage.setAttribute("flex", "1");
      hboxLanguage.setAttribute("align", "center");
      hboxLanguage.maxHeight = 50;
      hboxLanguage.minHeight = 50;
      hboxLanguage.style.height = "80px";

      let hboxCopy = document.createElement("hbox");
      hboxCopy.setAttribute("flex", "1");
      hboxCopy.setAttribute("align", "center");
      hboxCopy.maxHeight = 50;
      hboxCopy.minHeight = 50;
      hboxCopy.style.height = "80px";

      let SLMenuList = document.createElement("menulist");
      SLMenuList.setAttribute("id", "pdf-translate-sl");
      SLMenuList.style.width = "145px";
      SLMenuList.setAttribute(
        "value",
        Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage")
      );
      let SLMenuPopup = document.createElement("menupopup");
      SLMenuList.appendChild(SLMenuPopup);
      for (let lang of Zotero.ZoteroPDFTranslate.translate.LangCultureNames) {
        let menuitem = document.createElement("menuitem");
        menuitem.setAttribute("label", lang.DisplayName);
        menuitem.setAttribute("value", lang.LangCultureName);
        menuitem.addEventListener("command", (e) => {
          let newSL = e.target.value;
          Zotero.Prefs.set("ZoteroPDFTranslate.sourceLanguage", newSL);
        });
        SLMenuPopup.appendChild(menuitem);
      }

      let languageLabel = document.createElement("label");
      languageLabel.setAttribute("id", "pdf-translate-switch");
      languageLabel.setAttribute("flex", "1");
      languageLabel.style["text-align"] = "center";
      languageLabel.style["font-size"] = "14px";
      languageLabel.setAttribute("value", "➡️");
      languageLabel.addEventListener("mouseover", (e) => {
        e.target.setAttribute("value", "🔃");
      });
      languageLabel.addEventListener("mouseleave", (e) => {
        e.target.setAttribute("value", "➡️");
      });
      languageLabel.addEventListener("click", (e) => {
        let SLMenu = document.getElementById("pdf-translate-sl");
        let TLMenu = document.getElementById("pdf-translate-tl");
        let sl = SLMenu.value;
        let tl = TLMenu.value;
        Zotero.Prefs.set("ZoteroPDFTranslate.sourceLanguage", tl);
        Zotero.Prefs.set("ZoteroPDFTranslate.targetLanguage", sl);
        SLMenu.value = tl;
        TLMenu.value = sl;
      });

      let TLMenuList = document.createElement("menulist");
      TLMenuList.setAttribute("id", "pdf-translate-tl");
      TLMenuList.style.width = "145px";
      TLMenuList.setAttribute(
        "value",
        Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage")
      );
      let TLMenuPopup = document.createElement("menupopup");
      TLMenuList.appendChild(TLMenuPopup);
      for (let lang of Zotero.ZoteroPDFTranslate.translate.LangCultureNames) {
        let menuitem = document.createElement("menuitem");
        menuitem.setAttribute("label", lang.DisplayName);
        menuitem.setAttribute("value", lang.LangCultureName);
        menuitem.addEventListener("command", (e) => {
          let newTL = e.target.value;
          Zotero.Prefs.set("ZoteroPDFTranslate.targetLanguage", newTL);
        });
        TLMenuPopup.appendChild(menuitem);
      }
      hboxLanguage.append(SLMenuList, languageLabel, TLMenuList);

      let menuLabel = document.createElement("label");
      menuLabel.setAttribute("value", "Engine");
      let menulist = document.createElement("menulist");
      menulist.setAttribute("id", "pdf-translate-engine");
      menulist.setAttribute("flex", "1");
      menulist.setAttribute(
        "value",
        Zotero.Prefs.get("ZoteroPDFTranslate.translateSource")
      );
      let menupopup = document.createElement("menupopup");
      menulist.appendChild(menupopup);
      for (let source of Zotero.ZoteroPDFTranslate.translate.sources) {
        let menuitem = document.createElement("menuitem");
        menuitem.setAttribute(
          "label",
          Zotero.ZoteroPDFTranslate.translate.sourcesName[source]
        );
        menuitem.setAttribute("value", source);
        menuitem.addEventListener("command", (e) => {
          let newSource = e.target.value;
          Zotero.Prefs.set("ZoteroPDFTranslate.translateSource", newSource);
          let userSecrets = JSON.parse(
            Zotero.Prefs.get("ZoteroPDFTranslate.secretObj")
          );
          Zotero.Prefs.set("ZoteroPDFTranslate.secret", userSecrets[newSource]);
          Zotero.ZoteroPDFTranslate.onButtonClick(e);
        });
        menupopup.appendChild(menuitem);
      }

      let buttonTranslate = document.createElement("button");
      buttonTranslate.setAttribute("label", "Translate");
      buttonTranslate.setAttribute("flex", "1");
      buttonTranslate.setAttribute(
        "oncommand",
        "Zotero.ZoteroPDFTranslate.onButtonClick()"
      );

      hboxTranslate.append(menuLabel, menulist, buttonTranslate);

      let buttonCopySource = document.createElement("button");
      buttonCopySource.setAttribute("label", "Copy Raw");
      buttonCopySource.setAttribute("flex", "1");
      buttonCopySource.setAttribute(
        "oncommand",
        "Zotero.Utilities.Internal.copyTextToClipboard(Zotero.ZoteroPDFTranslate._sourceText)"
      );

      let buttonCopyTranslated = document.createElement("button");
      buttonCopyTranslated.setAttribute("label", "Copy Result");
      buttonCopyTranslated.setAttribute("flex", "1");
      buttonCopyTranslated.setAttribute(
        "oncommand",
        "Zotero.Utilities.Internal.copyTextToClipboard(Zotero.ZoteroPDFTranslate._translatedText)"
      );

      hboxCopy.append(buttonCopySource, buttonCopyTranslated);

      let textboxSource = document.createElement("textbox");
      textboxSource.setAttribute("id", "pdf-translate-source");
      textboxSource.setAttribute("flex", "1");
      textboxSource.setAttribute("multiline", true);
      textboxSource.style["font-size"] = `${Zotero.Prefs.get(
        "ZoteroPDFTranslate.fontSize"
      )}px`;

      let rawResultOrder = Zotero.Prefs.get(
        "ZoteroPDFTranslate.rawResultOrder"
      );
      let splitter = document.createElement("splitter");
      splitter.setAttribute("collapse", rawResultOrder ? "after" : "before");
      let grippy = document.createElement("grippy");
      splitter.append(grippy);

      let textboxTranslated = document.createElement("textbox");
      textboxTranslated.setAttribute("multiline", true);
      textboxTranslated.setAttribute("flex", "1");
      textboxTranslated.setAttribute("id", "pdf-translate-translated");
      textboxTranslated.style["font-size"] = `${Zotero.Prefs.get(
        "ZoteroPDFTranslate.fontSize"
      )}px`;

      vbox.append(
        hboxTranslate,
        hboxLanguage,
        rawResultOrder ? textboxTranslated : textboxSource,
        splitter,
        rawResultOrder ? textboxSource : textboxTranslated,
        hboxCopy
      );
      panelInfo.append(vbox);
      Zotero.ZoteroPDFTranslate.view.tabPanel = panelInfo;

      Zotero.ZoteroPDFTranslate.view.sideBarTextboxSource = textboxSource;
      Zotero.ZoteroPDFTranslate.view.sideBarTextboxTranslated =
        textboxTranslated;
    }
    tabbox.getElementsByTagName("tabpanels")[0].appendChild(panelInfo);
    tabbox.selectedIndex = itemCount - 1;
  },

  updateSideBarPanelMenu: function () {
    Zotero.ZoteroPDFTranslate.view.checkSideBarPanel();
    let SLMenuList = document.getElementById("pdf-translate-sl");
    let TLMenuList = document.getElementById("pdf-translate-tl");
    let engineMenuList = document.getElementById("pdf-translate-engine");
    let sourceLanguage = Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage");
    if (SLMenuList && SLMenuList.value != sourceLanguage) {
      for (let i = 0; i < SLMenuList.itemCount; i++) {
        if (SLMenuList.getItemAtIndex(i).value == sourceLanguage) {
          SLMenuList.selectedIndex = i;
          break;
        }
      }
    }
    let targetLanguage = Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage");
    if (TLMenuList && TLMenuList.value != targetLanguage) {
      for (let i = 0; i < TLMenuList.itemCount; i++) {
        if (TLMenuList.getItemAtIndex(i).value == targetLanguage) {
          TLMenuList.selectedIndex = i;
          break;
        }
      }
    }
    let engine = Zotero.Prefs.get("ZoteroPDFTranslate.translateSource");
    if (engineMenuList && engineMenuList.value != engine) {
      for (let i = 0; i < engineMenuList.itemCount; i++) {
        if (engineMenuList.getItemAtIndex(i).value == engine) {
          engineMenuList.selectedIndex = i;
          break;
        }
      }
    }
  },

  checkSideBarPanel: function () {
    let panel = document.getElementById("pdf-translate-tabpanel");
    if (!panel) {
      Zotero.ZoteroPDFTranslate.view.buildSideBarPanel();
    }
  },

  buildPopupPanel: function (currentReader = undefined) {
    Zotero.debug("ZoteroPDFTranslate: buildPopupPanel");
    if (!currentReader) {
      currentReader = Zotero.ZoteroPDFTranslate.reader.getReader();
    }
    let selectionMenu =
      currentReader._iframeWindow.document.getElementById("selection-menu");
    if (!currentReader || !selectionMenu) {
      return false;
    }
    Zotero.ZoteroPDFTranslate.view.onPopopItemChange(selectionMenu);

    // Create text
    let textbox = currentReader._window.document.createElement("textbox");
    textbox.setAttribute("id", "pdf-translate-popup");
    textbox.setAttribute("multiline", true);
    textbox.style["font-size"] = `${Zotero.Prefs.get(
      "ZoteroPDFTranslate.fontSize"
    )}px`;

    textbox.setAttribute("width", 105);
    textbox.setAttribute("height", 30);
    selectionMenu.style.width = `105px`;
    selectionMenu.style.height = `50px`;

    textbox.onmousedown = (e) => {
      e.preventDefault();
    };
    textbox.onclick = (e) => {
      let text = Zotero.ZoteroPDFTranslate._translatedText
        ? Zotero.ZoteroPDFTranslate._translatedText
        : Zotero.ZoteroPDFTranslate._sourceText;
      Zotero.Utilities.Internal.copyTextToClipboard(text);
      Zotero.ZoteroPDFTranslate.view.showProgressWindow(
        "Copy To Clipboard",
        text.length < 20 ? text : text.slice(0, 15) + "..."
      );
    };

    selectionMenu.appendChild(textbox);
    Zotero.ZoteroPDFTranslate.view.popupTextBox = textbox;
  },

  buildPopupButton: function (currentReader = undefined) {
    Zotero.debug("ZoteroPDFTranslate: buildPopupButton");
    if (!currentReader) {
      currentReader = Zotero.ZoteroPDFTranslate.reader.getReader();
    }
    let selectionMenu =
      currentReader._iframeWindow.document.getElementById("selection-menu");
    if (!currentReader || !selectionMenu) {
      return false;
    }
    Zotero.ZoteroPDFTranslate.view.onPopopItemChange(selectionMenu);

    // Create button
    let button = currentReader._window.document.createElement("button");
    button.setAttribute("id", "pdf-translate-popup-button");
    button.setAttribute("label", "");
    button.setAttribute("tooltiptext", "Add/Refresh Rule");
    button.setAttribute("label", "Translate");
    button.onclick = function (e) {
      Zotero.ZoteroPDFTranslate.onButtonClick(e, currentReader);
    };
    button.style["width"] = "100px";
    button.style["height"] = "20px";
    selectionMenu.style["height"] = "40px";

    selectionMenu.appendChild(button);
  },

  removePopupPanel: function (currentReader) {
    let currentButton = currentReader._iframeWindow.document.getElementById(
      "pdf-translate-popup-button"
    );
    currentButton && currentButton.remove();

    let currentPanel = currentReader._iframeWindow.document.getElementById(
      "pdf-translate-popup"
    );
    currentPanel && currentPanel.remove();
  },

  updatePopupStyle: function (currentReader) {
    Zotero.debug("ZoteroPDFTranslate: updatePopupStyle");
    let selectionMenu =
      currentReader._iframeWindow.document.getElementById("selection-menu");
    if (!Zotero.ZoteroPDFTranslate.view.popupTextBox || !selectionMenu) {
      return;
    }

    // Get current H & W
    let textHeight = document.getAnonymousNodes(
      Zotero.ZoteroPDFTranslate.view.popupTextBox
    )[0].childNodes[0].scrollHeight;
    let textWidth = Number(Zotero.ZoteroPDFTranslate.view.popupTextBox.width);
    if (textHeight / textWidth > 0.75) {
      // Update width
      let newWidth = parseInt(textWidth + 20);
      Zotero.ZoteroPDFTranslate.view.popupTextBox.setAttribute(
        "width",
        newWidth
      );
      selectionMenu.style.width = `${newWidth}px`;
      // Check until H/W<0.75
      Zotero.ZoteroPDFTranslate.view.updatePopupStyle(currentReader);
      return;
    }
    Zotero.ZoteroPDFTranslate.view.popupTextBox.style.height = `${textHeight}px`;
    selectionMenu.style.height = `${textHeight + 20}px`;
  },

  onPopopItemChange: function (selectionMenu) {
    selectionMenu.addEventListener(
      "DOMSubtreeModified",
      function () {
        if (parseInt(selectionMenu.style.height) < selectionMenu.scrollHeight)
          selectionMenu.style.height = `${selectionMenu.scrollHeight}px`;
      },
      false
    );
  },

  updateResults: function () {
    // Update error info if not success
    if (Zotero.ZoteroPDFTranslate._debug) {
      Zotero.ZoteroPDFTranslate._translatedText =
        Zotero.ZoteroPDFTranslate._debug;
    }
    if (Zotero.ZoteroPDFTranslate.view.sideBarTextboxSource) {
      Zotero.ZoteroPDFTranslate.view.sideBarTextboxSource.setAttribute(
        "value",
        Zotero.ZoteroPDFTranslate._sourceText
      );
    }
    if (Zotero.ZoteroPDFTranslate.view.sideBarTextboxTranslated) {
      Zotero.ZoteroPDFTranslate.view.sideBarTextboxTranslated.setAttribute(
        "value",
        Zotero.ZoteroPDFTranslate._translatedText
      );
    }
    if (Zotero.ZoteroPDFTranslate.view.popupTextBox) {
      Zotero.ZoteroPDFTranslate.view.popupTextBox.setAttribute(
        "value",
        Zotero.ZoteroPDFTranslate._translatedText
          ? Zotero.ZoteroPDFTranslate._translatedText
          : Zotero.ZoteroPDFTranslate._sourceText
      );
    }
  },

  progressWindowIcon: {
    success: "chrome://zotero/skin/tick.png",
    fail: "chrome://zotero/skin/cross.png",
  },

  showProgressWindow: function (header, context, type = "success") {
    // Zotero.ZoteroTag.progressWindow.close();
    let progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
    progressWindow.changeHeadline(header);
    progressWindow.progress = new progressWindow.ItemProgress(
      Zotero.ZoteroPDFTranslate.view.progressWindowIcon[type],
      context
    );
    progressWindow.show();
    progressWindow.startCloseTimer(5000);
  },
};
