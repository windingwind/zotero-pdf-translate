import { JSEncrypt } from "jsencrypt";
import { getString } from "./locale";
import { getPref, setPref } from "./prefs";
import { setServiceSecret } from "./translate";

export async function niutransStatusCallback(status: boolean) {
  const dictLibList = getPref("niutransDictLibList") as string;
  const memoryLibList = getPref("niutransMemoryLibList") as string;
  const dictLibListObj = JSON.parse(dictLibList);
  const memoryLibListObj = JSON.parse(memoryLibList);
  const signInOrRefresh = status ? "refresh" : "signin";
  const dialogData: { [key: string | number]: any } = {
    username: getPref("niutransUsername"),
    password: getPref("niutransPassword"),
    dictLibList,
    memoryLibList,
    dictNo: getPref("niutransDictNo"),
    memoryNo: getPref("niutransMemoryNo"),
    beforeUnloadCallback: () => {
      setPref("niutransUsername", dialog.dialogData.username);
      setPref("niutransPassword", dialog.dialogData.password);
      setPref("niutransDictLibList", dialog.dialogData.dictLibList);
      setPref("niutransMemoryLibList", dialog.dialogData.memoryLibList);
      setPref("niutransDictNo", dialog.dialogData.dictNo);
      setPref("niutransMemoryNo", dialog.dialogData.memoryNo);
    },
  };
  const dialog = new ztoolkit.Dialog(5, 3)
    .setDialogData(dialogData)
    .addCell(
      0,
      0,
      {
        tag: "label",
        namespace: "html",
        attributes: {
          for: "username",
        },
        properties: {
          innerHTML: getString("service.niutranspro.dialog.username"),
        },
      },
      false
    )
    .addCell(0, 1, {
      tag: "input",
      id: "username",
      attributes: {
        "data-bind": "username",
        "data-prop": "value",
        type: "text",
      },
    })
    .addCell(
      0,
      2,
      {
        tag: "a",
        properties: {
          href: "https://niutrans.com/register",
          innerHTML: getString("service.niutranspro.dialog.signup"),
        },
      },
      false
    )
    .addCell(
      1,
      0,
      {
        tag: "label",
        namespace: "html",
        attributes: {
          for: "password",
        },
        properties: {
          innerHTML: getString("service.niutranspro.dialog.password"),
        },
      },
      false
    )
    .addCell(1, 1, {
      tag: "input",
      id: "password",
      attributes: {
        "data-bind": "password",
        "data-prop": "value",
        type: "password",
      },
    })
    .addCell(
      1,
      2,
      {
        tag: "a",
        properties: {
          href: "https://niutrans.com/password_find",
          innerHTML: getString("service.niutranspro.dialog.forget"),
        },
      },
      false
    )
    .addCell(
      2,
      0,
      {
        tag: "label",
        namespace: "html",
        properties: {
          innerHTML: getString("service.niutranspro.dialog.dictLib"),
        },
      },
      false
    )
    .addCell(
      2,
      1,
      {
        tag: "select",
        id: "dictLib",
        attributes: {
          "data-bind": "dictNo",
          "data-prop": "value",
        },
        children: dictLibListObj.map(
          (dict: { dictName: string; dictNo: string }) => ({
            tag: "option",
            properties: {
              value: dict.dictNo,
              innerHTML: dict.dictName,
            },
          })
        ),
      },
      false
    )
    .addCell(
      3,
      0,
      {
        tag: "label",
        namespace: "html",
        properties: {
          innerHTML: getString("service.niutranspro.dialog.memoryLib"),
        },
      },
      false
    )
    .addCell(
      3,
      1,
      {
        tag: "select",
        id: "memoryLib",
        attributes: {
          "data-bind": "memoryNo",
          "data-prop": "value",
        },
        children: memoryLibListObj.map(
          (memory: { memoryName: string; memoryNo: string }) => ({
            tag: "option",
            properties: {
              value: memory.memoryNo,
              innerHTML: memory.memoryName,
            },
          })
        ),
      },
      false
    )
    .addCell(4, 0, {
      tag: "div",
      styles: {
        width: "200px",
      },
      children: [
        {
          tag: "span",
          properties: {
            innerHTML: getString("service.niutranspro.dialog.tip0"),
          },
        },
        {
          tag: "a",
          properties: {
            href: "https://niutrans.com/cloud/resource/index",
            innerHTML: getString("service.niutranspro.dialog.tip1"),
          },
        },
        {
          tag: "span",
          properties: {
            innerHTML: getString("service.niutranspro.dialog.tip2"),
          },
        },
      ],
    })
    .addButton(
      getString(`service.niutranspro.dialog.${signInOrRefresh}`),
      "signin"
    )
    .addCell(4, 1, { tag: "fragment" }, false)
    .addCell(4, 2, { tag: "fragment" }, false);

  if (status) {
    dialog.addButton(
      getString("service.niutranspro.dialog.signout"),
      "signout"
    );
  }

  dialog
    .addButton(getString("service.niutranspro.dialog.close"), "close")
    .open(getString("service.niutranspro.dialog.title"));

  await dialogData.unloadLock?.promise;
  switch (dialogData._lastButtonId) {
    case "signin":
      {
        const { loginFlag, loginErrorMessage } = await niutransLogin(
          dialogData.username,
          dialogData.password
        );
        if (!loginFlag) {
          window.alert(loginErrorMessage);
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
      }
    }
    default:
      break;
  }
}

async function niutransLogin(username: string, password: string) {
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
  if (userLoginXhr?.status === 200) {
    if (userLoginXhr.response.flag === 1) {
      let apikey = userLoginXhr.response.apikey;
      setPref("niutransUsername", username);
      setPref("niutransPassword", password);
      setServiceSecret("niutranspro", apikey);
      await setDictLibList(apikey);
      await setMemoryLibList(apikey);
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

async function setDictLibList(apikey: string) {
  const xhr = await Zotero.HTTP.request(
    "POST",
    "https://apis.niutrans.com/NiuTransAPIServer/getDictLibList",
    {
      body: `apikey=${apikey}`,
      responseType: "json",
    }
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
        }))
      )
    );
  }
}

async function setMemoryLibList(apikey: string) {
  const xhr = await Zotero.HTTP.request(
    "POST",
    "https://apis.niutrans.com/NiuTransAPIServer/getMemoryLibList",
    {
      body: `apikey=${apikey}`,
      responseType: "json",
    }
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
        }))
      )
    );
  }
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
