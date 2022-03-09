Zotero.ZoteroPDFTranslate = {
  translate: {
    youdao: async function () {
      param = Zotero.Prefs.get("ZoteroPDFTranslate.translateParam");
      if (typeof param === "undefined") {
        param = "AUTO";
      }
      let xhr = await Zotero.HTTP.request(
        "GET",
        `http://fanyi.youdao.com/translate?&doctype=json&type=${param}&i=${Zotero.ZoteroPDFTranslate._sourceText}`,
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

      param = Zotero.Prefs.get("ZoteroPDFTranslate.translateParam");
      if (typeof param === "undefined") {
        param = "sl=en&tl=zh-CN";
      }

      let xhr = await Zotero.HTTP.request(
        "GET",
        `https://translate.google.cn/translate_a/single?client=webapp&${param}&hl=zh-CN&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&source=bh&ssel=0&tsel=0&kc=1&tk=${TL(
          Zotero.ZoteroPDFTranslate._sourceText
        )}&q=${Zotero.ZoteroPDFTranslate._sourceText}`,
        { responseType: "json" }
      );
      // Zotero.debug(xhr)
      if (xhr.status === 200) {
        try {
          let tgt = "";
          for (let i = 0; i < xhr.response[0].length - 1; i++) {
            tgt += xhr.response[0][i][0];
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
    sources: ["google", "youdao"],
    defaultParam: {
      google: "sl=en&tl=zh-CN",
      youdao: "EN2ZH_CN",
    },
  },
  _openPagePopup: undefined,
  _popup: undefined,
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
    setTimeout(Zotero.ZoteroPDFTranslate.updateTranslatePannel, 5000, 0, false);
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
        Zotero.ZoteroPDFTranslate.updateTranslatePannel(ids[0]);
      } else if (event == "add" && type == "tab") {
        // Wait for ducument load
        setTimeout(
          Zotero.ZoteroPDFTranslate.updateTranslatePannel,
          3000,
          ids[0]
        );
        setTimeout(
          Zotero.ZoteroPDFTranslate.updateTranslatePannel,
          10000,
          ids[0]
        );
      }
    },
  },

  closeTranslatePannel: function (data) {
    if (typeof Zotero.ZoteroPDFTranslate._popup == "undefined") {
      return;
    }
    Zotero.debug("ZoteroPDFTranslate: closeTranslateContent.");

    Zotero.ZoteroPDFTranslate._popup.remove();
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
      if (useTabID && Zotero.Reader._readers[i].tabID !== tabID) {
        // Skip other tabs
        continue;
      }
      // Close pannel on next click, otherwise click twice to close it
      Zotero.Reader._readers[i]._iframeWindow.onpointerdown =
        Zotero.ZoteroPDFTranslate.closeTranslatePannel;

      // Overwrite _openPagePopup
      Zotero.Reader._readers[i]._openPagePopup = async (data) => {
        Zotero.debug("ZoteroPDFTranslate: custom translatePopup.");
        enable = Zotero.Prefs.get("ZoteroPDFTranslate.enable");
        if (enable) {
          // Create popup
          let popup =
            Zotero.Reader._readers[i]._window.document.createElement(
              "menupopup"
            );
          Zotero.Reader._readers[i]._popupset.appendChild(popup);
          if (data.text) {
            // Create text
            let textbox =
              Zotero.Reader._readers[i]._window.document.createElement(
                "textbox"
              );
            textbox.setAttribute("value", data.text);
            textbox.setAttribute("id", "translatePopup");
            textbox.setAttribute("multiline", true);
            textbox.setAttribute(
              "height",
              data.text.length > 100 ? 200 : data.text.length > 50 ? 100 : 50
            );
            textbox.setAttribute("width", 200);

            popup.appendChild(textbox);
            Zotero.ZoteroPDFTranslate._sourceText = data.text;
            Zotero.ZoteroPDFTranslate._popup = popup;
            Zotero.ZoteroPDFTranslate._textbox = textbox;
          }
          popup.openPopupAtScreen(data.x - 220, data.y, true);
        }
        Zotero.ZoteroPDFTranslate._openPagePopup.call(
          Zotero.Reader._readers[i],
          data
        );
        if (enable) {
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
          Zotero.ZoteroPDFTranslate._textbox.setAttribute(
            "value",
            Zotero.ZoteroPDFTranslate._translatedText
          );
        }
      };
    }
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
      Zotero.debug(e)
      return -2;
    }
  },
  resetState: function () {
    // Reset preferrence state.
    let enable = Zotero.Prefs.get("ZoteroPDFTranslate.enable");
    if (typeof enable === "undefined") {
      Zotero.Prefs.set("ZoteroPDFTranslate.enable", true);
    }

    let translateSource = Zotero.Prefs.get(
      "ZoteroPDFTranslate.translateSource"
    );
    if (typeof translateSource === "undefined") {
      translateSource = Zotero.ZoteroPDFTranslate.translate.sources[0];
      Zotero.Prefs.set("ZoteroPDFTranslate.translateSource", translateSource);
    }

    let translateParam = Zotero.Prefs.get("ZoteroPDFTranslate.translateParam");
    if (typeof translateParam === "undefined") {
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.translateParam",
        Zotero.ZoteroPDFTranslate.translate.defaultParam[translateSource]
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
