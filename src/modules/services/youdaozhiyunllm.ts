import { hex, sha256Digest } from "../../utils/crypto";
import { TranslateTaskProcessor } from "../../utils/task";
import { getPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

export default <TranslateTaskProcessor>async function (data) {
  function truncate(q: string) {
    const len = q.length;
    if (len <= 20) return q;
    return q.substring(0, 10) + len + q.substring(len - 10, len);
  }

  function transLang(inlang: string = "") {
    const langs = [{ regex: /zh-\w+/, lang: "zh-CHS" }];
    // default
    let outlang = inlang.split("-")[0];
    langs.forEach((obj) => {
      if (obj.regex.test(inlang)) {
        outlang = obj.lang;
      }
    });
    return outlang;
  }

  const [appid, key] = data.secret.split("#");
  const salt = new Date().getTime();
  const curtime = Math.round(new Date().getTime() / 1000);
  const query = data.raw;
  const from = transLang(data.langfrom);
  const to = transLang(data.langto);
  const str1 = appid + truncate(query) + salt + curtime + key;
  const sign = hex(await sha256Digest(str1));

  const model = getPref("youdaozhiyunllm.model");
  const prompt = getPref("youdaozhiyunllm.prompt");
  const stream = getPref("youdaozhiyunllm.stream") as boolean;
  const streamType = stream ? "increment" : "full";

  const refreshHandler = addon.api.getTemporaryRefreshHandler();

  if (!stream) {
    data.result = getString("status-translating");
    refreshHandler();
  }

  const streamCallback = (xmlhttp: XMLHttpRequest) => {
    let preLength = 0;
    let result = "";
    let buffer = "";
    let currentEventType = "";
    xmlhttp.onprogress = (e: any) => {
      // Only concatenate the new strings
      const newResponse = e.target.response.slice(preLength);
      preLength = e.target.response.length;
      buffer += newResponse;
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const event of events) {
        if (!event) continue;
        let eventData = "";
        let isMessageEvent = false;
        
        const lines = event.split("\n");
        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEventType = line.replace("event:", "").trim();
            isMessageEvent = (currentEventType === "message");
          } else if (line.startsWith("data:")) {
            eventData = line.replace("data:", "").trim();
          }
        }

        if (isMessageEvent && eventData) {
          try {
            const dataObj = JSON.parse(eventData);
            if (dataObj.transIncre) {
              result += dataObj.transIncre;
            }
          } catch (error) {
            return;
          }
        }
      }
          
      if (e.target.timeout) {
        e.target.timeout = 0;
      }  

      data.result = result;

      if (data.type === "text") {
        refreshHandler();
      }
    };
  };

  const nonStreamCallback = (xmlhttp: XMLHttpRequest) => {
    let result = "";
    let currentEventType = '';
    xmlhttp.onload = () => {
      try {
        const responseObj = xmlhttp.responseText;
        const lines = responseObj.split('\n');
        let eventData = "";
        let isMessageEvent = false;
        
        for (const line of lines) { 
          if (line.startsWith("event:")) {
            currentEventType = line.replace("event:", "").trim();
            isMessageEvent = (currentEventType === "message");
          } else if (line.startsWith("data:")) {
            eventData = line.replace("data:", "").trim();
          }

          if (isMessageEvent && eventData) {
            try {
              const dataObj = JSON.parse(eventData);
              if (dataObj.transFull) {
                result = dataObj.transFull;
              }
            } catch (error) {
              return;
            }
          }
        }
      } catch (error) {
        return;
      }
      data.result = result;
      refreshHandler();
    };
  };

  const xhr = await Zotero.HTTP.request(
    "POST",
    `https://openapi.youdao.com/llm_trans?i=${encodeURIComponent(query)}&q=${encodeURIComponent(query)}&appKey=${appid}&salt=${salt}&from=${from}&to=${to}&sign=${sign}&signType=v3&curtime=${curtime}&handleOption=${model}&prompt=${encodeURIComponent(prompt)}&streamType=${streamType}`,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      responseType: "text",
      requestObserver: (xmlhttp: XMLHttpRequest) => {
        if (stream) {
          streamCallback(xmlhttp);
        } else {
          nonStreamCallback(xmlhttp);
        }
      },
    },
  );

  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }
};