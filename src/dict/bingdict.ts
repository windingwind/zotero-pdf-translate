import { str2dom } from "../base";

async function bingdict(text: string = undefined) {
  let args = this.getArgs("bingdict", text);

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        `https://cn.bing.com/dict/search?q=${encodeURIComponent(args.text)}/`,
        { responseType: "text" }
      );
    },
    (xhr) => {
      let res = xhr.response;
      const doc = str2dom(res),
        mp3s = Array.from(doc.querySelectorAll(".hd_area .bigaud")),
        phoneticText = doc.querySelectorAll(".hd_area .b_primtxt");
      this._Addon._audioSourceURLs = mp3s.map(
        (a: HTMLAnchorElement, i: number) => [
            phoneticText[i].innerHTML.replace("&nbsp;", ""),
            a.getAttribute('onclick').match(/https?:\/\/\S+\.mp3/g)
      ]);
      try {
        res = res.match(
          /<meta name=\"description\" content=\"(.+) \" ?\/>/gm
        )[0];
      } catch (e) {
        return "";
      }

      let tgt = "";
      for (let line of res.split("，").slice(1)) {
        if (line.indexOf("网络释义") > -1) {
          tgt += line.slice(0, line.lastIndexOf("；"));
        } else {
          tgt += line + "\n";
        }
      }
      tgt = tgt.replace(/" \/>/g, "");

      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}
export { bingdict };
