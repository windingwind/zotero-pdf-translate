import { getString } from "../../utils/locale";
import type { TranslateService } from "./base";

const ENDPOINT = "https://wordstalk.ai/klee-api/v1/chat/completions";
const MAX_CHARACTERS = 5000;
const HELP_URL = "https://wordstalk.ai/connect-tools";

export const WordsTalk: TranslateService = {
  id: "wordstalk",
  type: "sentence",
  helpUrl: HELP_URL,
  defaultSecret: "",
  secretValidator(secret) {
    const key = secret.trim();
    const status = key.length > 0 && !/\s/.test(key);
    return {
      secret: key,
      status,
      info: getString(
        status ? "service-wordstalk-info" : "service-wordstalk-error-key",
      ),
    };
  },
  config(settings) {
    settings.addStaticRow("", {
      tag: "div",
      namespace: "html",
      styles: { maxWidth: "400px", whiteSpace: "pre-wrap" },
      children: [
        {
          tag: "p",
          namespace: "html",
          properties: { textContent: getString("service-wordstalk-info") },
        },
        {
          tag: "a",
          namespace: "html",
          properties: { href: HELP_URL, textContent: HELP_URL },
        },
      ],
    });
  },
  async translate(data) {
    const key = data.secret.trim();
    if (!key || /\s/.test(key)) {
      throw getString("service-wordstalk-error-key");
    }
    if (!data.raw.trim()) {
      throw getString("service-wordstalk-error-empty");
    }
    // Match the backend: UTF-16 code units, excluding CR and LF.
    if (data.raw.replace(/[\r\n]/g, "").length > MAX_CHARACTERS) {
      throw getString("service-wordstalk-error-length");
    }

    let xhr: XMLHttpRequest;
    try {
      xhr = await Zotero.HTTP.request("POST", ENDPOINT, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "wordstalk",
          stream: false,
          // Send source text without a target instruction; the server selects the direction.
          messages: [{ role: "user", content: data.raw }],
        }),
        responseType: "json",
        successCodes: false,
        // Retrying a paid request can charge twice after a lost response.
        errorDelayMax: 0,
        timeout: 60000,
        logBodyLength: 0,
      });
    } catch {
      // Do not expose request headers, the key, or raw server responses.
      throw getString("service-wordstalk-error-network");
    }

    switch (xhr.status) {
      case 200:
        break;
      case 401:
      case 403:
        throw getString("service-wordstalk-error-key");
      case 402:
        throw getString("service-wordstalk-error-quota");
      case 400:
        throw getString("service-wordstalk-error-request");
      case 413:
        throw getString("service-wordstalk-error-length");
      case 429:
        throw getString("service-wordstalk-error-rate");
      case 0:
        throw getString("service-wordstalk-error-network");
      default:
        throw getString("service-wordstalk-error-server", {
          args: { status: xhr.status },
        });
    }

    const content = xhr.response?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw getString("service-wordstalk-error-response");
    }
    data.result = content;
  },
};
