/*
 * Regression tests for the custom GPT API format switch.
 * Requires the mock server: `node test/mock-llm-server.mjs & npm test`.
 * The mock echoes each request (path, headers, body) back as the
 * "translation", so assertions verify both the request and the parsing.
 */
import { customGPT2, customGPT3 } from "../src/modules/services/gpt";
import type { TranslateTask } from "../src/utils/task";
import { setPref, clearPref } from "../src/utils/prefs";

import type Addon from "../src/addon";

/*
 * The service reads the plugin instance from the bare `addon` global in the
 * plugin's own scope. Bridge the running instance (Zotero.PDFTranslate) into
 * this context; fall back to a stub since a "title" task never uses refresh.
 */
if (!(globalThis as { addon?: unknown }).addon) {
  const running = (Zotero as unknown as { PDFTranslate?: Addon }).PDFTranslate;
  (globalThis as unknown as { addon: unknown }).addon = running ?? {
    api: { getTemporaryRefreshHandler: () => () => {} },
  };
}
const MOCK = "http://127.0.0.1:23190";

function buildTask(raw: string, service: string): Required<TranslateTask> {
  return {
    id: "test-task",
    type: "title",
    raw,
    result: "",
    audio: [],
    service,
    candidateServices: [],
    itemId: undefined,
    langfrom: "en-US",
    langto: "zh-CN",
    status: "processing",
    extraTasks: [],
    secret: "test-secret",
  };
}

function configure(prefix: string, endPoint: string, apiFormat: string) {
  setPref(`${prefix}.endPoint`, endPoint);
  setPref(`${prefix}.model`, "mock-model");
  setPref(`${prefix}.prompt`, "${sourceText}");
  setPref(`${prefix}.apiFormat`, apiFormat);
  setPref(`${prefix}.temperature`, "0.3");
}

const cleanupKeys = [
  "endPoint",
  "model",
  "prompt",
  "apiFormat",
  "temperature",
  "stream",
];

describe("Custom GPT API format", function () {
  this.timeout(20000);

  beforeEach(function () {
    configure("customGPT3", `${MOCK}/v1/messages`, "anthropic");
    configure("customGPT2", `${MOCK}/v1/chat/completions`, "openai");
  });

  afterEach(function () {
    for (const key of cleanupKeys) {
      clearPref(`customGPT3.${key}`);
      clearPref(`customGPT2.${key}`);
    }
  });

  it("sends Anthropic format with stream and parses the text deltas", async function () {
    setPref("customGPT3.stream", true);
    const task = buildTask("HELLO ANTHROPIC", "customgpt3");
    await customGPT3.translate(task);
    assert.include(task.result, "path=/v1/messages");
    assert.include(task.result, "auth=false");
    assert.include(task.result, "xapikey=true");
    assert.include(task.result, "version=2023-06-01");
    assert.include(task.result, "model=mock-model");
    assert.include(task.result, "maxTokens=4000");
    assert.include(task.result, "userText=HELLO ANTHROPIC");
  });

  it("sends Anthropic format without stream and parses content blocks", async function () {
    setPref("customGPT3.stream", false);
    const task = buildTask("HELLO ANTHROPIC", "customgpt3");
    await customGPT3.translate(task);
    assert.include(task.result, "path=/v1/messages");
    assert.include(task.result, "xapikey=true");
    assert.include(task.result, "maxTokens=4000");
    assert.include(task.result, "userText=HELLO ANTHROPIC");
  });

  it("keeps the default OpenAI format with stream", async function () {
    setPref("customGPT2.stream", true);
    const task = buildTask("HELLO OPENAI", "customgpt2");
    await customGPT2.translate(task);
    assert.include(task.result, "path=/v1/chat/completions");
    assert.include(task.result, "auth=true");
    assert.include(task.result, "xapikey=false");
    assert.include(task.result, "maxTokens=unset");
    assert.include(task.result, "userText=HELLO OPENAI");
  });

  it("keeps the default OpenAI format without stream", async function () {
    setPref("customGPT2.stream", false);
    const task = buildTask("HELLO OPENAI", "customgpt2");
    await customGPT2.translate(task);
    assert.include(task.result, "path=/v1/chat/completions");
    assert.include(task.result, "auth=true");
    assert.include(task.result, "userText=HELLO OPENAI");
  });

  it("expands a bare base URL for the OpenAI format", async function () {
    setPref("customGPT2.endPoint", MOCK);
    setPref("customGPT2.stream", false);
    const task = buildTask("HELLO BASE URL", "customgpt2");
    await customGPT2.translate(task);
    assert.include(task.result, "path=/v1/chat/completions");
    assert.include(task.result, "userText=HELLO BASE URL");
  });

  it("expands a versioned base URL for the Anthropic format", async function () {
    setPref("customGPT3.endPoint", `${MOCK}/v1`);
    setPref("customGPT3.stream", false);
    const task = buildTask("HELLO BASE URL", "customgpt3");
    await customGPT3.translate(task);
    assert.include(task.result, "path=/v1/messages");
    assert.include(task.result, "xapikey=true");
    assert.include(task.result, "userText=HELLO BASE URL");
  });

  it("keeps a non-standard endpoint path untouched", async function () {
    setPref("customGPT2.endPoint", `${MOCK}/api/chat`);
    setPref("customGPT2.stream", false);
    const task = buildTask("HELLO OLLAMA", "customgpt2");
    await customGPT2.translate(task);
    assert.include(task.result, "path=/api/chat");
    assert.include(task.result, "userText=HELLO OLLAMA");
  });

  it("expands the Gemini OpenAI-compatible base URL", async function () {
    setPref("customGPT2.endPoint", `${MOCK}/v1beta/openai/`);
    setPref("customGPT2.stream", false);
    const task = buildTask("HELLO GEMINI", "customgpt2");
    await customGPT2.translate(task);
    assert.include(task.result, "path=/v1beta/openai/chat/completions");
    assert.include(task.result, "userText=HELLO GEMINI");
  });

  it("expands an Anthropic mount base URL", async function () {
    setPref("customGPT3.endPoint", `${MOCK}/anthropic`);
    setPref("customGPT3.stream", false);
    const task = buildTask("HELLO DEEPSEEK ANTHROPIC", "customgpt3");
    await customGPT3.translate(task);
    assert.include(task.result, "path=/anthropic/v1/messages");
    assert.include(task.result, "xapikey=true");
    assert.include(task.result, "userText=HELLO DEEPSEEK ANTHROPIC");
  });
});
