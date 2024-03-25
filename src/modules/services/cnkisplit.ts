import { aesEcbEncrypt, base64 } from "../../utils/crypto";
import { getPref, setPref } from "../../utils/prefs";
import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
  const progressWindow = new ztoolkit.ProgressWindow("PDF Translate");

  // 仅使用句号来断句
  const sentences = data.raw.split(/[.?!]/).map(s => s.trim()).filter(s => s.length > 0);

  const chunks = [];
  let currentChunk = '';
  sentences.forEach((sentence: string) => {
    // 添加句号和空格来重建句子
    const sentenceWithPeriod = sentence + '. ';
    if ((currentChunk.length + sentenceWithPeriod.length) > 800) {
      chunks.push(currentChunk);
      currentChunk = sentenceWithPeriod;
    } else {
      currentChunk += sentenceWithPeriod;
    }
  });
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  if (data.raw.length > 1000 && !data.silent) {
    progressWindow.createLine({
      text: `Maximum text length is 800, ${data.raw.length} selected. Will split ${chunks.length} sections to translate.`,
    }).show();
  }
  let translatedText = '';
  let count = 0;
  for (const chunk of chunks) {
    const xhr = await Zotero.HTTP.request(
      "POST",
      "https://dict.cnki.net/fyzs-front-api/translate/literaltranslation",
      {
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          Token: await getToken(),
        },
        body: JSON.stringify({
          words: await getWord(chunk),
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
    translatedText += tgt + ' ';
    count += 1
    if (chunks.length!=1){
      progressWindow.createLine({ text: `Translate: ${count}/${chunks.length}` }).show();
    } else {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  data.result = translatedText.trim();
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

async function getWord(text: string) {
  const encrtypted = await aesEcbEncrypt(text, "4e87183cfd3a45fe");
  const base64str = base64(encrtypted);
  return base64str.replace(/\//g, "_").replace(/\+/g, "-");
}
