async function googleapi(text: string = undefined) {
  return await this._google("googleapi", text);
}

async function google(text: string = undefined) {
  return await this._google("google", text);
}

async function _google(engine: string, text: string = undefined) {
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
                    65536 + ((m & 1023) << 10) + (a.charCodeAt(++g) & 1023)),
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
        // @ts-ignore
        d = d >= t ? d.charCodeAt(0) - 87 : Number(d),
        // @ts-ignore
        d = b.charAt(c + 1) == Yb ? a >>> d : a << d;
      a = b.charAt(c) == Yb ? (a + d) & 4294967295 : a ^ d;
    }
    return a;
  }
  let urls = {
    googleapi: "https://translate.googleapis.com",
    google: "https://translate.google.com",
  };

  let args = this.getArgs(engine, text);
  let param = `sl=${args.sl}&tl=${args.tl}`;

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        `${
          args.secret ? args.secret : urls[engine]
        }/translate_a/single?client=gtx&${param}&hl=zh-CN&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&source=bh&ssel=0&tsel=0&kc=1&tk=${TL(
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
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}

export { google, googleapi, _google };
