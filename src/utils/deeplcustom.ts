async function deeplcustom(engine: string, text: string) {
  const args = this.getArgs(engine, text);
  const url = args.secret;
  const req_Body = JSON.stringify(
    {
      text: args.text,
      source_lang: args.sl.split("-")[0].toUpperCase(),
      target_lang: args.tl.split("-")[0].toUpperCase(),
    },
  );

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request("POST", url, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        responseType: "json",
        body: req_Body,
      });
    },
    (xhr) => {
      const tgt = xhr.response.data;
      Zotero.debug(tgt);
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}

export { deeplcustom };
