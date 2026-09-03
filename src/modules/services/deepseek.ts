import { getPref, getString, transformPromptWithContext } from "../../utils";
import { TranslateService } from "./base";
import { hasSourceTextPlaceholder } from "./gptPrompt";

// Parameters set by the service itself; custom params must not override them.
// Any other fields (e.g. top_p, frequency_penalty) are merged into the request body.
const standardParams = [
  "model",
  "messages",
  "temperature",
  "stream",
  "thinking",
  "reasoning_effort",
];

function getCustomParams(): Record<string, any> {
  const storedCustomParams =
    (getPref("deepSeek.customParams") as string) || "{}";
  try {
    const customParams = JSON.parse(storedCustomParams);
    return Object.fromEntries(
      Object.entries(customParams).filter(
        ([key]) => !standardParams.includes(key),
      ),
    );
  } catch (e) {
    return {};
  }
}

interface ParsedResponse {
  content: string;
  finished: boolean;
}

function parseStreamResponse(obj: any): ParsedResponse {
  if (obj.choices && obj.choices[0]) {
    const choice = obj.choices[0];
    return {
      // Reasoning chunks carry delta.reasoning_content and are ignored;
      // only the final answer in delta.content is shown.
      content: choice.delta?.content || "",
      finished:
        choice.finish_reason !== undefined && choice.finish_reason !== null,
    };
  }
  return { content: "", finished: false };
}

function getDeepSeekSecret(): string {
  try {
    const secretObj = JSON.parse(
      (getPref("secretObj") as string) || "{}",
    ) as Record<string, string>;
    return secretObj["deepseek"] || "";
  } catch (e) {
    return "";
  }
}

// Derive the models-list URL from a chat endpoint,
// e.g. https://api.deepseek.com/chat/completions -> https://api.deepseek.com/models
function getModelsURL(endPoint: string): string {
  return (
    endPoint
      .trim()
      .replace(/\/chat\/completions\/?$/i, "")
      .replace(/\/completions\/?$/i, "")
      .replace(/\/responses\/?$/i, "") + "/models"
  );
}

async function fetchModelIds(endPoint: string): Promise<string[]> {
  const response = await Zotero.HTTP.request("GET", getModelsURL(endPoint), {
    headers: { Authorization: `Bearer ${getDeepSeekSecret()}` },
    responseType: "json",
  });
  const models = response?.response?.data;
  if (!Array.isArray(models)) {
    throw new Error("unexpected response format");
  }
  return models
    .map((model: any) => model?.id)
    .filter((id): id is string => typeof id === "string")
    .sort();
}

const translate = <TranslateService["translate"]>async function (data) {
  const apiURL = getPref("deepSeek.endPoint") as string;
  const model = getPref("deepSeek.model") as string;
  const temperature = parseFloat(getPref("deepSeek.temperature") as string);
  const stream = getPref("deepSeek.stream") as boolean;
  const thinking = getPref("deepSeek.thinking") as boolean;
  const reasoningEffort = getPref("deepSeek.reasoningEffort") as string;

  const refreshHandler = addon.api.getTemporaryRefreshHandler({ task: data });

  // It takes some time to translate, so set the text to "Translating" before the request
  if (!stream) {
    data.result = getString("status-translating");
    refreshHandler();
  }

  const streamCallback = (xmlhttp: XMLHttpRequest) => {
    let preLength = 0;
    let result = "";
    let buffer = ""; // Buffer to store the last incomplete line
    xmlhttp.onprogress = (e: any) => {
      const newResponse = e.target.response.slice(preLength);
      preLength = e.target.response.length;

      // DeepSeek streams in OpenAI SSE format: lines of `data: {json}`
      const lines = (buffer + newResponse).split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const obj = JSON.parse(payload);
          const { content, finished } = parseStreamResponse(obj);
          result += content;
          if (finished) break;
        } catch {
          continue;
        }
      }

      // Clear timeouts caused by stream transfers
      if (e.target.timeout) {
        e.target.timeout = 0;
      }

      data.result = result.replace(/^\n\n/, "");
      refreshHandler();
    };
  };

  const nonStreamCallback = (xmlhttp: XMLHttpRequest) => {
    xmlhttp.onload = () => {
      try {
        const responseObj = JSON.parse(xmlhttp.responseText);
        data.result = (
          responseObj.choices?.[0]?.message?.content || ""
        ).replace(/^\n\n/, "");
      } catch (error) {
        data.result = `Failed to parse response: ${error}`;
        data.status = "fail";
        return;
      }
      refreshHandler();
    };
  };

  const requestBody = {
    model,
    messages: [
      {
        role: "user",
        content: transformPromptWithContext(
          "deepSeek.prompt",
          data.langfrom,
          data.langto,
          data.raw,
          data,
        ),
      },
    ],
    temperature,
    stream,
    // Reasoning models accept thinking/reasoning_effort; both are omitted
    // entirely when thinking is disabled, so non-thinking models keep working.
    ...(thinking
      ? {
          thinking: { type: "enabled" },
          ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
        }
      : {}),
    ...getCustomParams(),
  };

  const xhr = await Zotero.HTTP.request("POST", apiURL, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.secret}`,
    },
    body: JSON.stringify(requestBody),
    responseType: "text",
    requestObserver: (xmlhttp: XMLHttpRequest) => {
      if (stream) {
        streamCallback(xmlhttp);
      } else {
        nonStreamCallback(xmlhttp);
      }
    },
  });

  if (xhr?.status !== 200) {
    data.result = `Request error: ${xhr?.status}`;
    data.status = "fail";
    throw `Request error: ${xhr?.status}`;
  }

  data.status = "success";
};

export const DeepSeek: TranslateService = {
  id: "deepseek",
  type: "sentence",
  helpUrl: "https://api-docs.deepseek.com/",

  defaultSecret: "",
  secretValidator(secret: string) {
    const status = /^sk-[A-Za-z0-9_-]{32,}$/.test(secret);
    const empty = secret.length === 0;
    return {
      secret,
      status: status || Boolean(secret),
      info: empty
        ? "The secret is not set."
        : status
          ? "Click the button to check connectivity."
          : "The DeepSeek API key format might be invalid. Typically starts with 'sk-'.",
    };
  },

  translate,

  config(settings) {
    settings
      .addTextSetting({
        prefKey: "deepSeek.endPoint",
        nameKey: "service-deepseek-dialog-endPoint",
      })
      .addTextSetting({
        prefKey: "deepSeek.model",
        nameKey: "service-deepseek-dialog-model",
      })
      .addButton(
        getString("service-deepseek-dialog-fetch-models"),
        "deepseek-fetch-models",
        {
          noClose: true,
          callback: async (ev) => {
            const doc = (ev.target as HTMLElement).ownerDocument;
            const modelInput = doc.querySelector<HTMLInputElement>(
              '[data-setting-key="deepSeek.model"]',
            );
            const endPointInput = doc.querySelector<HTMLInputElement>(
              '[data-setting-key="deepSeek.endPoint"]',
            );
            if (!modelInput) return;
            try {
              const models = await fetchModelIds(
                endPointInput?.value ||
                  (getPref("deepSeek.endPoint") as string),
              );
              // The settings dialog is a XUL-hybrid document, where HTML
              // <datalist> suggestions and bare XUL menupopups do not render
              // properly; show the fetched models as a styled HTML dropdown
              // anchored to the model input instead.
              const htmlNS = "http://www.w3.org/1999/xhtml";
              doc.getElementById("deepseek-models-menu")?.remove();
              const rect = modelInput.getBoundingClientRect();
              const menu = doc.createElementNS(htmlNS, "div");
              menu.id = "deepseek-models-menu";
              Object.assign(menu.style, {
                position: "fixed",
                left: `${rect.left}px`,
                top: `${rect.bottom + 2}px`,
                minWidth: `${Math.max(rect.width, 200)}px`,
                maxHeight: "240px",
                overflowY: "auto",
                zIndex: "1000",
                background: "Field",
                color: "FieldText",
                border:
                  "1px solid color-mix(in srgb, currentColor 30%, transparent)",
                borderRadius: "6px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
                padding: "4px",
                boxSizing: "border-box",
              });
              for (const id of models) {
                const item = doc.createElementNS(htmlNS, "div");
                item.textContent = id;
                Object.assign(item.style, {
                  padding: "5px 12px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                  ...(id === modelInput.value ? { fontWeight: "600" } : {}),
                });
                item.addEventListener("mouseenter", () => {
                  item.style.background =
                    "color-mix(in srgb, currentColor 12%, transparent)";
                });
                item.addEventListener("mouseleave", () => {
                  item.style.background = "transparent";
                });
                item.addEventListener("click", () => {
                  modelInput.value = id;
                  menu.remove();
                  cleanup();
                });
                menu.appendChild(item);
              }
              const close = (e: Event) => {
                if (!menu.contains(e.target as Node)) {
                  menu.remove();
                  cleanup();
                }
              };
              const cleanup = () =>
                doc.removeEventListener("pointerdown", close, true);
              doc.addEventListener("pointerdown", close, true);
              (doc.body || doc.documentElement).appendChild(menu);
            } catch (e: any) {
              const win = doc.defaultView;
              if (win) {
                Zotero.alert(
                  win,
                  getString("service-deepseek-dialog-fetch-models-failed"),
                  `${e?.message || e}`,
                );
              }
            }
          },
        },
      )
      .addNumberSetting({
        prefKey: "deepSeek.temperature",
        nameKey: "service-deepseek-dialog-temperature",
        min: 0,
        max: 2,
        step: 0.1,
      })
      .addCheckboxSetting({
        prefKey: "deepSeek.thinking",
        nameKey: "service-deepseek-dialog-thinking",
      })
      .addSelectSetting({
        prefKey: "deepSeek.reasoningEffort",
        nameKey: "service-deepseek-dialog-reasoningEffort",
        options: [
          { label: "low", value: "low" },
          { label: "medium", value: "medium" },
          { label: "high", value: "high" },
        ],
      })
      .addCheckboxSetting({
        prefKey: "deepSeek.stream",
        nameKey: "service-deepseek-dialog-stream",
      })
      .addTextAreaSetting({
        prefKey: "deepSeek.prompt",
        nameKey: "service-deepseek-dialog-prompt",
        placeholder: getString("service-deepseek-dialog-prompt"),
      })
      .addStaticRow("", {
        tag: "div",
        namespace: "html",
        styles: {
          color: "var(--fill-secondary)",
          fontSize: "0.9em",
          maxWidth: "400px",
        },
        properties: {
          textContent: getString("service-gpt-dialog-prompt-hint", {
            args: {
              variables: "${langFrom}, ${langTo}, ${sourceText}",
              required: "${sourceText}",
            },
          }),
        },
      })
      .addCustomParamsSetting({
        prefKey: "deepSeek.customParams",
        nameKey: "service-deepseek-dialog-custom-request",
        desc: getString("service-dialog-custom-request-description"),
      })
      .onSave((data) => {
        const prompt = String(data["deepSeek.prompt"] || "");
        return hasSourceTextPlaceholder(prompt)
          ? true
          : getString("service-gpt-dialog-prompt-required", {
              args: { placeholder: "${sourceText}" },
            });
      });
  },
};
