import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  const xhr = await Zotero.HTTP.request("GET", `http://dict.cn/${data.raw}`, {
    responseType: "text",
  });
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  let res = xhr.response as string;
  let tgt = "";
  try {
    const audioRegex = /naudio="(\w+.mp3\?t=\w+?)"/;
    data.audio =
      res.match(new RegExp(audioRegex, "gi"))?.map((s: string) => ({
        text: "",
        url: "http://audio.dict.cn/" + s.match(new RegExp(audioRegex, "i"))![1],
      })) || [];
    const symbolsRegex = /<span>(.)[\n\t\s]*?<bdo lang="EN-US">(.+?)<\/bdo>/;
    let symbols: string[] = [];
    res.match(new RegExp(symbolsRegex, "g"))!.forEach((line) => {
      let [_, country, sym] = line.match(symbolsRegex)!;
      symbols.push(`${country} ${sym}`);
    });
    tgt += symbols.join("\n") + "\n";
    res = res.match(/<ul class="dict-basic-ul">[\s\S]+?<\/ul>/)![0];
  } catch (e) {
    throw "Parse error";
  }
  for (let line of res.match(/<li>[\s\S]+?<\/li>/g) || []) {
    tgt +=
      line
        .replace(/<\/?.+?>/g, "")
        .replace(/[\n\t]+/g, " ")
        .trim() + "\n";
  }
  data.result = tgt;
};
