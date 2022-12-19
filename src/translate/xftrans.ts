import { base64, hmacSha256Digest, sha256Digest } from "./crypto";

function transLang(inlang: string = undefined) {
  const langs = [
    {"regex": /zh-\w+/, "lang": "cn"}
  ]
  // default
  let outlang = inlang.split("-")[0]
  langs.forEach(obj => {
      if (obj.regex.test(inlang)) {
        outlang = obj.lang
      }
    }
  )
  return outlang
}

async function xftrans(text: string = undefined) {
  let args = this.getArgs("xftrans", text);
  Zotero.debug(args.secret)
  let [appid, apiSecret, apiKey] = args.secret.split("#");
  Zotero.debug(appid, apiSecret, apiKey)
  const config = {
      appid,
      apiSecret,
      apiKey,
      host: "itrans.xfyun.cn",
      hostUrl: "https://itrans.xfyun.cn/v2/its",
      uri: "/v2/its"
  }
  Zotero.debug(config)
  let transVar = {
      text: args.text,
      from: transLang(args.sl),
      to: transLang(args.tl)
  }
  const date = new Date().toUTCString()
  const postBody = getPostBody(transVar.text, transVar.from, transVar.to)
  const digest = await getDigest(postBody)
  Zotero.debug(digest)
  const options = {
    url: config.hostUrl,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json,version=1.0',
      'Host': config.host,
      'Date': date,
      'Digest': digest,
      'Authorization': await getAuthStr(date, digest)
    },
    json: true,
    body: postBody
  }
  Zotero.debug(options)
  function getPostBody(text, from, to) {
    const digestObj = {
      common: {
        app_id: config.appid
      },
      business:{
        from: from,
        to : to
      },
      data:{
        text: base64(new TextEncoder().encode(text))
      }
    }
    return digestObj
  }
  async function getDigest(body: any) {
    return `SHA-256=${base64(await sha256Digest(JSON.stringify(body)))}`;
  }
  async function getAuthStr(date: string, digest: string) {
    const signatureOrigin = `host: ${config.host}\ndate: ${date}\nPOST ${config.uri} HTTP/1.1\ndigest: ${digest}`
    const signatureSha = await hmacSha256Digest(signatureOrigin, config.apiSecret)
    const signature = base64(signatureSha)
    const authorizationOrigin = `api_key="${config.apiKey}", algorithm="hmac-sha256", headers="host date request-line digest", signature="${signature}"`
    return authorizationOrigin
  }
  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "POST",
        options.url,
        {
          headers: options.headers,
          responseType: "json",
          body: JSON.stringify(options.body),
        }
      );
    },
    (xhr) => {
      let tgt = xhr.response.data.result.trans_result.dst
      Zotero.debug(tgt);
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}

export { xftrans };
  