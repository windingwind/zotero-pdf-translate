import { TranslateTask, TranslateTaskProcessor } from "../../utils/task";

export const googleapi = <TranslateTaskProcessor>async function (data) {
  return await _google("https://translate.googleapis.com", data);
};
export const google = <TranslateTaskProcessor>async function (data) {
  return await _google("https://translate.google.com", data);
};

async function _google(url: string, data: Required<TranslateTask>) {
  function TL(a: any) {
    const k = "";
    const b = 406644;
    const b1 = 3293161072;

    const jd = ".";
    const $b = "+-a^+6";
    const Zb = "+-3^+b+-f";

    let e, f, g;

    for (e = [], f = 0, g = 0; g < a.length; g++) {
      let m = a.charCodeAt(g);
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

  function RL(a: any, b: any) {
    const t = "a";
    const Yb = "+";
    let d;
    for (let c = 0; c < b.length - 2; c += 3) {
      (d = b.charAt(c + 2)),
        (d = d >= t ? d.charCodeAt(0) - 87 : Number(d)),
        (d = b.charAt(c + 1) == Yb ? a >>> d : a << d);
      a = b.charAt(c) == Yb ? (a + d) & 4294967295 : a ^ d;
    }
    return a;
  }

  const langfrom = LANG_MAP[data.langfrom] || data.langfrom;
  const langto = LANG_MAP[data.langto] || data.langto;

  const param = `sl=${langfrom}&tl=${langto}`;

  const xhr = await Zotero.HTTP.request(
    "GET",
    `${
      data.secret ? data.secret : url
    }/translate_a/single?client=gtx&${param}&hl=zh-CN&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&source=bh&ssel=0&tsel=0&kc=1&tk=${TL(
      data.raw,
    )}&q=${encodeURIComponent(data.raw)}`,
    { responseType: "json" },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  let tgt = "";
  for (let i = 0; i < xhr.response[0].length; i++) {
    if (!xhr.response[0][i]) {
      continue;
    }
    if (xhr.response[0][i] && xhr.response[0][i][0]) {
      tgt += xhr.response[0][i][0];
    }
  }
  data.result = tgt;
}

const LANG_MAP = {
  // https://github.com/windingwind/zotero-pdf-translate/issues/997
  "pt-BR": "pt",
} as Record<string, string | undefined>;
