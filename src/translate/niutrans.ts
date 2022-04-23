async function niutrans(text: string = undefined) {
  return await this.niutransapi("niutrans", text);
}
async function niutranspro(text: string = undefined) {
  return await this.niutransapi("niutranspro", text);
}
async function niutransapi(engine: string, text: string) {
  let args = this.getArgs(engine, text);
  let urls = {
    niutrans: "https://test.niutrans.com/NiuTransServer/testaligntrans?",
    niutranspro: `http://api.niutrans.com/NiuTransServer/translation?apikey=${args.secret}&`,
  };
  let param = `from=${args.sl.split("-")[0]}&to=${args.tl.split("-")[0]}`;
  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        `${urls[engine]}${param}&src_text=${encodeURIComponent(
          args.text
        )}&source=text&dictNo=&memoryNo=&isUseDict=0&isUseMemory=0&time=${new Date().valueOf()}`,
        {
          responseType: "json",
        }
      );
    },
    (xhr) => {
      if (xhr.response.error_code) {
        throw `${xhr.response.error_code}:${xhr.response.error_msg}`;
      }
      let tgt = xhr.response.tgt_text;
      Zotero.debug(tgt);
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}

export { niutrans, niutransapi, niutranspro };
