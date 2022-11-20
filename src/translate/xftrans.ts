import CryptoJS from 'crypto-js'

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
        from: "en",
        to: "cn"
    }
    let date = (new Date().toUTCString())
    let postBody = getPostBody(transVar.text, transVar.from, transVar.to)
    let digest = getDigest(postBody)
    Zotero.debug(digest)
    let options = {
      url: config.hostUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json,version=1.0',
        'Host': config.host,
        'Date': date,
        'Digest': digest,
        'Authorization': getAuthStr(date, digest)
      },
      json: true,
      body: postBody
    }
    Zotero.debug(options)
    function getPostBody(text, from, to) {
      let digestObj = {
        common: {
          app_id: config.appid
        },
        business:{
          from: from,
          to : to
        },
        data:{
          text: CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text))
        }
      }
      return digestObj
    }
    function getDigest(body) {
      return 'SHA-256=' + CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(JSON.stringify(body)))
    }
    function getAuthStr(date, digest) {
      let signatureOrigin = `host: ${config.host}\ndate: ${date}\nPOST ${config.uri} HTTP/1.1\ndigest: ${digest}`
      let signatureSha = CryptoJS.HmacSHA256(signatureOrigin, config.apiSecret)
      let signature = CryptoJS.enc.Base64.stringify(signatureSha)
      let authorizationOrigin = `api_key="${config.apiKey}", algorithm="hmac-sha256", headers="host date request-line digest", signature="${signature}"`
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
  