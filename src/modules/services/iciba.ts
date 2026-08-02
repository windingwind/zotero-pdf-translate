import { aesEcbDecrypt, aesEcbEncrypt, base64 } from "../../utils/crypto";
import { TranslateService } from "./base";

const LI = "6dVjYLFyzfkFkk";
const AUTH_USER = "key_web_new_fanyi";
const CLIENT = "6";
const CHUNK_SIZE = 3000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

type IcibaResponse = {
  status?: number;
  content?: string | { out?: string };
  message?: string;
  error?: string;
};

async function requestWithRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === retries) {
        throw e;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)),
      );
    }
  }
  throw lastError;
}

function decodeKey(value: string) {
  const decoded = decodeURIComponent(value);
  if (!decoded) {
    return "";
  }

  const result = [String.fromCharCode(decoded.charCodeAt(0) - decoded.length)];
  for (let i = 1; i < decoded.length; i++) {
    result.push(
      String.fromCharCode(decoded.charCodeAt(i) - result[i - 1].charCodeAt(0)),
    );
  }
  return result.join("");
}

async function encryptSign(value: string) {
  const key = decodeKey(
    "%5C%C2%80%C2%9A%C2%A8%C2%B6%C2%B8y%C2%9B%C2%B2%C2%8F%7C%7F%C2%97%C3%88%C2%A9d",
  );
  return base64((await aesEcbEncrypt(value, key)).buffer);
}

async function decryptContent(content: string) {
  return aesEcbDecrypt(content, "aahc3TfyfCEmER33");
}

function languageCode(lang: string) {
  if (!lang || lang === "auto") {
    return "auto";
  }
  return lang.toLowerCase().split("-")[0];
}

async function translateChunk(text: string, langFrom: string, langTo: string) {
  const signSeed = Zotero.Utilities.Internal.md5(
    `${CLIENT}${AUTH_USER}${LI}${text}`,
    false,
  ).slice(0, 16);
  const sign = await encryptSign(signSeed);
  const body = `from=${encodeURIComponent(langFrom)}&to=${encodeURIComponent(
    langTo,
  )}&q=${encodeURIComponent(text)}`;

  const xhr = await requestWithRetry(() =>
    Zotero.HTTP.request(
      "POST",
      `https://ifanyi.iciba.com/index.php?c=trans&m=fy&client=${CLIENT}&auth_user=${AUTH_USER}&sign=${encodeURIComponent(
        sign,
      )}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        responseType: "json",
      },
    ),
  );

  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  const response = xhr.response as IcibaResponse;
  if (response.status !== 1) {
    throw `Service error: ${response.message || response.error || JSON.stringify(response)}`;
  }
  if (typeof response.content !== "string") {
    throw `Unexpected response: ${JSON.stringify(response)}`;
  }

  const decrypted = JSON.parse(await decryptContent(response.content));
  if (!decrypted?.out) {
    throw `Unexpected response content: ${JSON.stringify(decrypted)}`;
  }
  return decrypted.out as string;
}

const translate: TranslateService["translate"] = async function (data) {
  const query = data.raw.trim();
  const from = languageCode(data.langfrom);
  const to = languageCode(data.langto);

  if (!query) {
    data.result = "";
    return;
  }

  if (query.length <= CHUNK_SIZE) {
    data.result = await translateChunk(query, from, to);
    return;
  }

  let translated = "";
  for (let i = 0; i < query.length; i += CHUNK_SIZE) {
    translated += await translateChunk(
      query.slice(i, i + CHUNK_SIZE),
      from,
      to,
    );
    data.result = translated;
    addon.api.getTemporaryRefreshHandler({ task: data })();
  }
};

export const Iciba: TranslateService = {
  id: "iciba",
  type: "sentence",

  translate,
};
