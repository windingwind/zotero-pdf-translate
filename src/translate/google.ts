async function googleweb(text: string = undefined) {
  let args = this.getArgs("googleweb", text);

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "POST",
        "https://translate.google.cn/_/TranslateWebserverUi/data/batchexecute?rpcids=MkEWBc&f.sid=-2609060161424095358&bl=boq_translate-webserver_20201203.07_p0&hl=zh-CN&soc-app=1&soc-platform=1&soc-device=1&_reqid=359373&rt=c",
        {
          headers: {
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36",
          },
          body: `f.req=%5B%5B%5B%22MkEWBc%22%2C%22%5B%5B%5C%22${encodeURI(
            args.text
          )}%5C%22%2C%5C%22${encodeURI(
            args.sl.split("-")[0]
          )}%5C%22%2C%5C%22${encodeURI(
            args.tl.split("-")[0]
          )}%5C%22%2Ctrue%5D%2C%5Bnull%5D%5D%22%2Cnull%2C%22generic%22%5D%5D%5D`,
        }
      );
    },
    (xhr) => {
      let tgt = "";
      // `]}' 362 [["wrb.fr","MkEWBc","[[null,null,\"en\",[[[0,[[[null,11]],[true]]]],11],[[\"who are you\",null,null,11]]],[[[null,\"Nǐ shì shéi\",null,true,null,[[\"你是谁\",null,null,null,[[\"你是谁\",[2]],[\"谁是你\",[5]],[\"是谁是你\",[11]]]]]]],\"zh\",1,\"en\",[\"who are you\",\"auto\",\"zh\",true]],\"en\"]",null,null,null,"generic"],["di",21],["af.httprm",20,"5084292543345475687"]] 25 [["e",4,null,null,427]] `
      let res_obj = JSON.parse(
        JSON.parse(xhr.response.split("\n")[3])[0][2]
      )[1][0][0][5];

      for (let i = 0; i < res_obj.length; i++) {
        tgt += res_obj[i][0];
      }

      Zotero.debug(tgt);
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}
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
          urls[engine]
        }/translate_a/single?client=webapp&${param}&hl=zh-CN&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&source=bh&ssel=0&tsel=0&kc=1&tk=${TL(
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

export { google, googleapi, googleweb, _google };
