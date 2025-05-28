import { getPref } from "../../utils/prefs";
import { TranslateTaskProcessor } from "../../utils/task";
export default <TranslateTaskProcessor>async function (data) {
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
