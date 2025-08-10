import { TranslateTaskProcessor } from "../../utils/task";

const cambridgeLangCode = <const>[
  { name: "arabic", code: "ar", parser: parser1 },
  { name: "bengali", code: "bn", parser: parser1 },
  { name: "catalan", code: "ca", parser: parser1 },
  { name: "chinese-simplified", code: "zh", parser: parser1 },
  { name: "chinese-traditional", code: "zht", parser: parser1 },
  { name: "english", code: "en", parser: parser1 },
  { name: "gujarati", code: "gu", parser: parser1 },
  { name: "hindi", code: "hi", parser: parser1 },
  { name: "italian", code: "it", parser: parser1 },
  { name: "japanese", code: "ja", parser: parser1 },
  { name: "korean", code: "ko", parser: parser1 },
  { name: "marathi", code: "mr", parser: parser1 },
  { name: "polish", code: "pl", parser: parser1 },
  { name: "portuguese", code: "pt", parser: parser1 },
  { name: "russian", code: "ru", parser: parser1 },
  { name: "spanish", code: "es", parser: parser1 },
  { name: "tamil", code: "ta", parser: parser1 },
  { name: "telugu", code: "te", parser: parser1 },
  { name: "turkish", code: "tr", parser: parser1 },
  { name: "urdu", code: "ur", parser: parser1 },

  { name: "french", code: "fr", parser: parser2 },
  { name: "german", code: "de", parser: parser2 },
  { name: "dutch", code: "nl", parser: parser2 },
  { name: "indonesian", code: "id", parser: parser2 },
  { name: "norwegian", code: "no", parser: parser2 },
  { name: "swedish", code: "sv", parser: parser2 },
  { name: "czech", code: "cs", parser: parser2 },
  { name: "danish", code: "da", parser: parser2 },
  { name: "malaysian", code: "ms", parser: parser2 },
  { name: "thai", code: "th", parser: parser2 },
  { name: "ukrainian", code: "uk", parser: parser2 },
  { name: "vietnamese", code: "vi", parser: parser2 },
];

const dictCode = cambridgeLangCode.reduce(
  (acc, cur) => {
    acc[`en-${cur.code}`] = `english-${cur.name}`;
    return acc;
  },
  {} as Record<string, string>,
);

const parsers = cambridgeLangCode.reduce(
  (acc, cur) => {
    acc[`en-${cur.code}`] = cur.parser;
    return acc;
  },
  {} as Record<string, typeof parser1>,
);

export default <TranslateTaskProcessor>async function (data) {
  const { dict, parser } = getDictionaryCode(data.langfrom, data.langto);
  if (dict === "unsupported" || !parser)
    throw `Language Error: unsupported dictionary ${dict}`;

  const xhr = await Zotero.HTTP.request(
    "GET",
    `https://dictionary.cambridge.org/dictionary/${dict}/${encodeURIComponent(data.raw)}`,
    {
      responseType: "text",
    },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
  const res = xhr.response;
  const doc = new DOMParser().parseFromString(res, "text/html");
  const { result, audioList } = parser(doc);
  if (!result) {
    throw "Parse Error";
  }
  data.result = result;
  data.audio = audioList;
};

function getDictionaryCode(fromCode: string, toCode: string) {
  fromCode = fromCode.split("-")[0].toLowerCase();
  toCode = toCode.toLowerCase();
  if (toCode.includes("zh")) {
    toCode = ["zh", "zh-cn", "zh-sg"].includes(toCode) ? "zh" : "zht";
  }
  toCode = toCode.split("-")[0];
  const code = `${fromCode}-${toCode}`;
  let dict = "";
  let parser = null;
  if (fromCode === "en") {
    dict = dictCode[code] ?? "unsupported";
    parser = parsers[code] ?? null;
  } else {
    // TODO: should implement other languages
    dict = "unsupported";
  }
  return { dict, parser };
}

function parser1(doc: Document) {
  const audioList: Array<{ text: string; url: string }> = [];
  const urls: Array<string> = [];
  const contents: Array<string> = [];

  doc.querySelectorAll(".entry-body__el").forEach((block: Element) => {
    contents.push(block.querySelector(".posgram")?.textContent ?? "");
    let prons: string = "";
    block
      .querySelectorAll('.pos-header span[class*="dpron-"]')
      .forEach((value: Element) => {
        const pron = value.querySelector(".dpron")?.textContent ?? "";
        const pronText = `${value.querySelector(".region")?.textContent ?? ""} ${pron}  `;
        const url = value.querySelector("source")?.getAttribute("src");
        if (pron) prons += pronText;
        if (url && !urls.includes(url)) {
          const audio = {
            text: pronText,
            url: "https://dictionary.cambridge.org" + url,
          };
          audioList.push(audio);
          urls.push(url);
        }
      });
    contents.push(prons);
    contents.push(parseBody(block));
  });
  const result = contents.filter((content) => content !== "").join("\n");
  return { result, audioList };
}

function parser2(doc: Document) {
  const audioList: Array<{ text: string; url: string }> = [];
  const contents: Array<string> = [];

  doc.querySelectorAll(".link").forEach((block: Element) => {
    contents.push(block.querySelector(".dpos")?.textContent ?? "");
    contents.push(block.querySelector(".dpos-h .pron")?.textContent ?? "");
    contents.push(parseBody(block));
  });
  const result = contents.filter((content) => content !== "").join("\n");
  return { result, audioList };
}

function parseBody(block: Element): string {
  const body: Array<string> = [];
  block.querySelectorAll(".dsense").forEach((value: Element, i: number) => {
    const guideword =
      value.querySelector(".guideword")?.textContent?.replace(/\s+/g, " ") ??
      "";
    const defEn = value.querySelector(".def")?.textContent ?? "";
    const def = value.querySelector(".trans[lang]")?.textContent?.trim() ?? "";

    body.push(`\t${i + 1}.${guideword} ${defEn}\n\t\t${def}`);
  });

  return body.join("\n");
}
