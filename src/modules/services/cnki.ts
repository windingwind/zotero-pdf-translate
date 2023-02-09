import { aesEcbEncrypt, base64 } from "../../utils/crypto";
import { getPref, setPref } from "../../utils/prefs";
import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  if (data.raw.length > 1000) {
    new ztoolkit.ProgressWindow("PDF Translate")
      .createLine({
        text: `Maximam text length is 1000, ${data.raw.length} selected. Will only translate first 1000 characters.`,
      })
      .show();
    data.raw = data.raw.slice(0, 1000);
  }

  const xhr = await Zotero.HTTP.request(
    "POST",
    "https://dict.cnki.net/fyzs-front-api/translate/literaltranslation",
    {
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Token: await getToken(),
      },
      body: JSON.stringify({
        words: await getWord(data.raw),
        translateType: null,
      }),
      responseType: "json",
    }
  );

  if (xhr.response.data?.isInputVerificationCode) {
    throw "Your access is temporarily banned by the CNKI service. Please goto https://dict.cnki.net/, translate manually and pass human verification.";
  }

  // if (retry && xhr.response.data?.isInputVerificationCode) {
  //   // Monitor verification
  //   await Zotero.HTTP.request(
  //     "GET",
  //     "https://dict.cnki.net/fyzs-front-api/captchaImage",
  //     {
  //       headers: {
  //         "Content-Type": "application/json;charset=UTF-8",
  //         Token: await getToken(),
  //       },
  //     }
  //   );
  //   await Zotero.HTTP.request(
  //     "POST",
  //     "https://dict.cnki.net/fyzs-front-api/translate/addVerificationCodeTimes",
  //     {
  //       headers: {
  //         "Content-Type": "application/json;charset=UTF-8",
  //         Token: await getToken(),
  //       },
  //     }
  //   );
  //   await getToken(true);
  //   // Call translation again
  //   return await cnki.call(this, text, false);
  //   // throw "CNKI requires verification. Please verify manually in popup or open dict.cnki.net in browser.";
  // }
  let tgt = xhr.response.data?.mResult;
  data.result = tgt;
};

async function getToken(forceRefresh: boolean = false) {
  let token = "";
  // Just in case the update fails
  let doRefresh = true;
  try {
    const tokenObj = JSON.parse(getPref("cnkiToken") as string);
    if (
      !forceRefresh &&
      tokenObj?.token &&
      new Date().getTime() - tokenObj.t < 300 * 1000
    ) {
      token = tokenObj.token;
      doRefresh = false;
    }
  } catch (e) {}
  if (doRefresh) {
    const xhr = await Zotero.HTTP.request(
      "GET",
      "https://dict.cnki.net/fyzs-front-api/getToken",
      {
        responseType: "json",
      }
    );
    if (xhr && xhr.response && xhr.response.code === 200) {
      token = xhr.response.token;
      setPref(
        "cnkiToken",
        JSON.stringify({
          t: new Date().getTime(),
          token: xhr.response.data,
        })
      );
    }
  }
  return token;
}

async function getWord(text: string) {
  const encrtypted = await aesEcbEncrypt(text, "4e87183cfd3a45fe");
  const base64str = base64(encrtypted);
  return base64str.replace(/\//g, "_").replace(/\+/g, "-");
}
