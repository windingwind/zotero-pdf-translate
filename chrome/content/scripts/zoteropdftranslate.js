Zotero.ZoteroPDFTranslate = {
  translate: {
    deeplfree: async function () {
      return await this.deepl("https://api-free.deepl.com/v2/translate");
    },
    deeplpro: async function () {
      return await this.deepl("https://api.deepl.com/v2/translate");
    },
    deepl: async function (api_url) {
      let args = this.getArgs();
      req_body = `auth_key=${args.secret}&text=${
        args.text
      }&source_lang=${args.sl.split("-")[0].toUpperCase()}&target_lang=${args.tl
        .split("-")[0]
        .toUpperCase()}`;

      xhr = await Zotero.HTTP.request("POST", api_url, {
        responseType: "json",
        body: req_body,
      });

      // Zotero.debug(xhr)
      if (xhr.status === 200) {
        try {
          let tgt = xhr.response.translations[0].text;
          Zotero.debug(tgt);
          Zotero.ZoteroPDFTranslate._translatedText = tgt;
          return 0;
        } catch (e) {
          Zotero.debug(e);
          Zotero.debug(xhr);
          return -1;
        }
      }
      Zotero.ZoteroPDFTranslate._translatedText = xhr.status;
      return xhr.status;
    },
    niutrans: async function () {
      let args = this.getArgs();
      let param = `from=${args.sl.split("-")[0]}&to=${args.tl.split("-")[0]}`;
      let xhr = await Zotero.HTTP.request(
        "GET",
        `https://test.niutrans.com/NiuTransServer/testaligntrans?${param}&src_text=${
          args.text
        }&source=text&dictNo=&memoryNo=&isUseDict=0&isUseMemory=0&time=${new Date().valueOf()}`,
        {
          responseType: "json",
        }
      );

      if (xhr.status === 200) {
        try {
          let tgt = xhr.response.tgt_text;
          Zotero.debug(tgt);
          Zotero.ZoteroPDFTranslate._translatedText = tgt;
          return 0;
        } catch (e) {
          Zotero.debug(e);
          Zotero.debug(xhr);
          return -1;
        }
      }
      Zotero.ZoteroPDFTranslate._translatedText = xhr.status;
      return xhr.status;
    },
    caiyun: async function () {
      let args = this.getArgs();
      let param = `${args.sl.split("-")[0]}2${args.tl.split("-")[0]}`;
      let xhr = await Zotero.HTTP.request(
        "POST",
        "http://api.interpreter.caiyunai.com/v1/translator",
        {
          headers: {
            "content-type": "application/json",
            "x-authorization": `token ${args.secret}`,
          },
          body: JSON.stringify({
            source: [args.text],
            trans_type: param,
            request_id: new Date().valueOf() / 10000,
            detect: true,
          }),
          responseType: "json",
        }
      );

      if (xhr.status === 200) {
        try {
          let tgt = xhr.response.target[0];
          Zotero.debug(tgt);
          Zotero.ZoteroPDFTranslate._translatedText = tgt;
          return 0;
        } catch (e) {
          Zotero.debug(e);
          Zotero.debug(xhr);
          return -1;
        }
      }
      Zotero.ZoteroPDFTranslate._translatedText = xhr.status;
      return xhr.status;
    },
    microsoft: async function () {
      let args = this.getArgs();
      req_body = JSON.stringify([
        {
          text: args.text,
        },
      ]);

      xhr = await Zotero.HTTP.request(
        "POST",
        `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${args.tl}`,
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Host: "api.cognitive.microsofttranslator.com",
            "Content-Length": req_body.length,
            "Ocp-Apim-Subscription-Key": args.secret,
          },
          responseType: "json",
          body: req_body,
        }
      );

      // Zotero.debug(xhr)
      if (xhr.status === 200) {
        try {
          let tgt = xhr.response[0].translations[0].text;
          Zotero.debug(tgt);
          Zotero.ZoteroPDFTranslate._translatedText = tgt;
          return 0;
        } catch (e) {
          Zotero.debug(e);
          Zotero.debug(xhr);
          return -1;
        }
      }
      Zotero.ZoteroPDFTranslate._translatedText = xhr.status;
      return xhr.status;
    },
    youdao: async function () {
      let args = this.getArgs();
      let param = `${args.sl.toUpperCase().replace("-", "_")}2${args.tl
        .toUpperCase()
        .replace("-", "_")}`;
      let xhr = await Zotero.HTTP.request(
        "GET",
        `http://fanyi.youdao.com/translate?&doctype=json&type=${param}&i=${args.text}`,
        { responseType: "json" }
      );
      // Zotero.debug(xhr)
      if (xhr.status === 200 && xhr.response.errorCode == 0) {
        try {
          let res = xhr.response.translateResult;
          let tgt = "";
          for (let i in res) {
            for (let j in res[i]) {
              tgt += res[i][j].tgt;
            }
          }
          Zotero.debug(tgt);
          Zotero.ZoteroPDFTranslate._translatedText = tgt;
          return 0;
        } catch (e) {
          Zotero.debug(e);
          Zotero.debug(xhr);
          return -1;
        }
      }
      Zotero.ZoteroPDFTranslate._translatedText = xhr.status;
      return xhr.status;
    },
    google: async function () {
      function TL(a) {
        var k = "";
        var b = 406644;
        var b1 = 3293161072;

        var jd = ".";
        var $b = "+-a^+6";
        var Zb = "+-3^+b+-f";

        for (var e = [], f = 0, g = 0; g < a.length; g++) {
          var m = a.charCodeAt(g);
          128 > m
            ? (e[f++] = m)
            : (2048 > m
                ? (e[f++] = (m >> 6) | 192)
                : (55296 == (m & 64512) &&
                  g + 1 < a.length &&
                  56320 == (a.charCodeAt(g + 1) & 64512)
                    ? ((m =
                        65536 +
                        ((m & 1023) << 10) +
                        (a.charCodeAt(++g) & 1023)),
                      (e[f++] = (m >> 18) | 240),
                      (e[f++] = ((m >> 12) & 63) | 128))
                    : (e[f++] = (m >> 12) | 224),
                  (e[f++] = ((m >> 6) & 63) | 128)),
              (e[f++] = (m & 63) | 128));
        }
        a = b;
        for (f = 0; f < e.length; f++) (a += e[f]), (a = RL(a, $b));
        a = RL(a, Zb);
        a ^= b1 || 0;
        0 > a && (a = (a & 2147483647) + 2147483648);
        a %= 1e6;
        return a.toString() + jd + (a ^ b);
      }

      function RL(a, b) {
        var t = "a";
        var Yb = "+";
        for (var c = 0; c < b.length - 2; c += 3) {
          var d = b.charAt(c + 2),
            d = d >= t ? d.charCodeAt(0) - 87 : Number(d),
            d = b.charAt(c + 1) == Yb ? a >>> d : a << d;
          a = b.charAt(c) == Yb ? (a + d) & 4294967295 : a ^ d;
        }
        return a;
      }

      let args = this.getArgs();
      let param = `sl=${args.sl}&tl=${args.tl}`;

      let xhr = await Zotero.HTTP.request(
        "GET",
        `https://translate.google.com/translate_a/single?client=webapp&${param}&hl=zh-CN&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&source=bh&ssel=0&tsel=0&kc=1&tk=${TL(
          args.text
        )}&q=${args.text}`,
        { responseType: "json" }
      );
      // Zotero.debug(xhr)
      if (xhr.status === 200) {
        try {
          let tgt = "";
          for (let i = 0; i < xhr.response[0].length; i++) {
            // Zotero.debug(xhr.response[0][i]);
            if (!xhr.response[0][i]) {
              continue;
            }
            if (xhr.response[0][i] && xhr.response[0][i][0]) {
              tgt += xhr.response[0][i][0];
            }
          }
          Zotero.debug(tgt);

          Zotero.ZoteroPDFTranslate._translatedText = tgt;
          return 0;
        } catch (e) {
          Zotero.debug(e);
          Zotero.debug(xhr);
          return -1;
        }
      }
      Zotero.ZoteroPDFTranslate._translatedText = xhr.status;
      return xhr.status;
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
      let text = Zotero.ZoteroPDFTranslate._sourceText;
      return {
        secret,
        sl,
        tl,
        text,
      };
    },
    sources: [
      "google",
      "youdao",
      "microsoft",
      "caiyun",
      "niutrans",
      "deeplfree",
      "deeplpro",
    ],
    defaultSourceLanguage: "en-US",
    defaultTargetLanguage: "zh-CN",
    defaultSecret: {
      google: "",
      youdao: "",
      microsoft: "0fbf924f4a334759a3340cf7c09e2128",
      caiyun: "3975l6lr5pcbvidl6jl2",
      niutrans: "",
      deeplfree: "",
      deeplpro: "",
    },
  },
  _openPagePopup: undefined,
  _popup: undefined,
  _popupTextBox: undefined,
  _sideBarTextboxSource: undefined,
  _sideBarTextboxTranslated: undefined,
  _sourceText: "",
  _translatedText: "",

  init: function () {
    Zotero.ZoteroPDFTranslate.resetState();
    // Register the callback in Zotero as an item observer
    var notifierID = Zotero.Notifier.registerObserver(
      Zotero.ZoteroPDFTranslate.notifierCallback,
      ["tab"]
    );

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener(
      "unload",
      function (e) {
        Zotero.Notifier.unregisterObserver(notifierID);
      },
      false
    );
    // setTimeout(Zotero.ZoteroPDFTranslate.updateTranslatePannel, 5000, 0, false);
  },

  notifierCallback: {
    // Call updateTranslatePannels when a tab is added or selected
    notify: function (event, type, ids, extraData) {
      Zotero.debug("ZoteroPDFTranslate: open file event detected.");
      if (event == "select" && type == "tab") {
        if (extraData[ids[0]].type !== "reader") {
          return;
        }
        Zotero.debug("ZoteroPDFTranslate: Update Translate Pannels");
        if (String(ids[0]) !== "0") {
          Zotero.ZoteroPDFTranslate.updateTranslatePannel(ids[0]);
        }
      }
    },
  },

  closeTranslatePannel: function (data) {
    if (typeof Zotero.ZoteroPDFTranslate._popup == "undefined") {
      return;
    }
    Zotero.debug("ZoteroPDFTranslate: closeTranslateContent.");

    Zotero.ZoteroPDFTranslate._popup.remove();
    Zotero.ZoteroPDFTranslate._popupTextBox = undefined;
  },

  updateTranslatePannel: async function (tabID, useTabID = true) {
    if (Zotero.Reader._readers.length == 0) {
      return false;
    }
    if (typeof Zotero.ZoteroPDFTranslate._openPagePopup == "undefined") {
      // Save defualt _openPagePopup
      Zotero.ZoteroPDFTranslate._openPagePopup =
        Zotero.Reader._readers[0]._openPagePopup;
    }

    for (let i = 0; i < Zotero.Reader._readers.length; i++) {
      await Zotero.Reader._readers[i]._waitForReader();
      if (useTabID && Zotero.Reader._readers[i].tabID !== tabID) {
        // Skip other tabs
        continue;
      }
      let sourceNode = document.getElementById(`textbox-${tabID}-source`);
      let translatedNode = document.getElementById(
        `textbox-${tabID}-translated`
      );

      if (sourceNode) {
        Zotero.debug(`ZoteroPDFTranslate: node ${tabID} already exists.`);
        Zotero.ZoteroPDFTranslate._sideBarTextboxSource = sourceNode;
        Zotero.ZoteroPDFTranslate._sideBarTextboxTranslated = translatedNode;
      } else {
        Zotero.debug(`ZoteroPDFTranslate: node ${tabID} created.`);
        var tabbox = document.getElementsByTagName("tabbox");
        let tab = document.createElement("tab");
        tab.setAttribute("label", "Translate");

        // The first tabbox is zotero main pane tabbox
        tabbox[i + 1].getElementsByTagName("tabs")[0].appendChild(tab);

        let panelInfo = document.createElement("tabpanel");
        panelInfo.setAttribute("flex", "1");
        panelInfo.className = "zotero-editpane-item-box";
        let itemBox = document.createElement("zoteroitembox");
        itemBox.setAttribute("flex", "1");

        let rows = document.createElement("rows");
        let rowButton = document.createElement("row");
        let columns = document.createElement("columns");
        let copySourceColumn = document.createElement("column");
        let buttonCopySource = document.createElement("button");
        buttonCopySource.setAttribute("label", "Copy Raw");
        buttonCopySource.setAttribute(
          "oncommand",
          "Zotero.Utilities.Internal.copyTextToClipboard(Zotero.ZoteroPDFTranslate._sourceText)"
        );
        copySourceColumn.append(buttonCopySource);

        let copyTranslatedColumn = document.createElement("column");
        let buttonCopyTranslated = document.createElement("button");
        buttonCopyTranslated.setAttribute("label", "Copy Result");
        buttonCopyTranslated.setAttribute(
          "oncommand",
          "Zotero.Utilities.Internal.copyTextToClipboard(Zotero.ZoteroPDFTranslate._translatedText)"
        );
        copyTranslatedColumn.append(buttonCopyTranslated);
        columns.append(copySourceColumn, copyTranslatedColumn);
        rowButton.append(columns);
        rows.append(rowButton);

        let rowSource = document.createElement("row");
        let textboxSource = document.createElement("textbox");
        textboxSource.setAttribute("id", `textbox-${tabID}-source`);
        textboxSource.setAttribute("multiline", true);
        textboxSource.style["font-size"] = `${Zotero.Prefs.get(
          "ZoteroPDFTranslate.fontSize"
        )}px`;
        rowSource.append(textboxSource);
        rows.append(rowSource);

        let rowTranslated = document.createElement("row");
        let textboxTranslated = document.createElement("textbox");
        textboxTranslated.setAttribute("multiline", true);
        textboxSource.setAttribute("id", `textbox-${tabID}-translated`);
        textboxTranslated.style["font-size"] = `${Zotero.Prefs.get(
          "ZoteroPDFTranslate.fontSize"
        )}px`;
        rowTranslated.append(textboxTranslated);
        rows.append(rowTranslated);

        Zotero.ZoteroPDFTranslate._sideBarTextboxSource = textboxSource;
        Zotero.ZoteroPDFTranslate._sideBarTextboxTranslated = textboxTranslated;
        itemBox.append(rows);
        panelInfo.append(itemBox);

        tabbox[i + 1]
          .getElementsByTagName("tabpanels")[0]
          .appendChild(panelInfo);
      }
      setTimeout(Zotero.ZoteroPDFTranslate.updateSideBarStyle, 3000, i);

      // Close pannel on next click, otherwise click twice to close it
      Zotero.Reader._readers[i]._iframeWindow.onpointerdown =
        Zotero.ZoteroPDFTranslate.closeTranslatePannel;

      // Overwrite _openPagePopup
      Zotero.Reader._readers[i]._openPagePopup = async (data) => {
        Zotero.debug("ZoteroPDFTranslate: custom translatePopup.");
        let enable = Zotero.Prefs.get("ZoteroPDFTranslate.enable");
        // Check window position setting
        let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
        let enableTranslation = enable && data.text;
        if (enableTranslation && enablePopup) {
          // Create popup
          let popup =
            Zotero.Reader._readers[i]._window.document.createElement(
              "menupopup"
            );
          Zotero.Reader._readers[i]._popupset.appendChild(popup);
          // Create text
          let textbox =
            Zotero.Reader._readers[i]._window.document.createElement("textbox");
          // textbox.setAttribute("value", data.text);
          textbox.setAttribute("id", "translatePopup");
          textbox.setAttribute("multiline", true);
          textbox.style["font-size"] = `${Zotero.Prefs.get(
            "ZoteroPDFTranslate.fontSize"
          )}px`;

          textbox.setAttribute(
            "height",
            data.text.length > 100 ? 200 : data.text.length > 50 ? 100 : 50
          );
          textbox.setAttribute("width", 200);

          popup.appendChild(textbox);
          Zotero.ZoteroPDFTranslate._popup = popup;
          Zotero.ZoteroPDFTranslate._popupTextBox = textbox;

          popup.openPopupAtScreen(data.x - 220, data.y, true);
        }
        if (enableTranslation) {
          Zotero.ZoteroPDFTranslate._sourceText = data.text;
          Zotero.ZoteroPDFTranslate._translatedText = "";
        }
        // Resize textbox
        this.updateSideBarStyle(i);
        Zotero.ZoteroPDFTranslate.updateResults();
        // Call origin _openPagePopup
        Zotero.ZoteroPDFTranslate._openPagePopup.call(
          Zotero.Reader._readers[i],
          data
        );
        if (enableTranslation) {
          // Get translations
          resCode = await Zotero.ZoteroPDFTranslate.getTranslation();
          if (resCode == -2) {
            resInfo = "function error";
          } else if (resCode == -1) {
            resInfo = "parse error";
          } else if (resCode == 0) {
            resInfo = "OK";
          } else {
            resInfo = `request error ${resCode}`;
          }

          Zotero.debug(`ZoteroPDFTranslate: Translate return ${resInfo}`);
          // Update result
          Zotero.ZoteroPDFTranslate.updateResults();
        }
      };
    }
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
  getTranslation: async function () {
    // Call current translate engine
    let translateSource = Zotero.Prefs.get(
      "ZoteroPDFTranslate.translateSource"
    );
    if (typeof translateSource === "undefined") {
      translateSource = Zotero.ZoteroPDFTranslate.translate.sources[0];
    }
    try {
      return await Zotero.ZoteroPDFTranslate.translate[translateSource]();
    } catch (e) {
      Zotero.debug(e);
      return -2;
    }
  },
  updateResults: function () {
    if (Zotero.ZoteroPDFTranslate._sideBarTextboxSource) {
      Zotero.ZoteroPDFTranslate._sideBarTextboxSource.setAttribute(
        "value",
        Zotero.ZoteroPDFTranslate._sourceText
      );
    }
    if (Zotero.ZoteroPDFTranslate._sideBarTextboxTranslated) {
      Zotero.ZoteroPDFTranslate._sideBarTextboxTranslated.setAttribute(
        "value",
        Zotero.ZoteroPDFTranslate._translatedText
      );
    }
    if (Zotero.ZoteroPDFTranslate._popupTextBox) {
      Zotero.ZoteroPDFTranslate._popupTextBox.setAttribute(
        "value",
        Zotero.ZoteroPDFTranslate._translatedText
          ? Zotero.ZoteroPDFTranslate._translatedText
          : Zotero.ZoteroPDFTranslate._sourceText
      );
    }
  },
  updateSideBarStyle: function (i) {
    let tabbox = document.getElementsByTagName("tabbox")[i + 1];
    Zotero.ZoteroPDFTranslate._sideBarTextboxSource.setAttribute(
      "width",
      tabbox.clientWidth - 30
    );
    Zotero.ZoteroPDFTranslate._sideBarTextboxTranslated.setAttribute(
      "width",
      tabbox.clientWidth - 30
    );
    Zotero.ZoteroPDFTranslate._sideBarTextboxSource.setAttribute(
      "height",
      tabbox.clientHeight / 2 - 50
    );
    Zotero.ZoteroPDFTranslate._sideBarTextboxTranslated.setAttribute(
      "height",
      tabbox.clientHeight / 2 - 50
    );
  },
  resetState: function () {
    // Reset preferrence state.
    let enable = Zotero.Prefs.get("ZoteroPDFTranslate.enable");
    if (typeof enable === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enable", true);
    }

    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (typeof enablePopup === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enablePopup", true);
    }

    let fontSize = Zotero.Prefs.get("ZoteroPDFTranslate.fontSize");
    if (typeof fontSize === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.fontSize", "12");
    }

    let translateSource = Zotero.Prefs.get(
      "ZoteroPDFTranslate.translateSource"
    );
    if (typeof translateSource === "undefined") {
      translateSource = Zotero.ZoteroPDFTranslate.translate.sources[0];
      Zotero.Prefs.set("ZoteroPDFTranslate.translateSource", translateSource);
    }

    let sourceLanguage = Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage");
    if (typeof sourceLanguage === "undefined") {
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.sourceLanguage",
        Zotero.ZoteroPDFTranslate.translate.defaultSourceLanguage
      );
    }

    let targetLanguage = Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage");
    if (typeof targetLanguage === "undefined") {
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.targetLanguage",
        Zotero.ZoteroPDFTranslate.translate.defaultTargetLanguage
      );
    }

    let secret = Zotero.Prefs.get("ZoteroPDFTranslate.secret");
    if (typeof secret === "undefined") {
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.secret",
        Zotero.ZoteroPDFTranslate.translate.defaultSecret[translateSource]
      );
    }
  },
};

window.addEventListener(
  "load",
  function (e) {
    Zotero.ZoteroPDFTranslate.init();
  },
  false
);
