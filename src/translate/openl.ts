async function openl(text: string = undefined) {
  let args = this.getArgs("openl", text);
  let [services, apikey] = args.secret.split("#");
  const serviceList = services.split(",");

  return await this.requestTranslate(
    async () => {
      return await Zotero.HTTP.request(
        "POST",
        "https://api.openl.club/group/translate",
        {
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            apikey: apikey,
            services: serviceList,
            text: args.text,
            source_lang: args.sl.split("-")[0],
            target_lang: args.tl.split("-")[0],
          }),
          responseType: "json",
        }
      );
    },
    (xhr) => {
      let res = xhr.response as {
        status: boolean | any;
        resObj: Object;
      };
      if (!res.status) {
        throw new Error(`OpenL Error`);
      }
      delete res.status;
      let tgt = "";
      if (Object.keys(res).length === 1) {
        // Only one engine
        const resObj = Object.values(res)[0];
        if (resObj.status) {
          tgt = resObj.result;
        } else {
          throw new Error(`OpenL return is empty.`);
        }
      } else {
        for (let engine of Object.keys(res)) {
          if (res[engine].status) {
            tgt += `[${engine}] ${res[engine].result}\n`;
          }
        }
      }

      Zotero.debug(tgt);
      if (!text) Zotero.ZoteroPDFTranslate._translatedText = tgt;
      return tgt;
    }
  );
}

export { openl };
