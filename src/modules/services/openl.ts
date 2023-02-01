import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  let [services, apikey] = data.secret.split("#");
  const serviceList = services.split(",");

  const xhr = await Zotero.HTTP.request(
    "POST",
    "https://api.openl.club/group/translate",
    {
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        apikey: apikey,
        services: serviceList,
        text: data.raw,
        source_lang: data.langfrom.split("-")[0],
        target_lang: data.langto.split("-")[0],
      }),
      responseType: "json",
    }
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  let res = xhr.response as {
    status: boolean | any;
    [key: string]: any;
  };
  if (!res.status) {
    throw `Service error: ${JSON.stringify(res)}`;
  }
  delete res.status;
  let tgt = "";
  const openLServices = Object.keys(res);
  if (openLServices.length === 1) {
    // Only one engine
    const resObj = res[openLServices[0]];
    if (resObj.status) {
      tgt = resObj.result;
    } else {
      throw "Service error: all OpenL services failed.";
    }
  } else {
    for (let openLService of openLServices) {
      if (res[openLService].status) {
        tgt += `[${openLService}] ${res[openLService].result}\n`;
      }
    }
  }
  data.result = tgt;
};
