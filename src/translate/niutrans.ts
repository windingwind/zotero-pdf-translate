async function niutrans(text: string = undefined) {
  return await this.niutransapi("niutrans", text);
}
async function niutranspro(text: string = undefined) {
  return await this.niutransapi("niutranspro", text);
}
async function niutransLog(text: string = undefined) {
  return await this.niutransText("niutransLog", text);
}
async function niutransapi(engine: string, text: string) {
  let args = this.getArgs(engine, text);
  let apiParams = args.secret.split("#");
  let secret = apiParams[0];
  let dictNo = apiParams.length > 1 ? apiParams[1] : "";
  let memoryNo = apiParams.length > 2 ? apiParams[2] : "";
  let urls = {
    niutrans: "https://test.niutrans.com/NiuTransServer/testaligntrans?",
    niutranspro: `http://api.niutrans.com/NiuTransServer/translation?apikey=${secret}&dictNo=${dictNo}&memoryNo=${memoryNo}&`,
  };
  let param = `from=${args.sl.split("-")[0]}&to=${args.tl.split("-")[0]}`;
  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "GET",
        `${urls[engine]}${param}&src_text=${encodeURIComponent(
          args.text
        )}&source=text`,
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
async function niutransText(engine: string, text: string) {
  let args = this.getArgs(engine, text);
  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "POST",
        "https://api.niutrans.com/NiuTransServer/translation", {
          headers: {
            "content-type": "application/json",
            "accept": "application/json, text/plain, */*"
          },
          body: JSON.stringify({
            from: args.sl.split("-")[0],
            to: args.tl.split("-")[0],
            apikey: Zotero.Prefs.get("zoteroniutrans.apikey"),
            dictNo: Zotero.Prefs.get("zoteroniutrans.dictNo"),
            memoryNo: Zotero.Prefs.get("zoteroniutrans.memoryNo"),
            source: "zotero",
            src_text: args.text,
          }),
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
// 新增登录接口
async function userLogin(username:string, password:string) {
  return await Zotero.HTTP.request(
    "POST",
    "https://apis.niutrans.com/NiuTransAPIServer/checkInformation", 
    {
      body: `account=${username}&encryptionPassword=${password}`,
      responseType: "json",
    }
  );
}

async function getDictLibList(apikey:string) {
  return await Zotero.HTTP.request(
    "POST",
    "https://apis.niutrans.com/NiuTransAPIServer/getDictLibList", {
      body: `apikey=${apikey}`,
      responseType: "json",
    }
  )
}

async function getMemoryLibList(apikey:string) {
  return await Zotero.HTTP.request(
    "POST",
    "https://apis.niutrans.com/NiuTransAPIServer/getMemoryLibList", {
      body: `apikey=${apikey}`,
      responseType: "json",
    }
  )
}
async function getPublicKey() {
  return await Zotero.HTTP.request(
    "GET",
    "https://apis.niutrans.com/NiuTransAPIServer/getpublickey",
    {
      responseType: "json",
    }
  );
}
export { niutrans, niutransapi, niutranspro, userLogin, getDictLibList, getMemoryLibList, getPublicKey, niutransText, niutransLog };
