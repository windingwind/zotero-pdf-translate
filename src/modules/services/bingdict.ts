import { TranslateService } from "./base";

const translate: TranslateService["translate"] = async function (data) {
  const xhr = await Zotero.HTTP.request(
    "GET",
    `https://cn.bing.com/dict/search?q=${encodeURIComponent(data.raw)}/`,
    { responseType: "text" },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  let res = xhr.response;
  const doc = new DOMParser().parseFromString(res, "text/html");
  const mp3s = Array.from(
    doc.querySelectorAll(".hd_area .bigaud"),
  ) as Element[];
  const phoneticText = doc.querySelectorAll(".hd_area .b_primtxt");

  data.audio = mp3s.map((a: Element, i: number) => ({
    text: phoneticText[i].innerHTML.replace("&nbsp;", " "),
    url: "https://cn.bing.com" + (a.getAttribute("data-mp3link") ?? ""),
  }));

  try {
    res = res.match(/<meta name="description" content="(.+) " ?\/>/gm)[0];
  } catch (e) {
    throw "Parse error";
  }
  let tgt = "";
  for (const line of res.split("，").slice(3)) {
    if (line.indexOf("网络释义") > -1) {
      tgt += line.slice(0, line.lastIndexOf("；"));
    } else {
      tgt += line + "\n";
    }
  }
  tgt = tgt.replace(/" \/>/g, "");
  data.result = tgt;
};

export const BingDict: TranslateService = {
  id: "bingdict",
  type: "sentence",

  translate,

  getConfig() {
    return [];
  },
};
