import { FluentMessageId } from "../../typings/i10n";
import { getString } from "./locale";

/**
 * Thinking level of LLM translation services.
 *
 * "default" keeps the provider's own behavior by not sending any
 * thinking-related parameter; the other levels are mapped to each
 * provider's parameter dialect.
 */
export type ThinkingLevel = "default" | "off" | "low" | "medium" | "high";

type NonDefaultThinkingLevel = Exclude<ThinkingLevel, "default">;

const THINKING_LEVELS: readonly ThinkingLevel[] = [
  "default",
  "off",
  "low",
  "medium",
  "high",
];

export function getThinkingLevelOptions(): Array<{
  value: string;
  label: string;
}> {
  return THINKING_LEVELS.map((level) => ({
    value: level,
    label: getString(`service-dialog-thinking-${level}` as FluentMessageId),
  }));
}

/**
 * Detect if the endpoint URL is for OpenAI Responses API
 */
export function isResponsesApiEndpoint(url: string): boolean {
  return url.endsWith("/responses") || url.includes("/responses?");
}

type ThinkingDialect =
  | "openai"
  | "openrouter"
  | "deepseek"
  | "thinkingType"
  | "dashscope";

const DIALECT_HOSTS: Array<{ dialect: ThinkingDialect; hosts: string[] }> = [
  { dialect: "openai", hosts: ["api.openai.com", "openai.azure.com"] },
  { dialect: "openrouter", hosts: ["openrouter.ai"] },
  { dialect: "deepseek", hosts: ["deepseek.com"] },
  {
    // GLM (Zhipu), Kimi (Moonshot) and Doubao (Volcengine) share the
    // `thinking: { "type": "enabled" | "disabled" }` chat-completions shape
    dialect: "thinkingType",
    hosts: [
      "bigmodel.cn",
      "z.ai",
      "moonshot.cn",
      "kimi.com",
      "kimi.ai",
      "volces.com",
    ],
  },
  { dialect: "dashscope", hosts: ["aliyuncs.com"] },
];

function detectDialect(url: string): ThinkingDialect | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const { dialect, hosts } of DIALECT_HOSTS) {
    if (
      hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
    ) {
      return dialect;
    }
  }
  return null;
}

/**
 * Map "off" to the effort value accepted by the target OpenAI model.
 * Only gpt-5.0 models use "minimal" to disable reasoning; gpt-5.1+
 * and reasoning-first models only accept "none" (and may reject it).
 */
function openaiEffortValue(model: string, level: ThinkingLevel): string {
  if (level !== "off") {
    return level;
  }
  const match = /^gpt-5(?:\.(\d+))?/i.exec(model || "");
  if (match && !(match[1] && parseInt(match[1]) >= 1)) {
    return "minimal";
  }
  return "none";
}

/**
 * Build the thinking-related request parameters for an OpenAI-compatible
 * endpoint, in the dialect detected from its host.
 *
 * Returns an empty object for "default" and for endpoints whose provider
 * is unknown (e.g. relay stations), so no parameter is ever sent blindly —
 * unknown parameters are rejected by strict providers like OpenAI.
 */
export function buildThinkingParams(
  url: string,
  model: string,
  level: string,
): Record<string, any> {
  if (
    !THINKING_LEVELS.includes(level as ThinkingLevel) ||
    level === "default"
  ) {
    return {};
  }
  const thinkingLevel = level as NonDefaultThinkingLevel;

  switch (detectDialect(url)) {
    case "openai": {
      const effort = openaiEffortValue(model, thinkingLevel);
      return isResponsesApiEndpoint(url)
        ? { reasoning: { effort } }
        : { reasoning_effort: effort };
    }
    case "openrouter": {
      // https://openrouter.ai/docs/api-reference/parameters
      return thinkingLevel === "off"
        ? { reasoning: { enabled: false } }
        : { reasoning: { effort: thinkingLevel } };
    }
    case "deepseek": {
      // https://api-docs.deepseek.com/guides/thinking_mode/
      if (thinkingLevel === "off") {
        return { thinking: { type: "disabled" } };
      }
      const effort = { low: "low", medium: "high", high: "max" }[thinkingLevel];
      return { thinking: { type: "enabled" }, reasoning_effort: effort };
    }
    case "dashscope": {
      // https://help.aliyun.com/zh/model-studio/deep-thinking
      if (thinkingLevel === "off") {
        return { enable_thinking: false };
      }
      const budget = { low: 2048, medium: 8192, high: 16384 }[thinkingLevel];
      return { enable_thinking: true, thinking_budget: budget };
    }
    case "thinkingType": {
      // Chat-completions routes of GLM/Kimi/Doubao have no effort levels:
      // any non-default level is equivalent to enabled
      return {
        thinking: {
          type: thinkingLevel === "off" ? "disabled" : "enabled",
        },
      };
    }
    default:
      return {};
  }
}
