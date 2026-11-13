/*
 * Tests for the custom request headers feature.
 * Uses the mock server in `test/mock-llm-server.mjs`, which `npm test`
 * starts through the `test:init` hook in `zotero-plugin.config.ts`.
 * The mock echoes each request (path, headers, body) back as the
 * "translation", so assertions verify exactly which headers were sent.
 */
import { customGPT2 } from "../src/modules/services/gpt";
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

function buildTask(raw: string): Required<TranslateTask> {
  return {
    id: "test-task",
    type: "title",
    raw,
    result: "",
    audio: [],
    service: "customgpt2",
    candidateServices: [],
    itemId: undefined,
    langfrom: "en-US",
    langto: "zh-CN",
    langfromInferred: false,
    status: "processing",
    extraTasks: [],
    secret: "test-secret",
    silent: false,
    callerID: "test",
    processed: false,
  };
}

const cleanupKeys = [
  "endPoint",
  "model",
  "prompt",
  "apiFormat",
  "temperature",
  "stream",
  "customHeaders",
];

describe("Custom request headers", function () {
  this.timeout(20000);

  beforeEach(function () {
    setPref("customGPT2.endPoint", `${MOCK}/v1/chat/completions`);
    setPref("customGPT2.model", "mock-model");
    setPref("customGPT2.prompt", "${sourceText}");
    setPref("customGPT2.apiFormat", "openai");
    setPref("customGPT2.temperature", "0.3");
    setPref("customGPT2.stream", false);
  });

  afterEach(function () {
    for (const key of cleanupKeys) {
      clearPref(`customGPT2.${key}`);
    }
  });

  it("sends configured custom request headers", async function () {
    setPref(
      "customGPT2.customHeaders",
      JSON.stringify({ "x-opencode-session": "abc-123" }),
    );
    const task = buildTask("HELLO HEADERS");
    await customGPT2.translate(task);
    assert.include(task.result, "session=abc-123");
  });

  it("never overrides headers set by the plugin itself", async function () {
    setPref(
      "customGPT2.customHeaders",
      JSON.stringify({ authorization: "Bearer hacked" }),
    );
    const task = buildTask("HELLO HEADERS");
    await customGPT2.translate(task);
    assert.include(task.result, "authValue=Bearer test-secret");
  });

  it("sends nothing extra when no custom headers are configured", async function () {
    const task = buildTask("HELLO HEADERS");
    await customGPT2.translate(task);
    assert.include(task.result, "session=unset");
  });
});
