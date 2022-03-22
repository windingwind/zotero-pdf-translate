Zotero.ZoteroPDFTranslate = {
  translate: {
    baidu: async function () {
      let args = this.getArgs();
      let appid = args.secret.split("#")[0];
      let key = args.secret.split("#")[1];
      let salt = new Date().getTime();
      let sign = Zotero.Utilities.Internal.md5(
        appid + args.text + salt + key,
        false
      );
      `from=${args.sl.split("-")[0]}&to=${args.tl.split("-")[0]}`;
      return await this.requestTranslate(
        async () => {
          return await Zotero.HTTP.request(
            "GET",
            `http://api.fanyi.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(
              args.text
            )}&appid=${appid}&from=${args.sl.split("-")[0]}&to=${
              args.tl.split("-")[0]
            }&salt=${salt}&sign=${sign}`,
            {
              responseType: "json",
            }
          );
        },
        (xhr) => {
          let tgt = "";
          for (let i = 0; i < xhr.response.trans_result.length; i++) {
            tgt += xhr.response.trans_result[i].dst;
          }
          Zotero.debug(tgt);
          Zotero.ZoteroPDFTranslate._translatedText = tgt;
          return true;
        }
      );
    },
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

      return await this.requestTranslate(
        async () => {
          return await Zotero.HTTP.request("POST", api_url, {
            responseType: "json",
            body: req_body,
          });
        },
        (xhr) => {
          let tgt = xhr.response.translations[0].text;
          Zotero.debug(tgt);
          Zotero.ZoteroPDFTranslate._translatedText = tgt;
          return true;
        }
      );
    },
    niutrans: async function () {
      let args = this.getArgs();
      let param = `from=${args.sl.split("-")[0]}&to=${args.tl.split("-")[0]}`;
      return await this.requestTranslate(
        async () => {
          return await Zotero.HTTP.request(
            "GET",
            `https://test.niutrans.com/NiuTransServer/testaligntrans?${param}&src_text=${
              args.text
            }&source=text&dictNo=&memoryNo=&isUseDict=0&isUseMemory=0&time=${new Date().valueOf()}`,
            {
              responseType: "json",
            }
          );
        },
        (xhr) => {
          let tgt = xhr.response.tgt_text;
          Zotero.debug(tgt);
          Zotero.ZoteroPDFTranslate._translatedText = tgt;
          return true;
        }
      );
    },
    caiyun: async function () {
      let args = this.getArgs();
      let param = `${args.sl.split("-")[0]}2${args.tl.split("-")[0]}`;

      return await this.requestTranslate(
        async () => {
          return await Zotero.HTTP.request(
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
        },
        (xhr) => {
          let tgt = xhr.response.target[0];
          Zotero.debug(tgt);
          Zotero.ZoteroPDFTranslate._translatedText = tgt;
          return true;
        }
      );
    },
    microsoft: async function () {
      let args = this.getArgs();
      req_body = JSON.stringify([
        {
          text: args.text,
        },
      ]);

      return await this.requestTranslate(
        async () => {
          return await Zotero.HTTP.request(
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
        },
        (xhr) => {
          let tgt = xhr.response[0].translations[0].text;
          Zotero.debug(tgt);
          Zotero.ZoteroPDFTranslate._translatedText = tgt;
          return true;
        }
      );
    },
    youdao: async function () {
      let args = this.getArgs();
      let param = `${args.sl.toUpperCase().replace("-", "_")}2${args.tl
        .toUpperCase()
        .replace("-", "_")}`;

      return await this.requestTranslate(
        async () => {
          return await Zotero.HTTP.request(
            "GET",
            `http://fanyi.youdao.com/translate?&doctype=json&type=${param}&i=${args.text}`,
            { responseType: "json" }
          );
        },
        (xhr) => {
          let res = xhr.response.translateResult;
          let tgt = "";
          for (let i in res) {
            for (let j in res[i]) {
              tgt += res[i][j].tgt;
            }
          }
          Zotero.debug(tgt);
          Zotero.ZoteroPDFTranslate._translatedText = tgt;
          return true;
        }
      );
    },
    googlecn: async function () {
      return await this.google("https://translate.google.cn");
    },
    google: async function (api_url = "https://translate.google.com") {
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

      return await this.requestTranslate(
        async () => {
          return await Zotero.HTTP.request(
            "GET",
            `${api_url}/translate_a/single?client=webapp&${param}&hl=zh-CN&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&source=bh&ssel=0&tsel=0&kc=1&tk=${TL(
              args.text
            )}&q=${args.text}`,
            { responseType: "json" }
          );
        },
        (xhr) => {
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
          return true;
        }
      );
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
Please consider using another translate engine or posting issue here: https://github.com/windingwind/zotero-pdf-translate/issues
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
    sources: [
      "google",
      "googlecn",
      "youdao",
      "microsoft",
      "caiyun",
      "niutrans",
      "deeplfree",
      "deeplpro",
      "baidu",
    ],
    defaultSourceLanguage: "en-US",
    defaultTargetLanguage: "zh-CN",
    defaultSecret: {
      google: "",
      googlecn: "",
      youdao: "",
      microsoft: "0fbf924f4a334759a3340cf7c09e2128",
      caiyun: "3975l6lr5pcbvidl6jl2",
      niutrans: "",
      deeplfree: "",
      deeplpro: "",
      baidu: "appid#key",
    },
  },
  _popupTextBox: undefined,
  _sideBarTextboxSource: undefined,
  _sideBarTextboxTranslated: undefined,
  _sourceText: "",
  _translatedText: "",
  _debug: undefined,

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
  },

  notifierCallback: {
    // Call updateTranslatePanels when a tab is added or selected
    notify: function (event, type, ids, extraData) {
      Zotero.debug("ZoteroPDFTranslate: open file event detected.");
      if (event == "select" && type == "tab") {
        if (extraData[ids[0]].type !== "reader") {
          return;
        }
        Zotero.debug("ZoteroPDFTranslate: Update Translate Pannls");
        Zotero.ZoteroPDFTranslate.updateTranslatePanel();
      }
    },
  },

  updateTranslatePanel: async function () {
    let currentReader = this.getReader();
    if (!currentReader) {
      return false;
    }
    await currentReader._waitForReader();

    this.removeSideBarPanel();
    this.buildSideBarPanel();

    currentReader._window.addEventListener(
      "pointerup",
      Zotero.ZoteroPDFTranslate.onTranslate
    );
  },

  /*
    UI Functions
  */
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

  buildSideBarPanel: function () {
    Zotero.debug("ZoteroPDFTranslate: buildSideBarPanel");
    let i = this.getReaderID();
    var tabbox = document.getElementsByTagName("tabbox");
    let tab = document.createElement("tab");
    tab.setAttribute("id", "pdf-translate-tab");
    tab.setAttribute("label", "Translate");

    // The first tabbox is zotero main pane tabbox
    tabbox[i + 1].getElementsByTagName("tabs")[0].appendChild(tab);

    let panelInfo = document.createElement("tabpanel");
    panelInfo.setAttribute("id", "pdf-translate-tabpanel");
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
    textboxSource.setAttribute("id", "pdf-translate-source");
    textboxSource.setAttribute("multiline", true);
    textboxSource.style["font-size"] = `${Zotero.Prefs.get(
      "ZoteroPDFTranslate.fontSize"
    )}px`;
    rowSource.append(textboxSource);
    rows.append(rowSource);

    let rowTranslated = document.createElement("row");
    let textboxTranslated = document.createElement("textbox");
    textboxTranslated.setAttribute("multiline", true);
    textboxSource.setAttribute("id", "pdf-translate-translated");
    textboxTranslated.style["font-size"] = `${Zotero.Prefs.get(
      "ZoteroPDFTranslate.fontSize"
    )}px`;
    rowTranslated.append(textboxTranslated);
    rows.append(rowTranslated);

    Zotero.ZoteroPDFTranslate._sideBarTextboxSource = textboxSource;
    Zotero.ZoteroPDFTranslate._sideBarTextboxTranslated = textboxTranslated;
    itemBox.append(rows);
    panelInfo.append(itemBox);

    tabbox[i + 1].getElementsByTagName("tabpanels")[0].appendChild(panelInfo);

    // Update view after sidebar open
    setTimeout(Zotero.ZoteroPDFTranslate.updateSideBarStyle, 100);
    setTimeout(Zotero.ZoteroPDFTranslate.updateSideBarStyle, 500);
    setTimeout(Zotero.ZoteroPDFTranslate.updateSideBarStyle, 3000);
  },

  removeSideBarPanel: function () {
    let tab = document.getElementById("pdf-translate-tab");
    let tabpanel = document.getElementById("pdf-translate-tabpanel");
    if (tabpanel) {
      tabpanel.remove();
    }
    if (tab) {
      tab.remove();
    }
  },
  updateSideBarStyle: function () {
    let tabbox =
      document.getElementsByTagName("tabbox")[this.getReaderID() + 1];
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

  buildPopupPanel: function (width, height) {
    Zotero.debug("ZoteroPDFTranslate: buildPopupPanel");
    let currentReader = this.getReader();
    let selectionMenu =
      currentReader._iframeWindow.document.getElementById("selection-menu");
    if (!currentReader || !selectionMenu) {
      return false;
    }
    // Create text
    let textbox = currentReader._window.document.createElement("textbox");
    textbox.setAttribute("id", "pdf-translate-popup");
    textbox.setAttribute("multiline", true);
    textbox.style["font-size"] = `${Zotero.Prefs.get(
      "ZoteroPDFTranslate.fontSize"
    )}px`;

    textbox.setAttribute("width", width);
    textbox.setAttribute("height", height);
    selectionMenu.style["width"] = `${width}px`;
    selectionMenu.style["height"] = `${height + 20}px`;

    textbox.onmousedown = (e) => {
      e.preventDefault();
    };
    textbox.onclick = (e) => {
      let text = Zotero.ZoteroPDFTranslate._translatedText
        ? Zotero.ZoteroPDFTranslate._translatedText
        : Zotero.ZoteroPDFTranslate._sourceText;
      Zotero.Utilities.Internal.copyTextToClipboard(text);
      Zotero.ZoteroPDFTranslate.showProgressWindow(
        "Copy To Clipbord",
        text.length > 20 ? text : text.slice(0, 15) + "..."
      );
    };

    selectionMenu.appendChild(textbox);
    Zotero.ZoteroPDFTranslate._popupTextBox = textbox;
  },

  /*
    Reader Functions
  */
  getReader: function () {
    return Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
  },

  getReaderID: function () {
    for (let i = 0; i < Zotero.Reader._readers.length; i++) {
      if (Zotero.Reader._readers[i].tabID === Zotero_Tabs.selectedID) {
        return i;
      }
    }
  },

  getSelectedText: function () {
    let currentReader = this.getReader();
    if (!currentReader) {
      return "";
    }
    let _ =
      currentReader._iframeWindow.document.getElementsByTagName("textarea");

    for (let i = 0; i < _.length; i++) {
      // Choose the selection textare
      if (_[i].style["z-index"] == -1 && _[i].style["width"] == "0px") {
        return _[i].value;
      }
    }
    return "";
  },

  /*
    Translte Functions
  */
  onTranslate: async function (e) {
    Zotero.debug(`ZoteroPDFTranslate: onTranslate`);
    // Zotero.debug(e)
    let enable = Zotero.Prefs.get("ZoteroPDFTranslate.enable");
    let text = Zotero.ZoteroPDFTranslate.getSelectedText();
    let currentNode =
      Zotero.ZoteroPDFTranslate.getReader()._iframeWindow.document.getElementById(
        "pdf-translate-popup"
      );
    if (!enable || !text || currentNode) {
      return false;
    }
    Zotero.debug(text);
    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup) {
      Zotero.ZoteroPDFTranslate.buildPopupPanel(
        (width = text.indexOf(" ") > 0 ? 200 : 105),
        (height = text.length < 30 ? 50 : text.length < 60 ? 100 : 200)
      );
    }
    Zotero.ZoteroPDFTranslate._sourceText = text;
    Zotero.ZoteroPDFTranslate._translatedText = "";
    Zotero.ZoteroPDFTranslate.updateSideBarStyle();
    Zotero.ZoteroPDFTranslate.updateResults(true);
    // Zotero.ZoteroPDFTranslate.getReader()._window.removeEventListener(
    //   "pointerup",
    //   Zotero.ZoteroPDFTranslate.onTranslate
    // );
    let success = await Zotero.ZoteroPDFTranslate.getTranslation();

    Zotero.debug(`ZoteroPDFTranslate: Translate return ${success}`);
    // Update result
    Zotero.ZoteroPDFTranslate.updateResults(success);
    return true;
  },
  getTranslation: async function () {
    // Call current translate engine
    let translateSource = Zotero.Prefs.get(
      "ZoteroPDFTranslate.translateSource"
    );
    // bool return for success or fail
    return await Zotero.ZoteroPDFTranslate.translate[translateSource]();
  },

  updateResults: function (success = true) {
    // Update error info if not success
    if (!success) {
      Zotero.ZoteroPDFTranslate._translatedText = String(
        Zotero.ZoteroPDFTranslate._debug
      );
    }
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
  progressWindowIcon: {
    success: "chrome://zotero/skin/tick.png",
    fail: "chrome://zotero/skin/cross.png",
  },
  showProgressWindow: function (header, context, type = "success") {
    // Zotero.ZoteroTag.progressWindow.close();
    let progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
    progressWindow.changeHeadline(header);
    progressWindow.progress = new progressWindow.ItemProgress(
      Zotero.ZoteroPDFTranslate.progressWindowIcon[type],
      context
    );
    progressWindow.show();
    progressWindow.startCloseTimer(5000);
  },
};

window.addEventListener(
  "load",
  function (e) {
    Zotero.ZoteroPDFTranslate.init();
  },
  false
);
