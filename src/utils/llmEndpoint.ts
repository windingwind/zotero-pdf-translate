/**
 * LLM providers publish their API as a base URL (`https://api.deepseek.com`,
 * `https://api.deepseek.com/v1`), so users rarely type the resource path.
 * Build the full request URL for the selected API format from either form.
 *
 * @param endPoint The value the user typed in the EndPoint setting.
 * @param apiFormat `anthropic` selects the messages resource, anything else
 * the OpenAI chat completions resource.
 * @returns The full endpoint URL; anything already pointing at a resource
 * path is returned unchanged.
 */
export function normalizeLLMEndpoint(
  endPoint: string,
  apiFormat?: string,
): string {
  const raw = (endPoint || "").trim();
  // A query string (e.g. Azure-style `?api-version=`) means the user is
  // already pointing at a concrete endpoint.
  if (!raw || raw.includes("?")) {
    return raw;
  }
  const base = raw.replace(/\/+$/, "");
  const path = base.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "");
  const resource =
    apiFormat === "anthropic" ? "/messages" : "/chat/completions";

  // `https://api.deepseek.com` -> `https://api.deepseek.com/v1/chat/completions`
  if (!path) {
    return `${base}/v1${resource}`;
  }
  // `https://api.deepseek.com/v1`, `https://host/proxy/v1beta` -> append only
  // the resource path, the version segment is already there.
  if (/^v\d+[a-z0-9]*$/i.test(path.split("/").pop() as string)) {
    return `${base}${resource}`;
  }
  // Already a full endpoint (`.../chat/completions`, `.../messages`,
  // `.../responses`, Ollama's `.../api/chat`): keep it as typed.
  return raw;
}
