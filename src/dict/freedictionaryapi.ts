async function freedictionaryapi(text: string = undefined) {
  let args = this.getArgs("freedictionaryapi", text);

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        `https://api.dictionaryapi.dev/api/v2/entries/en/${args.text}`,
        {
          headers: {
            Accept: "application/json",
          },
          responseType: "json",
        }
      );
    },
    (xhr) => {
      if (xhr.status == 404) {
        return "Definition not found";
      }

      let res = xhr.response[0];
      let tgt = "";
      if (res.phonetics) {
        tgt += res.phonetics.map((p) => p.text).join(",");
        tgt += "\n";
      }
      if (res.meanings) {
        tgt += res.meanings
          .map(
            (m) =>
              `[${m.partOfSpeech}] ${m.definitions
                .map(
                  (d) =>
                    `${d.definition}\n${
                      d.example ? `\t[example] ${d.example}` : ""
                    }`
                )
                .join("")}`
          )
          .join("----\n");
      }

      Zotero.debug(tgt);
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}

export { freedictionaryapi };
