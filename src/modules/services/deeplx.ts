import { TranslateTaskProcessor } from "../../utils/translate";
export default <TranslateTaskProcessor>async function (data) {
    const id = 1000*(Math.floor(Math.random() * 99999) + 8300000)+1;
    const url = "https://www2.deepl.com/jsonrpc";
    const t = data.raw;
    var ICounts = 0;
    var ts = Date.now();
    for (var i = 0; i < t.length; i++) { 
        if (t[i] == "i") {
            ICounts++;
        }
    }
	if (ICounts != 0) {
        ICounts++;
		ts =  ts - ts%ICounts + ICounts
	} else {
		return
	}
    var reqBody = JSON.stringify({
        jsonrpc: "2.0",
        method: "LMT_handle_texts",
        id: id,
        params: {
            texts: [
                {
                    text: t,
                    requestAlternatives: 3,
                },
            ],
            splitting: "newlines",
            lang: {
                source_lang_user_selected: data.langfrom
                    .split("-")[0]
                    .toUpperCase(),
                target_lang: data.langto.split("-")[0].toUpperCase(),
            },
            timestamp: ts,
            commonJobParams: {
                wasSpoken: false,
                transcribe_as: "",
            },
        },
    });
    if ((id+5)%29 == 0 || (id+3)%13 == 0) {
			reqBody = reqBody.replace('"method":"', '"method" : "');
		} else {
			reqBody = reqBody.replace('"method":"', '"method": "');
		}
    const xhr = await Zotero.HTTP.request("POST", url, {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Accept": "*/*",
            "x-app-os-name": "iOS",
            "x-app-os-version": "16.3.0",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "x-app-device": "iPhone13,2",
            "User-Agent": "DeepL-iOS/2.6.0 iOS 16.3.0 (iPhone13,2)",
            "x-app-build": "353933",
            "x-app-version": "2.6",
            "Connection": "keep-alive",
        },
        responseType: "json",
        body: reqBody,
    });
    if (xhr?.status !== 200) {
        throw `Request error: ${xhr?.status}`;
    }
    data.result = xhr.response.result.texts[0].text;
};