import { JSEncrypt } from "jsencrypt";
import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";
import { setServiceSecret } from "../../utils/secret";

export async function niutransStatusCallback(status: boolean) {
  const dictLibList = getPref("niutransDictLibList") as string;
  const memoryLibList = getPref("niutransMemoryLibList") as string;
  const dictLibListObj = JSON.parse(dictLibList);
  const memoryLibListObj = JSON.parse(memoryLibList);
  const dialogData: { [key: string | number]: any } = {
    endpoint: getPref("niutransEndpoint"),
    username: getPref("niutransUsername"),
    password: getPref("niutransPassword"),
    dictLibList,
    memoryLibList,
    dictNo: getPref("niutransDictNo"),
    memoryNo: getPref("niutransMemoryNo"),
    beforeUnloadCallback: () => {
      setPref("niutransEndpoint", dialog.dialogData.endpoint);
      setPref("niutransUsername", dialog.dialogData.username);
      setPref("niutransPassword", dialog.dialogData.password);
      setPref("niutransDictLibList", dialog.dialogData.dictLibList);
      setPref("niutransMemoryLibList", dialog.dialogData.memoryLibList);
      setPref("niutransDictNo", dialog.dialogData.dictNo);
      setPref("niutransMemoryNo", dialog.dialogData.memoryNo);
    },
  };
  const { loginFlag } = await niutransLogin(
    dialogData.username,
    dialogData.password,
  );
  const signInOrRefresh = status && loginFlag ? "refresh" : "signin";
  const dialog = new ztoolkit.Dialog(6, 3)
    .setDialogData(dialogData)
    .addCell(
      0,
      2,
      {
        tag: "a",
        properties: {
          href: "https://niutrans.com/register",
          innerHTML: getString("service-niutranspro-dialog-signup"),
        },
        styles: {
          width: "auto",
          margin: "3px 0",
        },
      },
      false,
    )

    .addCell(
      1,
      2,
      {
        tag: "a",
        properties: {
          href: "https://niutrans.com/password_find",
          innerHTML: getString("service-niutranspro-dialog-forget"),
        },
        styles: {
          width: "auto",
          margin: "3px 0",
        },
      },
      false,
    )
    .addButton(
      getString(`service-niutranspro-dialog-${signInOrRefresh}`),
      "signin",
    );
  // .addCell(5, 1, { tag: "fragment" }, false)
  // .addCell(5, 2, { tag: "fragment" }, false);

  if (status && loginFlag) {
    dialog.addButton(
      getString("service-niutranspro-dialog-signout"),
      "signout",
    );
  }

  // dialog
  //   .addButton(getString("service-niutranspro-dialog-close"), "close")
  //   .open(getString("service-niutranspro-dialog-title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "signin":
      {
        const { loginFlag, loginErrorMessage } = await niutransLogin(
          dialogData.username,
          dialogData.password,
        );
        if (!loginFlag) {
          Zotero.getMainWindow().alert(loginErrorMessage);
        }
        await niutransStatusCallback(loginFlag);
      }
      break;
    case "signout": {
      {
        setPref("niutransUsername", "");
        setPref("niutransPassword", "");
        setPref("niutransDictLibList", "[]");
        setPref("niutransMemoryLibList", "[]");
        setPref("niutransDictNo", "");
        setPref("niutransMemoryNo", "");
        setServiceSecret("niutranspro", "");
        await niutransStatusCallback(false);
        break;
      }
    }
    default:
      break;
  }
}

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
