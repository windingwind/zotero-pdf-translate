import { getPref, getPrefJSON, setPref } from "../../utils/prefs";
import { TranslateTaskProcessor } from "../../utils/task";

export default <TranslateTaskProcessor>async function (data) {
  const xhr = await Zotero.HTTP.request(
    "POST",
    `https://api-edge.cognitive.microsofttranslator.com/translate?from=${data.langfrom}&to=${data.langto}&api-version=3.0&includeSentenceLength=true`,
    {
      headers: {
        accept: "*/*",
        "accept-language":
          "zh-TW,zh;q=0.9,ja;q=0.8,zh-CN;q=0.7,en-US;q=0.6,en;q=0.5",
        authorization: `Bearer ${await getToken()}`,
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        "sec-ch-ua":
          '"Microsoft Edge";v="113", "Chromium";v="113", "Not-A.Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        Referer: "https://appsumo.com/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.42",
      },
      body: JSON.stringify([{ text: data.raw }]),
      responseType: "json",
    },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  try {
    data.result = xhr.response[0].translations[0].text;
  } catch {
    throw `Service error: ${xhr.response}`;
  }
};

const bingTokenKey = "bingToken";
const tokenExpTime = 5 * 60 * 1000; // 5 minutes refresh token

async function getToken(forceRefresh: boolean = false) {
  let token = "";
  // Just in case the update fails
  let doRefresh = true;
  try {
    const tokenObj = getPrefJSON(bingTokenKey);
    if (
      !forceRefresh &&
      tokenObj &&
      tokenObj.token &&
      new Date().getTime() < tokenObj.exp
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
      "https://edge.microsoft.com/translate/auth",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.42",
        },
        responseType: "text",
      },
    );
    if (xhr && xhr.response) {
      token = xhr.response;
      setPref(
        bingTokenKey,
        JSON.stringify({
          exp: new Date().getTime() + tokenExpTime,
          token: token,
        }),
      );
    }
  }
  return token;
}
