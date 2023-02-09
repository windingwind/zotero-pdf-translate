import { TranslateTaskProcessor } from "../../utils/translate";

export default <TranslateTaskProcessor>async function (data) {
  const xhr = await Zotero.HTTP.request(
    "GET",
    `https://api.dictionaryapi.dev/api/v2/entries/en/${data.raw}`,
    {
      headers: {
        Accept: "application/json",
      },
      responseType: "json",
    }
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  const res = xhr.response[0];
  let tgt = "";
  if (res.phonetics) {
    tgt += res.phonetics.map((p: any) => p.text).join(",");
    tgt += "\n";
  }
  if (res.meanings) {
    tgt += res.meanings
      .map(
        (m: any) =>
          `[${m.partOfSpeech}] ${m.definitions
            .map(
              (d: any) =>
                `${d.definition}\n${
                  d.example ? `\t[example] ${d.example}` : ""
                }`
            )
            .join("")}`
      )
      .join("----\n");
  }
  data.result = tgt;
};
