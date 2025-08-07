import { aesEcbEncrypt, base64 } from "../../utils/crypto";
import { getPref, getPrefJSON, setPref } from "../../utils/prefs";
import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
  let progressWindow;
  const useSplit = getPref("cnkiUseSplit") as boolean;
  const splitSecond = getPref("cnkiSplitSecond") as number;
  if (!data.silent) {
    progressWindow = new ztoolkit.ProgressWindow("PDF Translate");
  }

  const processTranslation = async (text: string) => {
    const xhr = await Zotero.HTTP.request(
      "POST",
      "https://dict.cnki.net/fyzs-front-api/translate/literaltranslation",
      {
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          Token: await getToken(),
        },
        body: JSON.stringify({
          words: await getWord(text),
          translateType: null,
        }),
        responseType: "json",
      },
    );

    if (xhr.response.data?.isInputVerificationCode) {
      throw "Your access is temporarily banned by the CNKI service. Please goto https://dict.cnki.net/, translate manually and pass human verification.";
    }

    let tgt = xhr.response.data?.mResult;
    tgt = tgt.replace(new RegExp(getPref("cnkiRegex") as string, "g"), "");
    return tgt;
  };

  if (useSplit) {
    const sentences = data.raw
      .split(/[.?!]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const chunks = [];
    let currentChunk = "";
    sentences.forEach((sentence: string) => {
      const sentenceWithPeriod = sentence + ". ";
      if (currentChunk.length + sentenceWithPeriod.length > 800) {
        chunks.push(currentChunk);
        currentChunk = sentenceWithPeriod;
      } else {
        currentChunk += sentenceWithPeriod;
      }
    });
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    let translatedText = "";
    for (const chunk of chunks) {
      translatedText += (await processTranslation(chunk)) + " ";
      data.result = translatedText.trim();
      addon.api.getTemporaryRefreshHandler({ task: data })();
      await new Promise((resolve) => setTimeout(resolve, splitSecond * 1000));
    }
    // data.result = translatedText.trim();
  } else {
    if (data.raw.length > 800) {
      progressWindow
        ?.createLine({
          text: `Maximum text length is 800, ${data.raw.length} selected. Will only translate first 800 characters. If you want the plugin to automatically split the translation based on punctuation, you can enable the split switch in the preferences.`,
        })
        .show();
      data.raw = data.raw.slice(0, 800);
    }

    data.result = await processTranslation(data.raw);
  }
};

export async function getToken(forceRefresh: boolean = false) {
  let token = "";
  // Just in case the update fails
  let doRefresh = true;
  try {
    const tokenObj = getPrefJSON("cnkiToken");
    if (
      !forceRefresh &&
      tokenObj?.token &&
      new Date().getTime() - tokenObj.t < 300 * 1000
    ) {
      token = tokenObj.token;
      doRefresh = false;
    }
  } catch (e) {
    ztoolkit.log(e);
  }
  if (doRefresh) {
    const xhr = await Zotero.HTTP.request(
      "GET",
      "https://dict.cnki.net/fyzs-front-api/getToken",
      {
        responseType: "json",
      },
    );
    if (xhr && xhr.response && xhr.response.code === 200) {
      token = xhr.response.token;
      setPref(
        "cnkiToken",
        JSON.stringify({
          t: new Date().getTime(),
          token: xhr.response.data,
        }),
      );
    }
  }
  return token;
}

export async function getWord(text: string) {
  const encrypted = await aesEcbEncrypt(text, "4e87183cfd3a45fe");
  const base64str = base64(encrypted.buffer);
  return base64str.replace(/\//g, "_").replace(/\+/g, "-");
}
