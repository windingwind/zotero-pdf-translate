async function freedictionaryapi(text: string = undefined) {
  let args = this.getArgs("freedictionaryapi", text);

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        `https://api.dictionaryapi.dev/api/v2/entries/en/${args.text}`,
        {
          headers: {
            "Accept": "application/json"
          },
          responseType: "json"
        }
      );
    },
    (xhr) => {
      if (xhr.status == 404) {
        return "Definition not found"
      }

      let meanings = xhr.response[0].meanings

      let tgt = ""
      let definitionCollection = []

      for (let i = 0; i < meanings.length; i++) {
        let definitions = meanings[i].definitions

        for (let j = 0; j < definitions.length; j++) {
          let definition = definitions[j]

          let entry = definition.definition

          if (definition.example) {
            entry += '\n"' + definition.example + '"'
          }

          definitionCollection.push(entry);
        }
      }

      tgt = definitionCollection.join("\n\n");

      Zotero.debug(tgt);
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}

export { freedictionaryapi };
