import JSEncrypt from "jsencrypt";
import { getString, setServiceSecret } from "../../utils";
import { getPref, setPref } from "../../utils/prefs";
import { TranslateService } from "./base";

const translate = <TranslateService["translate"]>async function (data) {
  const apikey = data.secret;
  const dictNo = getPref("niutransDictNo");
  const memoryNo = getPref("niutransMemoryNo");
  const endpoint =
    getPref("niutransEndpoint") || "https://niutrans.com/niuInterface";
  let requestUrl: string;
  let requestBody: any;
  if (endpoint.includes("trans.neu.edu.cn")) {
    //Neu Niutrans
    requestUrl = `https://trans.neu.edu.cn/niutrans/textTranslation?apikey=${data.secret}`;
    requestBody = {
      from: data.langfrom.split("-")[0],
      to: data.langto.split("-")[0],
      src_text: data.raw,
    };
  } else {
    //Normal Niutrans
    requestUrl = `${endpoint}/textTranslation?pluginType=zotero&apikey=${apikey}`;
    requestBody = {
      from: data.langfrom.split("-")[0],
      to: data.langto.split("-")[0],
      termDictionaryLibraryId: dictNo,
      translationMemoryLibraryId: memoryNo,
      // TEMP: implement realmCode in settings
      realmCode: 99,
      source: "zotero",
      src_text: data.raw,
      caller_id: data.callerID,
    };
  }
  const xhr = await Zotero.HTTP.request("POST", requestUrl, {
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify(requestBody),
    responseType: "json",
  });

  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  if (xhr.response.code !== 200) {
    throw `Service error: ${xhr.response.code}:${xhr.response.msg}`;
  }
  if (endpoint.includes("neu.edu.cn")) {
    for (let i = 0; i < xhr.response.data[0].sentences.length; i++) {
      data.result += xhr.response.data[0].sentences[i].data;
    }
  } else {
    data.result = xhr.response.data.tgt_text;
  }
};

export const Niutrans: TranslateService = {
  id: "niutranspro",
  type: "sentence",
  helpUrl:
    "https://github.com/ramonmi/DeepLX-for-Zotero/blob/main/README_zh.md",

  defaultSecret: "",
  secretValidator(secret: string) {
    const flag = secret?.length === 32;
    return {
      secret,
      status: flag,
      info: flag
        ? ""
        : `The secret is your NiuTrans API-KEY. The secret length must be 32, but got ${secret?.length}.`,
    };
  },

  translate,

  getConfig() {
    async function niutransLogin(username: string, password: string) {
      let loginFlag = false;
      let loginErrorMessage = "Not login";

      // Get the public key with a proper HTTPS request
      const keyResponse = await getPublicKey();

      // Verify the response was successful and has the expected flag
      if (keyResponse?.status !== 200 || keyResponse.response.flag !== 1) {
        return { loginFlag, loginErrorMessage };
      }

      // Get the JSESSIONID from the response headers
      let jsessionid = "";

      // Extract JSESSIONID from the response header
      const setCookie = keyResponse.getResponseHeader?.("Set-Cookie") || "";
      if (setCookie && setCookie.includes("JSESSIONID=")) {
        const match = setCookie.match(/JSESSIONID=([^;]+)/);
        if (match && match[1]) {
          jsessionid = match[1];
        }
      }

      // Encrypt the password using the public key
      const encrypt = new JSEncrypt();
      encrypt.setPublicKey(keyResponse.response.key);
      let encryptionPassword = encrypt.encrypt(password);
      encryptionPassword = encodeURIComponent(encryptionPassword);

      // Login with the encrypted password and session ID
      const userLoginResponse = await loginApi(
        username,
        encryptionPassword,
        jsessionid,
      );

      if (userLoginResponse?.status === 200) {
        if (userLoginResponse.response.flag === 1) {
          const apikey = userLoginResponse.response.apikey;
          setPref("niutransUsername", username);
          setPref("niutransPassword", password);
          setServiceSecret("niutranspro", apikey);

          // Use the same JSESSIONID for subsequent requests
          await setDictLibList(apikey, jsessionid);
          await setMemoryLibList(apikey, jsessionid);
          loginFlag = true;
        } else {
          loginFlag = false;
          loginErrorMessage = userLoginResponse.response.msg;
        }
      }
      return { loginFlag, loginErrorMessage };
    }

    async function loginApi(
      username: string,
      password: string,
      jsessionid: string,
    ) {
      return await Zotero.HTTP.request(
        "POST",
        "https://apis.niutrans.com/NiuTransAPIServer/checkInformation",
        {
          body: `account=${username}&encryptionPassword=${password}`,
          responseType: "json",
          headers: {
            Cookie: `JSESSIONID=${jsessionid}`,
          },
        },
      );
    }

    async function setDictLibList(apikey: string, jsessionid: string) {
      const xhr = await Zotero.HTTP.request(
        "POST",
        "https://apis.niutrans.com/NiuTransAPIServer/getDictLibList",
        {
          body: `apikey=${apikey}`,
          responseType: "json",
          headers: {
            Cookie: `JSESSIONID=${jsessionid}`,
          },
        },
      );
      if (xhr?.status === 200 && xhr.response.flag !== 0) {
        const dictList = xhr.response.dlist as {
          dictName: string;
          dictNo: string;
          isUse: number;
        }[];
        const dictNo = dictList.find((dict) => dict.isUse === 1)?.dictNo || "";
        if (dictNo && !getPref("niutransDictNo")) {
          setPref("niutransDictNo", dictNo);
        }
        setPref(
          "niutransDictLibList",
          JSON.stringify(
            dictList.map((dict) => ({
              dictName: dict.dictName,
              dictNo: dict.dictNo,
            })),
          ),
        );
      }
    }

    async function setMemoryLibList(apikey: string, jsessionid: string) {
      const xhr = await Zotero.HTTP.request(
        "POST",
        "https://apis.niutrans.com/NiuTransAPIServer/getMemoryLibList",
        {
          body: `apikey=${apikey}`,
          responseType: "json",
          headers: {
            Cookie: `JSESSIONID=${jsessionid}`,
          },
        },
      );

      if (xhr?.status === 200 && xhr.response.flag !== 0) {
        const memoryList = xhr.response.mlist as {
          memoryName: string;
          memoryNo: string;
          isUse: number;
        }[];
        const memoryNo =
          memoryList.find((memory) => memory.isUse === 1)?.memoryNo || "";
        if (memoryNo && !getPref("niutransMemoryNo")) {
          setPref("niutransMemoryNo", memoryNo);
        }
        setPref(
          "niutransMemoryLibList",
          JSON.stringify(
            memoryList.map((memory) => ({
              memoryName: memory.memoryName,
              memoryNo: memory.memoryNo,
            })),
          ),
        );
      }
    }

    async function getPublicKey() {
      return await Zotero.HTTP.request(
        "GET",
        "https://apis.niutrans.com/NiuTransAPIServer/getpublickey",
        {
          responseType: "json",
        },
      );
    }

    const dictLibList = getPref("niutransDictLibList") as string;
    const memoryLibList = getPref("niutransMemoryLibList") as string;
    const dictLibListObj = JSON.parse(dictLibList);
    const memoryLibListObj = JSON.parse(memoryLibList);
    return [
      {
        type: "input",
        prefKey: "niutransUsername",
        nameKey: "service-niutranspro-dialog-username",
        // register link
        // desc: `<a is="link" href="https://niutrans.com/register">${getString("service-niutranspro-dialog-signup")}</a>`,
      },

      {
        type: "input",
        prefKey: "niutransPassword",
        nameKey: "service-niutranspro-dialog-password",
        inputType: "password",
        // desc: `<a is="link" href="https://niutrans.com/password_find">${getString("service-niutranspro-dialog-forget")}</a>`,
      },

      {
        type: "select",
        prefKey: "niutransMemoryNo",
        nameKey: "service-niutranspro-dialog-memoryLib",
        options: memoryLibListObj.map(
          (memory: { memoryName: string; memoryNo: string }) => ({
            value: memory.memoryNo,
            label: memory.memoryName,
          }),
        ),
      },

      {
        type: "select",
        prefKey: "niutransDictNo",
        nameKey: "service-niutranspro-dialog-dictLib",
        options: dictLibListObj.map(
          (dict: { dictName: string; dictNo: string }) => ({
            value: dict.dictNo,
            label: dict.dictName,
          }),
        ),
        desc: `${getString("service-niutranspro-dialog-tip0")} <a href="https://niutrans.com/cloud/resource/index"> ${getString("service-niutranspro-dialog-tip1")}</a> ${getString("service-niutranspro-dialog-tip2")}`,
      },

      {
        type: "input",
        prefKey: "niutransEndpoint",
        nameKey: "service-niutranspro-dialog-endpoint",
      },

      {
        type: "button",
        nameKey: "service-niutranspro-dialog-signin",
        callback() {
          // TODO
        },
      },

      {
        type: "button",
        nameKey: "service-niutranspro-dialog-signout",
        callback() {
          // TODO
        },
      },
    ];
  },
};
