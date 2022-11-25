import { JSEncrypt } from 'jsencrypt'
async function niutrans(text: string = undefined) {
  return await this.niutransapi("niutrans", text);
}
async function niutranspro(text: string = undefined) {
  return await this.niutransapi("niutranspro", text);
}
async function niutransapi(engine: string, text: string) {
  let args = this.getArgs(engine, text);
  let apiParams = args.secret.split("#");
  let secret = apiParams[0];
  let dictNo = apiParams.length > 1 ? apiParams[1] : "";
  let memoryNo = apiParams.length > 2 ? apiParams[2] : "";
  let urls = {
    niutrans: "https://test.niutrans.com/NiuTransServer/testaligntrans?",
    niutranspro: `https://api.niutrans.com/NiuTransServer/translation?apikey=${secret}&dictNo=${dictNo}&memoryNo=${memoryNo}&`,
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
async function niutransLog(text: string = undefined) {
  let args = this.getArgs("niutransLog", text);
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
            apikey: Zotero.Prefs.get("ZoteroPDFTranslate.niutransApikey"),
            dictNo: Zotero.Prefs.get("ZoteroPDFTranslate.niutransDictNo"),
            memoryNo: Zotero.Prefs.get("ZoteroPDFTranslate.niutransMemoryNo"),
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
async function niutransLogin(username:string, password:string) {
  let loginFlag:boolean
  let loginErrorMessage:string
  let keyxhr = await getPublicKey();
  if(keyxhr && keyxhr.status && keyxhr.status === 200 && keyxhr.response.flag && keyxhr.response.flag === 1){}else{return;}
  let encrypt = new JSEncrypt();
  encrypt.setPublicKey(keyxhr.response.key);
  let encryptionPassword = encrypt.encrypt(password);
  encryptionPassword = encodeURIComponent(encryptionPassword);
  let userLoginXhr = await loginApi(username,encryptionPassword)
  if(userLoginXhr && userLoginXhr.status && userLoginXhr.status === 200) {
    if(userLoginXhr.response.flag == 1) {
      let apikey = userLoginXhr.response.apikey;
      Zotero.Prefs.set("ZoteroPDFTranslate.niutransUsername", username);
      Zotero.Prefs.set("ZoteroPDFTranslate.niutransPassword", password);
      Zotero.Prefs.set("ZoteroPDFTranslate.niutransApikey", apikey);
      let dicLibXhr = await getDictLibList(apikey)
      let memoryLibXhr = await getMemoryLibList(apikey)
      if(dicLibXhr && dicLibXhr.status && dicLibXhr.status === 200){
        Zotero.Prefs.set("ZoteroPDFTranslate.niutransDictLibList", JSON.stringify(dicLibXhr.response));
      }
      if(memoryLibXhr && memoryLibXhr.status && memoryLibXhr.status === 200){
        Zotero.Prefs.set("ZoteroPDFTranslate.niutransMemoryLibList", JSON.stringify(memoryLibXhr.response));
      }
      loginFlag = true
    } else {
      loginFlag = false
      loginErrorMessage = userLoginXhr.response.msg
    }
  }
  return {loginFlag, loginErrorMessage}
}
async function loginApi(username:string, password:string) {
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
export { niutrans, niutransapi, niutranspro, niutransLogin, niutransLog};
