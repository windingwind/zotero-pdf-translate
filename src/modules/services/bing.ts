import { TranslateService } from "./base";

const translate: TranslateService["translate"] = async (data) => {
  const xhr = await Zotero.HTTP.request(
    "POST",
    `https://edge.microsoft.com/translate/translatetext?from=${data.langfrom}&to=${data.langto}&isEnterpriseClient=false`,
    {
      headers: {
        "content-type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.42",
      },
      body: JSON.stringify([data.raw]),
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

export const Bing: TranslateService = {
  id: "bing",
  type: "sentence",

  translate,
};
