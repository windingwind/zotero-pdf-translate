// Mock LLM server for `test/gptApiFormat.test.ts`.
//
// Run before the tests:
//   node test/mock-llm-server.mjs & npm test
//
// Both the Anthropic Messages API and the OpenAI Chat Completions API are
// emulated. Instead of translating, every response echoes the request it
// received (path, headers, body fields) so tests can assert exactly what the
// plugin sent.
import http from "node:http";

const PORT = 23190;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function summarize(req, body) {
  const auth = Boolean(req.headers["authorization"]);
  const apiKey = Boolean(req.headers["x-api-key"]);
  const version = String(req.headers["anthropic-version"] ?? "");
  const thinking = body.thinking ? body.thinking.type : "unset";
  return [
    `path=${req.url}`,
    `auth=${auth}`,
    `xapikey=${apiKey}`,
    `version=${version}`,
    `model=${body.model}`,
    `maxTokens=${body.max_tokens ?? "unset"}`,
    `temp=${body.temperature}`,
    `thinking=${thinking}`,
    `userText=${body.messages?.find((message) => message.role === "user")?.content ?? body.input ?? ""}`,
  ].join(" ");
}

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
  const summary = summarize(req, body);
  const isAnthropic = req.url.startsWith("/v1/messages");
  console.log(`[mock] ${req.method} ${req.url} stream=${body.stream}`);

  if (!body.stream) {
    const payload = isAnthropic
      ? {
          content: [
            { type: "thinking", thinking: "internal reasoning" },
            { type: "text", text: summary },
          ],
        }
      : { choices: [{ message: { role: "assistant", content: summary } }] };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/event-stream" });
  if (isAnthropic) {
    const events = [
      { event: "message_start", data: { type: "message_start", message: {} } },
      {
        event: "content_block_delta",
        data: {
          type: "content_block_delta",
          delta: { type: "thinking_delta", thinking: "ignore me" },
        },
      },
      { event: "ping", data: { type: "ping" } },
      {
        event: "content_block_delta",
        data: {
          type: "content_block_delta",
          delta: { type: "text_delta", text: summary.slice(0, 40) },
        },
      },
      {
        event: "content_block_delta",
        data: {
          type: "content_block_delta",
          delta: { type: "text_delta", text: summary.slice(40) },
        },
      },
      { event: "message_stop", data: { type: "message_stop" } },
    ];
    for (const { event, data } of events) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      await delay(30);
    }
  } else {
    const events = [
      {
        choices: [
          { delta: { content: summary.slice(0, 40) }, finish_reason: null },
        ],
      },
      {
        choices: [
          { delta: { content: summary.slice(40) }, finish_reason: "stop" },
        ],
      },
    ];
    for (const data of events) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      await delay(30);
    }
    res.write("data: [DONE]\n\n");
  }
  res.end();
});

server.listen(PORT, "127.0.0.1", () =>
  console.log(`[mock] listening on http://127.0.0.1:${PORT}`),
);
