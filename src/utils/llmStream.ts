/**
 * Shared helpers for talking to LLM chat APIs.
 *
 * The translation services in `modules/services` implement `chat` on top of
 * these helpers so that the follow-up Q&A panel can reuse the same
 * endpoints, secrets and streaming behaviour as translation.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Shared abort state between a chat request and the UI.
 *
 * The UI sets `aborted` (and calls `abort()`, when the request has already
 * started) to stop a reply that is being streamed.
 */
export interface ChatAbortRef {
  aborted: boolean;
  /**
   * Aborts the in-flight HTTP request, if one is running.
   *
   * Filled in by the request implementation, so that "Stop" does not have to
   * wait for the next stream chunk to take effect.
   */
  abort?: () => void;
}

export interface ChatRequest {
  messages: ChatMessage[];
  /**
   * Called whenever new content arrives, with the accumulated reply text.
   */
  onDelta?: (fullText: string) => void;
  /**
   * Return true to abort the request. Checked on every stream chunk.
   */
  isAborted?: () => boolean;
  /**
   * Abort state shared with the caller. Preferred over `isAborted`, since it
   * can also abort a request that is waiting for data.
   */
  abortRef?: ChatAbortRef;
}

/**
 * A chat implementation of a translate service.
 *
 * Should resolve with the full reply text, and call `request.onDelta` while
 * streaming if the endpoint supports it.
 */
export type ChatProcessor = (request: ChatRequest) => Promise<string>;

export type StreamFormat = "openai" | "openai-responses" | "claude" | "gemini";

export interface LlmStreamParser {
  /**
   * Feed the newly received raw text. Returns the accumulated reply.
   */
  push(chunk: string): string;
  readonly text: string;
}

function extractDelta(format: StreamFormat, obj: any): string {
  switch (format) {
    case "openai":
      // OpenAI Chat Completions / compatible / Ollama native
      return obj?.choices?.[0]?.delta?.content || obj?.message?.content || "";
    case "openai-responses":
      return obj?.type === "response.output_text.delta" ? obj.delta || "" : "";
    case "claude":
      return obj?.type === "content_block_delta" ? obj.delta?.text || "" : "";
    case "gemini": {
      const parts = obj?.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts)) {
        return "";
      }
      return parts.map((part: any) => part?.text || "").join("");
    }
    default:
      return "";
  }
}

/**
 * Extract the reply text of a non-streaming response body.
 */
export function extractFullText(format: StreamFormat, obj: any): string {
  switch (format) {
    case "openai":
      return obj?.choices?.[0]?.message?.content || obj?.message?.content || "";
    case "openai-responses": {
      if (!Array.isArray(obj?.output)) {
        return "";
      }
      return obj.output
        .filter((item: any) => item?.type === "message")
        .map((item: any) =>
          (item.content || [])
            .filter((content: any) => content?.type === "output_text")
            .map((content: any) => content.text || "")
            .join(""),
        )
        .join("");
    }
    case "claude": {
      if (!Array.isArray(obj?.content)) {
        return "";
      }
      return obj.content
        .map((block: any) => (block?.type === "text" ? block.text || "" : ""))
        .join("");
    }
    case "gemini": {
      const parts = obj?.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts)) {
        return "";
      }
      return parts.map((part: any) => part?.text || "").join("");
    }
    default:
      return "";
  }
}

/**
 * Line based SSE (and Ollama native) parser shared by all formats.
 *
 * Incomplete lines are buffered until the next chunk, so a JSON object split
 * across two chunks is parsed correctly.
 */
export function createLlmStreamParser(format: StreamFormat): LlmStreamParser {
  let buffer = "";
  let text = "";

  const push = (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    // Keep the last (possibly incomplete) line for the next chunk
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("event:")) {
        continue;
      }
      const payload = line.startsWith("data:") ? line.slice(5).trim() : line;
      if (!payload || payload === "[DONE]") {
        continue;
      }
      try {
        text += extractDelta(format, JSON.parse(payload));
      } catch (e) {
        // Not JSON (e.g. a partial object) — ignore this line
      }
    }
    return text;
  };

  return {
    push,
    get text() {
      return text;
    },
  };
}

export interface LlmRequestOptions {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  /**
   * Whether the endpoint should stream. When false the whole reply is
   * delivered through a single `onDelta` call.
   */
  stream: boolean;
  format: StreamFormat;
  onDelta?: (fullText: string) => void;
  isAborted?: () => boolean;
  /**
   * When provided, `abort` is set on this object as soon as the request
   * starts, and the request is aborted as soon as `aborted` becomes true.
   */
  abortRef?: ChatAbortRef;
}

/**
 * Send a chat request and return the reply text.
 *
 * Throws on HTTP errors. When `isAborted()` becomes true mid-stream the
 * request is aborted and the partial reply is returned.
 */
export async function requestLlm(options: LlmRequestOptions): Promise<string> {
  const { url, headers, body, stream, format } = options;
  const parser = createLlmStreamParser(format);
  let xhr: XMLHttpRequest | undefined;
  let aborted = false;

  const isAborted = () =>
    (options.isAborted?.() ?? false) || (options.abortRef?.aborted ?? false);

  let response: XMLHttpRequest | undefined;
  try {
    response = await Zotero.HTTP.request("POST", url, {
      headers,
      body: JSON.stringify(body),
      responseType: "text",
      requestObserver: (xmlhttp: XMLHttpRequest) => {
        xhr = xmlhttp;
        if (options.abortRef) {
          options.abortRef.abort = () => {
            options.abortRef!.aborted = true;
            aborted = true;
            try {
              xmlhttp.abort();
            } catch (e) {
              // Already finished
            }
          };
        }
        if (!stream) {
          return;
        }
        let preLength = 0;
        xmlhttp.onprogress = (e: any) => {
          // Clear timeouts caused by stream transfers
          if (e.target.timeout) {
            e.target.timeout = 0;
          }
          const text = String(e.target.response || "");
          const chunk = text.slice(preLength);
          preLength = text.length;
          const full = parser.push(chunk);
          options.onDelta?.(full);
          if (isAborted()) {
            aborted = true;
            try {
              xhr?.abort();
            } catch (err) {
              // ignore
            }
          }
        };
      },
    });
  } catch (e) {
    if (aborted || options.abortRef?.aborted) {
      return parser.text;
    }
    throw e;
  }

  if (aborted || options.abortRef?.aborted) {
    return parser.text;
  }

  const status = response?.status;
  if (status !== 200) {
    throw `Request error: ${status}`;
  }

  if (stream) {
    return parser.text;
  }

  const responseText = String(response?.responseText || "");
  let text = "";
  try {
    text = extractFullText(format, JSON.parse(responseText));
  } catch (e) {
    throw `Failed to parse response: ${String(e)}`;
  }
  options.onDelta?.(text);
  return text;
}
