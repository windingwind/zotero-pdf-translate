async function haicidict(text: string = undefined) {
  let args = this.getArgs("haicidict", text);

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        `http://dict.cn/${args.text}`,
        { responseType: "text" }
      );
    },
    (xhr) => {
      let res = xhr.response;
      let regex = /naudio="(\w+.mp3\?t=\w+?)"/
      this._Addon._phonetic = Array.prototype.map.call(
        res.match(new RegExp(regex, "gi")),
        (s: string) => ({ 
          text: "", 
          url: 'http://audio.dict.cn/' + s.match(new RegExp(regex, "i"))[1] 
        })
      );
      let tgt = "";
      try {
        regex = /<span>(.)[\n\t\s]*?<bdo lang="EN-US">(.+?)<\/bdo>/
        let symbols = []
        res.match(new RegExp(regex, "g")).forEach(
          line => {
            let [_, country, sym] = line.match(regex)
            symbols.push(`${country} ${sym}`)
          }
        )
        tgt += (symbols.join("\n") + "\n")
        res = res.match(
          /<ul class="dict-basic-ul">[\s\S]+?<\/ul>/
        )[0];
      } catch (e) {
        return "";
      }
      for (let line of res.match(/<li>[\s\S]+?<\/li>/g)) {
        Zotero.debug(line);
        tgt += (line.replace(/<\/?.+?>/g, "").replace(/[\n\t]+/g, " ").trim() + '\n')
      }
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}
export { haicidict };
