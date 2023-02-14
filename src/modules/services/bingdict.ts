import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  const xhr = await Zotero.HTTP.request(
    "GET",
    `https://cn.bing.com/dict/search?q=${encodeURIComponent(data.raw)}/`,
    { responseType: "text" }
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  let res = xhr.response;
  const doc = ztoolkit.getDOMParser().parseFromString(res, "text/html");
  const mp3s = Array.from(doc.querySelectorAll(".hd_area .bigaud"));
  const phoneticText = doc.querySelectorAll(".hd_area .b_primtxt");
  data.audio = mp3s.map((a: Element, i: number) => ({
    text: phoneticText[i].innerHTML.replace("&nbsp;", " "),
    url: (a.getAttribute("onclick")?.match(/https?:\/\/\S+\.mp3/g) || [""])[0],
  }));

  try {
    res = res.match(/<meta name=\"description\" content=\"(.+) \" ?\/>/gm)[0];
  } catch (e) {
    throw "Parse error";
  }
  let tgt = "";
  for (let line of res.split("，").slice(3)) {
    if (line.indexOf("网络释义") > -1) {
      tgt += line.slice(0, line.lastIndexOf("；"));
    } else {
      tgt += line + "\n";
    }
  }
  tgt = tgt.replace(/" \/>/g, "");
  data.result = tgt;
};
