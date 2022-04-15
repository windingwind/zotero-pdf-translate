async function niutrans() {
  return await this.niutransapi(
    "https://test.niutrans.com/NiuTransServer/testaligntrans?"
  );
}
async function niutranspro() {
  let args = this.getArgs();
  return await this.niutransapi(
    `http://api.niutrans.com/NiuTransServer/translation?apikey=${args.secret}&`
  );
}
async function niutransapi(api_url) {
  let args = this.getArgs();
  let param = `from=${args.sl.split("-")[0]}&to=${args.tl.split("-")[0]}`;
  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        `${api_url}${param}&src_text=${encodeURIComponent(
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
      Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return true;
    }
  );
}

export { niutrans, niutransapi, niutranspro };
