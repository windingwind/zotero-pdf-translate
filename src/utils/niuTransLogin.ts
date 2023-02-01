import { JSEncrypt } from "jsencrypt";
import { setPref } from "./prefs";
import { setServiceSecret } from "./translate";

export async function niutransLogin(username: string, password: string) {
  let loginFlag = false;
  let loginErrorMessage = "Not login";
  let keyxhr = await getPublicKey();
  if (keyxhr?.status === 200 && keyxhr.response.flag === 1) {
  } else {
    return { loginFlag, loginErrorMessage };
  }
  let encrypt = new JSEncrypt();
  encrypt.setPublicKey(keyxhr.response.key);
  let encryptionPassword = encrypt.encrypt(password);
  encryptionPassword = encodeURIComponent(encryptionPassword);
  const userLoginXhr = await loginApi(username, encryptionPassword);
  if (userLoginXhr && userLoginXhr.status && userLoginXhr.status === 200) {
    if (userLoginXhr.response.flag == 1) {
      let apikey = userLoginXhr.response.apikey;
      setPref("niutransUsername", username);
      setPref("niutransPassword", password);
      setServiceSecret("niutranspro", apikey);
      const dicLibXhr = await getDictLibList(apikey);
      const memoryLibXhr = await getMemoryLibList(apikey);
      if (dicLibXhr?.status === 200) {
        setPref("niutransDictLibList", JSON.stringify(dicLibXhr.response));
      }
      if (memoryLibXhr?.status === 200) {
        setPref("niutransMemoryLibList", JSON.stringify(memoryLibXhr.response));
      }
      loginFlag = true;
    } else {
      loginFlag = false;
      loginErrorMessage = userLoginXhr.response.msg;
    }
  }
  return { loginFlag, loginErrorMessage };
}

async function loginApi(username: string, password: string) {
  return await Zotero.HTTP.request(
    "POST",
    "https://apis.niutrans.com/NiuTransAPIServer/checkInformation",
    {
      body: `account=${username}&encryptionPassword=${password}`,
      responseType: "json",
    }
  );
}

async function getDictLibList(apikey: string) {
  return await Zotero.HTTP.request(
    "POST",
    "https://apis.niutrans.com/NiuTransAPIServer/getDictLibList",
    {
      body: `apikey=${apikey}`,
      responseType: "json",
    }
  );
}

async function getMemoryLibList(apikey: string) {
  return await Zotero.HTTP.request(
    "POST",
    "https://apis.niutrans.com/NiuTransAPIServer/getMemoryLibList",
    {
      body: `apikey=${apikey}`,
      responseType: "json",
    }
  );
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
