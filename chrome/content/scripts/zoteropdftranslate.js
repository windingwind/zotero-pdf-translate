Zotero.ZoteroPDFTranslate = {
  translate: {
    tencent: async function () {
      let args = this.getArgs();
      let params = args.secret.split("#");
      let secretId = params[0];
      let secretKey = params[1];
      let region = "ap-shanghai";
      if (params.length >= 3) {
        region = params[2];
      }
      let projectId = "0";
      if (params.length >= 4) {
        projectId = params[3];
      }

      function b64_hmac_sha1(k, d, _p, _z) {
        // heavily optimized and compressed version of http://pajhome.org.uk/crypt/md5/sha1.js
        // _p = b64pad, _z = character size; not used here but I left them available just in case
        if (!_p) {
          _p = "=";
        }
        if (!_z) {
          _z = 8;
        }
        function _f(t, b, c, d) {
          if (t < 20) {
            return (b & c) | (~b & d);
          }
          if (t < 40) {
            return b ^ c ^ d;
          }
          if (t < 60) {
            return (b & c) | (b & d) | (c & d);
          }
          return b ^ c ^ d;
        }
        function _k(t) {
          return t < 20
            ? 1518500249
            : t < 40
            ? 1859775393
            : t < 60
            ? -1894007588
            : -899497514;
        }
        function _s(x, y) {
          var l = (x & 0xffff) + (y & 0xffff),
            m = (x >> 16) + (y >> 16) + (l >> 16);
          return (m << 16) | (l & 0xffff);
        }
        function _r(n, c) {
          return (n << c) | (n >>> (32 - c));
        }
        function _c(x, l) {
          x[l >> 5] |= 0x80 << (24 - (l % 32));
          x[(((l + 64) >> 9) << 4) + 15] = l;
          var w = [80],
            a = 1732584193,
            b = -271733879,
            c = -1732584194,
            d = 271733878,
            e = -1009589776;
          for (var i = 0; i < x.length; i += 16) {
            var o = a,
              p = b,
              q = c,
              r = d,
              s = e;
            for (var j = 0; j < 80; j++) {
              if (j < 16) {
                w[j] = x[i + j];
              } else {
                w[j] = _r(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
              }
              var t = _s(_s(_r(a, 5), _f(j, b, c, d)), _s(_s(e, w[j]), _k(j)));
              e = d;
              d = c;
              c = _r(b, 30);
              b = a;
              a = t;
            }
            a = _s(a, o);
            b = _s(b, p);
            c = _s(c, q);
            d = _s(d, r);
            e = _s(e, s);
          }
          return [a, b, c, d, e];
        }
        function _b(s) {
          var b = [],
            m = (1 << _z) - 1;
          for (var i = 0; i < s.length * _z; i += _z) {
            b[i >> 5] |= (s.charCodeAt(i / 8) & m) << (32 - _z - (i % 32));
          }
          return b;
        }
        function _h(k, d) {
          var b = _b(k);
          if (b.length > 16) {
            b = _c(b, k.length * _z);
          }
          var p = [16],
            o = [16];
          for (var i = 0; i < 16; i++) {
            p[i] = b[i] ^ 0x36363636;
            o[i] = b[i] ^ 0x5c5c5c5c;
          }
          var h = _c(p.concat(_b(d)), 512 + d.length * _z);
          return _c(o.concat(h), 512 + 160);
        }
        function _n(b) {
          var t =
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
            s = "";
          for (var i = 0; i < b.length * 4; i += 3) {
            var r =
              (((b[i >> 2] >> (8 * (3 - (i % 4)))) & 0xff) << 16) |
              (((b[(i + 1) >> 2] >> (8 * (3 - ((i + 1) % 4)))) & 0xff) << 8) |
              ((b[(i + 2) >> 2] >> (8 * (3 - ((i + 2) % 4)))) & 0xff);
            for (var j = 0; j < 4; j++) {
              if (i * 8 + j * 6 > b.length * 32) {
                s += _p;
              } else {
                s += t.charAt((r >> (6 * (3 - j))) & 0x3f);
              }
            }
          }
          return s;
        }
        function _x(k, d) {
          return _n(_h(k, d));
        }
        return _x(k, d);
      }

      let rawStr = `Action=TextTranslate&Language=zh-CN&Nonce=9744&
      ProjectId=${projectId}&Region=${region}&SecretId=${secretId}&Source=${
        args.sl.split("-")[0]
      }&SourceText=#$#&Target=${args.tl.split("-")[0]}&Timestamp=${Date.parse(
        new Date()
      )
        .toString()
        .substr(0, 10)}&Version=2018-03-21`;

      let sha1Str = encodeURIComponent(
        b64_hmac_sha1(
          secretKey,
          `POSTtmt.tencentcloudapi.com/?${rawStr.replace("#$#", args.text)}`
        )
      );

      return await this.requestTranslate(
        async () => {
          return await Zotero.HTTP.request(
            "POST",
            "https://tmt.tencentcloudapi.com",
            {
              headers: {
                "content-type": "application/json",
              },
              body: `${rawStr.replace(
                "#$#",
                encodeURIComponent(args.text)
              )}&Signature=${sha1Str}`,
              responseType: "json",
            }
          );
        },
        (xhr) => {
          let tgt = xhr.response.Response.TargetText;
          Zotero.debug(tgt);
          Zotero.ZoteroPDFTranslate._translatedText = tgt;
          return true;
        }
      );
    },
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
            `https://test.niutrans.com/NiuTransServer/testaligntrans?${param}&src_text=${encodeURIComponent(
              args.text
            )}&source=text&dictNo=&memoryNo=&isUseDict=0&isUseMemory=0&time=${new Date().valueOf()}`,
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
            `http://fanyi.youdao.com/translate?&doctype=json&type=${param}&i=${encodeURIComponent(
              args.text
            )}`,
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
    googleapi: async function () {
      return await this.google("https://translate.googleapis.com");
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
            )}&q=${encodeURIComponent(args.text)}`,
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
      let text = Zotero.ZoteroPDFTranslate._sourceText.replace(/\n/g, " ");
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
      "googleapi",
      "youdao",
      "microsoft",
      "caiyun",
      "niutrans",
      "deeplfree",
      "deeplpro",
      "baidu",
      "tencent",
    ],
    defaultSourceLanguage: "en-US",
    defaultTargetLanguage: "zh-CN",
    defaultSecret: {
      google: "",
      googleapi: "",
      youdao: "",
      microsoft: "",
      caiyun: "3975l6lr5pcbvidl6jl2",
      niutrans: "",
      deeplfree: "",
      deeplpro: "",
      baidu: "appid#key",
      tencent:
        "secretId#SecretKey#Region(default ap-shanghai)#ProjectId(default 0)",
    },
    LangCultureNames: [
      { LangCultureName: "af-ZA", DisplayName: "Afrikaans - South Africa" },
      { LangCultureName: "sq-AL", DisplayName: "Albanian - Albania" },
      { LangCultureName: "ar-DZ", DisplayName: "Arabic - Algeria" },
      { LangCultureName: "ar-BH", DisplayName: "Arabic - Bahrain" },
      { LangCultureName: "ar-EG", DisplayName: "Arabic - Egypt" },
      { LangCultureName: "ar-IQ", DisplayName: "Arabic - Iraq" },
      { LangCultureName: "ar-JO", DisplayName: "Arabic - Jordan" },
      { LangCultureName: "ar-KW", DisplayName: "Arabic - Kuwait" },
      { LangCultureName: "ar-LB", DisplayName: "Arabic - Lebanon" },
      { LangCultureName: "ar-LY", DisplayName: "Arabic - Libya" },
      { LangCultureName: "ar-MA", DisplayName: "Arabic - Morocco" },
      { LangCultureName: "ar-OM", DisplayName: "Arabic - Oman" },
      { LangCultureName: "ar-QA", DisplayName: "Arabic - Qatar" },
      { LangCultureName: "ar-SA", DisplayName: "Arabic - Saudi Arabia" },
      { LangCultureName: "ar-SY", DisplayName: "Arabic - Syria" },
      { LangCultureName: "ar-TN", DisplayName: "Arabic - Tunisia" },
      {
        LangCultureName: "ar-AE",
        DisplayName: "Arabic - United Arab Emirates",
      },
      { LangCultureName: "ar-YE", DisplayName: "Arabic - Yemen" },
      { LangCultureName: "hy-AM", DisplayName: "Armenian - Armenia" },
      {
        LangCultureName: "Cy-az-AZ",
        DisplayName: "Azeri (Cyrillic) - Azerbaijan",
      },
      {
        LangCultureName: "Lt-az-AZ",
        DisplayName: "Azeri (Latin) - Azerbaijan",
      },
      { LangCultureName: "eu-ES", DisplayName: "Basque - Basque" },
      { LangCultureName: "be-BY", DisplayName: "Belarusian - Belarus" },
      { LangCultureName: "bg-BG", DisplayName: "Bulgarian - Bulgaria" },
      { LangCultureName: "ca-ES", DisplayName: "Catalan - Catalan" },
      { LangCultureName: "zh-CN", DisplayName: "Chinese - China" },
      { LangCultureName: "zh-HK", DisplayName: "Chinese - Hong Kong SAR" },
      { LangCultureName: "zh-MO", DisplayName: "Chinese - Macau SAR" },
      { LangCultureName: "zh-SG", DisplayName: "Chinese - Singapore" },
      { LangCultureName: "zh-TW", DisplayName: "Chinese - Taiwan" },
      // { LangCultureName: "zh-CHS", DisplayName: "Chinese (Simplified)" },
      { LangCultureName: "zh-CHT", DisplayName: "Chinese (Traditional)" },
      { LangCultureName: "hr-HR", DisplayName: "Croatian - Croatia" },
      { LangCultureName: "cs-CZ", DisplayName: "Czech - Czech Republic" },
      { LangCultureName: "da-DK", DisplayName: "Danish - Denmark" },
      { LangCultureName: "div-MV", DisplayName: "Dhivehi - Maldives" },
      { LangCultureName: "nl-BE", DisplayName: "Dutch - Belgium" },
      { LangCultureName: "nl-NL", DisplayName: "Dutch - The Netherlands" },
      { LangCultureName: "en-AU", DisplayName: "English - Australia" },
      { LangCultureName: "en-BZ", DisplayName: "English - Belize" },
      { LangCultureName: "en-CA", DisplayName: "English - Canada" },
      { LangCultureName: "en-CB", DisplayName: "English - Caribbean" },
      { LangCultureName: "en-IE", DisplayName: "English - Ireland" },
      { LangCultureName: "en-JM", DisplayName: "English - Jamaica" },
      { LangCultureName: "en-NZ", DisplayName: "English - New Zealand" },
      { LangCultureName: "en-PH", DisplayName: "English - Philippines" },
      { LangCultureName: "en-ZA", DisplayName: "English - South Africa" },
      {
        LangCultureName: "en-TT",
        DisplayName: "English - Trinidad and Tobago",
      },
      { LangCultureName: "en-GB", DisplayName: "English - United Kingdom" },
      { LangCultureName: "en-US", DisplayName: "English - United States" },
      { LangCultureName: "en-ZW", DisplayName: "English - Zimbabwe" },
      { LangCultureName: "et-EE", DisplayName: "Estonian - Estonia" },
      { LangCultureName: "fo-FO", DisplayName: "Faroese - Faroe Islands" },
      { LangCultureName: "fa-IR", DisplayName: "Farsi - Iran" },
      { LangCultureName: "fi-FI", DisplayName: "Finnish - Finland" },
      { LangCultureName: "fr-BE", DisplayName: "French - Belgium" },
      { LangCultureName: "fr-CA", DisplayName: "French - Canada" },
      { LangCultureName: "fr-FR", DisplayName: "French - France" },
      { LangCultureName: "fr-LU", DisplayName: "French - Luxembourg" },
      { LangCultureName: "fr-MC", DisplayName: "French - Monaco" },
      { LangCultureName: "fr-CH", DisplayName: "French - Switzerland" },
      { LangCultureName: "gl-ES", DisplayName: "Galician - Galician" },
      { LangCultureName: "ka-GE", DisplayName: "Georgian - Georgia" },
      { LangCultureName: "de-AT", DisplayName: "German - Austria" },
      { LangCultureName: "de-DE", DisplayName: "German - Germany" },
      { LangCultureName: "de-LI", DisplayName: "German - Liechtenstein" },
      { LangCultureName: "de-LU", DisplayName: "German - Luxembourg" },
      { LangCultureName: "de-CH", DisplayName: "German - Switzerland" },
      { LangCultureName: "el-GR", DisplayName: "Greek - Greece" },
      { LangCultureName: "gu-IN", DisplayName: "Gujarati - India" },
      { LangCultureName: "he-IL", DisplayName: "Hebrew - Israel" },
      { LangCultureName: "hi-IN", DisplayName: "Hindi - India" },
      { LangCultureName: "hu-HU", DisplayName: "Hungarian - Hungary" },
      { LangCultureName: "is-IS", DisplayName: "Icelandic - Iceland" },
      { LangCultureName: "id-ID", DisplayName: "Indonesian - Indonesia" },
      { LangCultureName: "it-IT", DisplayName: "Italian - Italy" },
      { LangCultureName: "it-CH", DisplayName: "Italian - Switzerland" },
      { LangCultureName: "ja-JP", DisplayName: "Japanese - Japan" },
      { LangCultureName: "kn-IN", DisplayName: "Kannada - India" },
      { LangCultureName: "kk-KZ", DisplayName: "Kazakh - Kazakhstan" },
      { LangCultureName: "kok-IN", DisplayName: "Konkani - India" },
      { LangCultureName: "ko-KR", DisplayName: "Korean - Korea" },
      { LangCultureName: "ky-KZ", DisplayName: "Kyrgyz - Kazakhstan" },
      { LangCultureName: "lv-LV", DisplayName: "Latvian - Latvia" },
      { LangCultureName: "lt-LT", DisplayName: "Lithuanian - Lithuania" },
      { LangCultureName: "mk-MK", DisplayName: "Macedonian (FYROM)" },
      { LangCultureName: "ms-BN", DisplayName: "Malay - Brunei" },
      { LangCultureName: "ms-MY", DisplayName: "Malay - Malaysia" },
      { LangCultureName: "mr-IN", DisplayName: "Marathi - India" },
      { LangCultureName: "mn-MN", DisplayName: "Mongolian - Mongolia" },
      { LangCultureName: "nb-NO", DisplayName: "Norwegian (Bokmål) - Norway" },
      { LangCultureName: "nn-NO", DisplayName: "Norwegian (Nynorsk) - Norway" },
      { LangCultureName: "pl-PL", DisplayName: "Polish - Poland" },
      { LangCultureName: "pt-BR", DisplayName: "Portuguese - Brazil" },
      { LangCultureName: "pt-PT", DisplayName: "Portuguese - Portugal" },
      { LangCultureName: "pa-IN", DisplayName: "Punjabi - India" },
      { LangCultureName: "ro-RO", DisplayName: "Romanian - Romania" },
      { LangCultureName: "ru-RU", DisplayName: "Russian - Russia" },
      { LangCultureName: "sa-IN", DisplayName: "Sanskrit - India" },
      {
        LangCultureName: "Cy-sr-SP",
        DisplayName: "Serbian (Cyrillic) - Serbia",
      },
      { LangCultureName: "Lt-sr-SP", DisplayName: "Serbian (Latin) - Serbia" },
      { LangCultureName: "sk-SK", DisplayName: "Slovak - Slovakia" },
      { LangCultureName: "sl-SI", DisplayName: "Slovenian - Slovenia" },
      { LangCultureName: "es-AR", DisplayName: "Spanish - Argentina" },
      { LangCultureName: "es-BO", DisplayName: "Spanish - Bolivia" },
      { LangCultureName: "es-CL", DisplayName: "Spanish - Chile" },
      { LangCultureName: "es-CO", DisplayName: "Spanish - Colombia" },
      { LangCultureName: "es-CR", DisplayName: "Spanish - Costa Rica" },
      { LangCultureName: "es-DO", DisplayName: "Spanish - Dominican Republic" },
      { LangCultureName: "es-EC", DisplayName: "Spanish - Ecuador" },
      { LangCultureName: "es-SV", DisplayName: "Spanish - El Salvador" },
      { LangCultureName: "es-GT", DisplayName: "Spanish - Guatemala" },
      { LangCultureName: "es-HN", DisplayName: "Spanish - Honduras" },
      { LangCultureName: "es-MX", DisplayName: "Spanish - Mexico" },
      { LangCultureName: "es-NI", DisplayName: "Spanish - Nicaragua" },
      { LangCultureName: "es-PA", DisplayName: "Spanish - Panama" },
      { LangCultureName: "es-PY", DisplayName: "Spanish - Paraguay" },
      { LangCultureName: "es-PE", DisplayName: "Spanish - Peru" },
      { LangCultureName: "es-PR", DisplayName: "Spanish - Puerto Rico" },
      { LangCultureName: "es-ES", DisplayName: "Spanish - Spain" },
      { LangCultureName: "es-UY", DisplayName: "Spanish - Uruguay" },
      { LangCultureName: "es-VE", DisplayName: "Spanish - Venezuela" },
      { LangCultureName: "sw-KE", DisplayName: "Swahili - Kenya" },
      { LangCultureName: "sv-FI", DisplayName: "Swedish - Finland" },
      { LangCultureName: "sv-SE", DisplayName: "Swedish - Sweden" },
      { LangCultureName: "syr-SY", DisplayName: "Syriac - Syria" },
      { LangCultureName: "ta-IN", DisplayName: "Tamil - India" },
      { LangCultureName: "tt-RU", DisplayName: "Tatar - Russia" },
      { LangCultureName: "te-IN", DisplayName: "Telugu - India" },
      { LangCultureName: "th-TH", DisplayName: "Thai - Thailand" },
      { LangCultureName: "tr-TR", DisplayName: "Turkish - Turkey" },
      { LangCultureName: "uk-UA", DisplayName: "Ukrainian - Ukraine" },
      { LangCultureName: "ur-PK", DisplayName: "Urdu - Pakistan" },
      {
        LangCultureName: "Cy-uz-UZ",
        DisplayName: "Uzbek (Cyrillic) - Uzbekistan",
      },
      {
        LangCultureName: "Lt-uz-UZ",
        DisplayName: "Uzbek (Latin) - Uzbekistan",
      },
      { LangCultureName: "vi-VN", DisplayName: "Vietnamese - Vietnam" },
    ],
  },
  _popupTextBox: undefined,
  _sideBarTextboxSource: undefined,
  _sideBarTextboxTranslated: undefined,
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
      ["tab", "item"]
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

    Zotero.ZoteroPDFTranslate.updateTranslatePanel();
  },

  notifierCallback: {
    // Call updateTranslatePanels when a tab is added or selected
    notify: async function (event, type, ids, extraData) {
      Zotero.debug("ZoteroPDFTranslate: open file event detected.");
      if (event == "select" && type == "tab") {
        if (extraData[ids[0]].type !== "reader") {
          return;
        }
        Zotero.debug("ZoteroPDFTranslate: Update Translate Panels");
        Zotero.ZoteroPDFTranslate._readerSelect = new Date().getTime();
        Zotero.ZoteroPDFTranslate.updateTranslatePanel();
      }
      if (event == "add" && type == "item") {
        // Disable the reader loading annotation update
        if (
          new Date().getTime() - Zotero.ZoteroPDFTranslate._readerSelect <
          3000
        ) {
          return;
        }
        let items = Zotero.Items.get(ids);
        for (let i = 0; i < items.length; i++) {
          let item = items[i];
          if (
            Zotero.Prefs.get("ZoteroPDFTranslate.enableComment") &&
            item.isAnnotation() &&
            item.annotationType == "highlight" &&
            !item.annotationComment
          ) {
            if (Zotero.ZoteroPDFTranslate._sourceText != item.annotationText) {
              Zotero.ZoteroPDFTranslate._sourceText = item.annotationText;
              let success = await Zotero.ZoteroPDFTranslate.getTranslation();
              if (!success) {
                Zotero.ZoteroPDFTranslate.showProgressWindow(
                  "Annotation Translate Failed",
                  Zotero.ZoteroPDFTranslate._debug,
                  "fail"
                );
                continue;
              }
            }
            let text = Zotero.ZoteroPDFTranslate._translatedText;
            item.annotationComment = text;
            item.saveTx();
            Zotero.ZoteroPDFTranslate.showProgressWindow(
              "Annotation Translate Saved",
              text.length < 20 ? text : text.slice(0, 15) + "..."
            );
          }
        }
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

  /*
    UI Functions
  */
  updateTranslatePanel: async function () {
    await Zotero.uiReadyPromise;

    let currentReader = Zotero.ZoteroPDFTranslate.getReader();
    if (!currentReader) {
      return false;
    }
    await currentReader._waitForReader();

    Zotero.ZoteroPDFTranslate.removeSideBarPanel();
    await Zotero.ZoteroPDFTranslate.buildSideBarPanel();

    currentReader._window.addEventListener(
      "pointerup",
      Zotero.ZoteroPDFTranslate.onSelect
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
    let i = this.getReaderID();
    var tabbox = document.getElementsByTagName("tabbox");
    let tab = document.createElement("tab");
    tab.setAttribute("id", "pdf-translate-tab");
    tab.setAttribute("label", "Translate");

    // The first tabbox is zotero main pane tabbox
    let n = 0;
    while (!tabbox || !tabbox[i + 1]) {
      if (n >= 500) {
        // throw new Error("Waiting for reader failed");
        // this.showProgressWindow("PDF Translate", "Sidebar Load Failed", "fail");
        return;
      }
      await Zotero.Promise.delay(10);
      n++;
    }
    tabbox[i + 1].getElementsByTagName("tabs")[0].appendChild(tab);

    let panelInfo = document.createElement("tabpanel");
    panelInfo.setAttribute("id", "pdf-translate-tabpanel");
    panelInfo.setAttribute("flex", "1");

    let vbox = document.createElement("vbox");
    vbox.setAttribute("flex", "1");
    vbox.setAttribute("align", "stretch");
    vbox.style.padding = "0px 10px 10px 10px";
    let hbox = document.createElement("hbox");
    hbox.setAttribute("flex", "1");
    hbox.setAttribute("align", "center");
    hbox.maxHeight = 50;
    hbox.style.height = "100px";

    let buttonTranslate = document.createElement("button");
    buttonTranslate.setAttribute("label", "Translate");
    buttonTranslate.setAttribute("flex", "1");
    buttonTranslate.setAttribute(
      "oncommand",
      "Zotero.ZoteroPDFTranslate.onButtonClick()"
    );

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

    hbox.append(buttonTranslate, buttonCopySource, buttonCopyTranslated);

    let textboxSource = document.createElement("textbox");
    textboxSource.setAttribute("id", "pdf-translate-source");
    textboxSource.setAttribute("flex", "1");
    textboxSource.setAttribute("multiline", true);
    textboxSource.style["font-size"] = `${Zotero.Prefs.get(
      "ZoteroPDFTranslate.fontSize"
    )}px`;

    let textboxTranslated = document.createElement("textbox");
    textboxTranslated.setAttribute("multiline", true);
    textboxTranslated.setAttribute("flex", "1");
    textboxTranslated.setAttribute("id", "pdf-translate-translated");
    textboxTranslated.style["font-size"] = `${Zotero.Prefs.get(
      "ZoteroPDFTranslate.fontSize"
    )}px`;

    vbox.append(hbox, textboxSource, textboxTranslated);
    panelInfo.append(vbox);
    tabbox[i + 1].getElementsByTagName("tabpanels")[0].appendChild(panelInfo);

    Zotero.ZoteroPDFTranslate._sideBarTextboxSource = textboxSource;
    Zotero.ZoteroPDFTranslate._sideBarTextboxTranslated = textboxTranslated;
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

  updatePopupStyle: function () {
    Zotero.debug("ZoteroPDFTranslate: updatePopupStyle");
    let currentReader = this.getReader();
    let selectionMenu =
      currentReader._iframeWindow.document.getElementById("selection-menu");
    if (!Zotero.ZoteroPDFTranslate._popupTextBox || !selectionMenu) {
      return;
    }

    // Get current H & W
    let textHeight = document.getAnonymousNodes(
      Zotero.ZoteroPDFTranslate._popupTextBox
    )[0].childNodes[0].scrollHeight;
    let textWidth = Number(Zotero.ZoteroPDFTranslate._popupTextBox.width);
    if (textHeight / textWidth > 0.75) {
      // Update width
      let newWidth = parseInt(textWidth + 20);
      Zotero.ZoteroPDFTranslate._popupTextBox.setAttribute("width", newWidth);
      selectionMenu.style.width = `${newWidth}px`;
      // Check until H/W<0.75
      Zotero.ZoteroPDFTranslate.updatePopupStyle();
      return;
    }
    Zotero.ZoteroPDFTranslate._popupTextBox.style.height = `${textHeight}px`;
    selectionMenu.style.height = `${textHeight + 20}px`;
  },

  buildPopupPanel: function () {
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
      Zotero.ZoteroPDFTranslate.showProgressWindow(
        "Copy To Clipboard",
        text.length < 20 ? text : text.slice(0, 15) + "..."
      );
    };

    selectionMenu.appendChild(textbox);
    Zotero.ZoteroPDFTranslate._popupTextBox = textbox;
  },

  removePopupPanel: function () {
    let currentButton =
      Zotero.ZoteroPDFTranslate.getReader()._iframeWindow.document.getElementById(
        "pdf-translate-popup-button"
      );
    currentButton && currentButton.remove();

    let currentPanel =
      Zotero.ZoteroPDFTranslate.getReader()._iframeWindow.document.getElementById(
        "pdf-translate-popup"
      );
    currentPanel && currentPanel.remove();
  },

  buildPopupButton: function () {
    Zotero.debug("ZoteroPDFTranslate: buildPopupButton");
    let currentReader = this.getReader();
    let selectionMenu =
      currentReader._iframeWindow.document.getElementById("selection-menu");
    if (!currentReader || !selectionMenu) {
      return false;
    }
    // Create button
    let button = currentReader._window.document.createElement("button");
    button.setAttribute("id", "pdf-translate-popup-button");
    button.setAttribute("label", "");
    button.setAttribute("tooltiptext", "Add/Refresh Rule");
    button.setAttribute("label", "Translate");
    button.onclick = Zotero.ZoteroPDFTranslate.onButtonClick;
    button.style["width"] = "100px";
    button.style["height"] = "20px";
    selectionMenu.style["height"] = "40px";

    selectionMenu.appendChild(button);
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
    let text = Zotero.ZoteroPDFTranslate.getSelectedText();
    let currentButton =
      Zotero.ZoteroPDFTranslate.getReader()._iframeWindow.document.getElementById(
        "pdf-translate-popup-button"
      );
    let currentNode =
      Zotero.ZoteroPDFTranslate.getReader()._iframeWindow.document.getElementById(
        "pdf-translate-popup"
      );
    if (!enable || !text || currentButton || currentNode) {
      return false;
    }

    let enableAuto = Zotero.Prefs.get("ZoteroPDFTranslate.enableAuto");
    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup) {
      if (enableAuto) {
        Zotero.ZoteroPDFTranslate.buildPopupPanel();
      } else {
        Zotero.ZoteroPDFTranslate.buildPopupButton();
      }
    }

    if (enableAuto) {
      await Zotero.ZoteroPDFTranslate.callTranslate();
    }
  },

  onButtonClick: function (e) {
    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup) {
      Zotero.ZoteroPDFTranslate.removePopupPanel();
      Zotero.ZoteroPDFTranslate.buildPopupPanel();
    }

    Zotero.ZoteroPDFTranslate.callTranslate();
  },

  callTranslate: async function () {
    let text = Zotero.ZoteroPDFTranslate.getSelectedText();

    if (!text) {
      return false;
    }

    // Empty or unchanged
    if (
      !text.replace(/[\r\n]/g, "").replace(/\s+/g, "") ||
      Zotero.ZoteroPDFTranslate._sourceText === text
    ) {
      Zotero.ZoteroPDFTranslate.updateResults();
      Zotero.ZoteroPDFTranslate.updatePopupStyle();
      return true;
    }

    Zotero.ZoteroPDFTranslate._sourceText = text;
    Zotero.ZoteroPDFTranslate._translatedText = "";
    Zotero.ZoteroPDFTranslate._debug = "";
    Zotero.ZoteroPDFTranslate.updateResults();
    Zotero.ZoteroPDFTranslate.updatePopupStyle();

    let success = await Zotero.ZoteroPDFTranslate.getTranslation();

    Zotero.debug(`ZoteroPDFTranslate: Translate return ${success}`);
    let enablePopup = Zotero.Prefs.get("ZoteroPDFTranslate.enablePopup");
    if (enablePopup && Zotero.ZoteroPDFTranslate._popupTextBox) {
      Zotero.ZoteroPDFTranslate._popupTextBox.remove();
      Zotero.ZoteroPDFTranslate.buildPopupPanel();
    }
    // Update result
    Zotero.ZoteroPDFTranslate.updateResults();
    Zotero.ZoteroPDFTranslate.updatePopupStyle();
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

  updateResults: function () {
    // Update error info if not success
    if (Zotero.ZoteroPDFTranslate._debug) {
      Zotero.ZoteroPDFTranslate._translatedText =
        Zotero.ZoteroPDFTranslate._debug;
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
      Zotero.Prefs.set(
        "ZoteroPDFTranslate.targetLanguage",
        Services.locale.getRequestedLocale()
      );
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
  async function (e) {
    Zotero.ZoteroPDFTranslate.init();
  },
  false
);
