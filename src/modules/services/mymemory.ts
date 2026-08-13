import { getPref } from "../../utils/prefs";
import { TranslateService } from "./base";

/** Validates an email address for MyMemory's `de` (domain email) parameter. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (value: unknown): value is string =>
  typeof value === "string" && EMAIL_REGEX.test(value);

const translate: TranslateService["translate"] = async (data) => {
  const userEmail = getPref("mymemory.userEmail") as string;
  const isValidEmail = isEmail(userEmail);
  const deParam = isValidEmail ? `&de=${encodeURIComponent(userEmail)}` : "";

  const processTranslation = async (text: string) => {
    const xhr = await Zotero.HTTP.request(
      "POST",
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${data.langfrom}|${data.langto}${deParam}`,
      {
        responseType: "json",
        // Zotero.HTTP throws UnexpectedStatusException for statuses not
        // listed here. Include the quota/limit codes so we can surface a
        // clean message below instead of a raw stack trace.
        successCodes: [200, 429, 403],
      },
    );

    if (xhr.status !== 200) {
      const res = xhr.response as { responseDetails?: string } | undefined;
      const detail = res?.responseDetails || `Request error: ${xhr.status}`;
      // MyMemory returns errors in ALL CAPS (e.g. "DAILY REQUEST LIMIT
      // EXCEEDED"); convert them to readable Title Case.
      const readable = toTitleCase(detail);
      if (xhr.status === 429) {
        throw `${readable}\n\n💡Hint: MyMemory service has a daily quota of 5k characters per IP address. You can raise it to 50k by entering your email in Zotero Settings > Translate > Service > MyMemory > Config (fill in the email field).`;
      }
      throw readable;
    }

    return xhr.response.responseData?.translatedText;
  };

  /** Turn ALL-CAPS error text into readable Title Case, leave other text as-is. */
  const toTitleCase = (text: string): string => {
    if (!text || text !== text.toUpperCase()) {
      return text;
    }
    return text.toLowerCase().replace(/(^|\s)\S/g, (ch) => ch.toUpperCase());
  };

  const sentences = data.raw
    .split(/[.?!]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const chunks = [];
  let currentChunk = "";
  sentences.forEach((sentence: string) => {
    const sentenceWithPeriod = sentence + ". ";
    // Maximum 500 characters per request
    if (currentChunk.length + sentenceWithPeriod.length > 450) {
      chunks.push(currentChunk);
      currentChunk = sentenceWithPeriod;
    } else {
      currentChunk += sentenceWithPeriod;
    }
  });
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  let translatedText = "";
  for (const chunk of chunks) {
    translatedText += (await processTranslation(chunk)) + " ";
    data.result = translatedText.trim();
    addon.api.getTemporaryRefreshHandler({ task: data })();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

export const MyMemory: TranslateService = {
  id: "mymemory",
  type: "sentence",

  translate,

  config(settings) {
    settings
      .addTextSetting({
        prefKey: "mymemory.userEmail",
        nameKey: "service-mymemory-dialog-userEmail",
      })
      // Validate the email on save. Empty is allowed (anonymous 5k quota),
      // but a non-empty value must be a valid email format.
      .onSave((dialogData) => {
        const email = dialogData["mymemory.userEmail"];
        if (email && !isEmail(email)) {
          return "Please enter a valid email address (e.g. name@example.com) or leave it empty.";
        }
        return true;
      });
  },
};
