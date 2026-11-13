import { WordsTalk } from "../src/modules/services/wordstalk";
import { services } from "../src/modules/services";
import { getString } from "../src/utils/locale";
import type { TranslateTask } from "../src/utils/task";
import type Addon from "../src/addon";
import { ServiceSettingsDialog } from "../src/utils/settingsDialog";

if (!(globalThis as { addon?: unknown }).addon) {
  (globalThis as unknown as { addon: unknown }).addon = (
    Zotero as unknown as { PDFTranslate: Addon }
  ).PDFTranslate;
}

type RequestOptions = NonNullable<Parameters<typeof Zotero.HTTP.request>[2]>;
type RecordedRequest = { method: string; url: string; options: RequestOptions };

function task(raw = "Machine learning."): Required<TranslateTask> {
  return {
    id: "wordstalk-test",
    type: "title",
    raw,
    result: "",
    audio: [],
    service: "wordstalk",
    candidateServices: [],
    itemId: undefined,
    langfrom: "en-US",
    langto: "de-DE",
    langfromInferred: false,
    status: "processing",
    extraTasks: [],
    secret: "test-key",
    silent: false,
    callerID: "test",
    processed: false,
  };
}

async function expectError(data: Required<TranslateTask>, message: string) {
  let caught: unknown;
  try {
    await WordsTalk.translate(data);
  } catch (error) {
    caught = error;
  }
  assert.strictEqual(caught, message);
  assert.strictEqual(data.result, "");
}

describe("WordsTalk service", function () {
  let originalRequest: typeof Zotero.HTTP.request;
  let requests: RecordedRequest[];
  let status: number;
  let response: unknown;
  let networkError: Error | undefined;

  beforeEach(function () {
    requests = [];
    status = 200;
    response = { choices: [{ message: { content: "机器学习。" } }] };
    networkError = undefined;
    originalRequest = Zotero.HTTP.request;
    Zotero.HTTP.request = (async (method, url, options) => {
      if (String(url) !== "https://wordstalk.ai/klee-api/v1/chat/completions") {
        return originalRequest.call(Zotero.HTTP, method, url, options);
      }
      requests.push({ method, url: String(url), options: options! });
      if (networkError) throw networkError;
      return { status, response } as XMLHttpRequest;
    }) as typeof Zotero.HTTP.request;
  });

  afterEach(function () {
    Zotero.HTTP.request = originalRequest;
  });

  it("registers WordsTalk alongside existing services", function () {
    assert.strictEqual(services.getServiceById("wordstalk"), WordsTalk);
    assert.isDefined(services.getServiceById("google"));
    assert.isDefined(services.getServiceById("customgpt1"));
    assert.strictEqual(WordsTalk.helpUrl, "https://wordstalk.ai/connect-tools");
    assert.include(getString("service-wordstalk"), "WordsTalk");
  });

  it("validates a personal key without displaying it", function () {
    const good = WordsTalk.secretValidator!("  test-key  ");
    assert.isTrue(good.status);
    assert.strictEqual(good.secret, "test-key");
    assert.notInclude(good.info, "test-key");
    assert.isFalse(WordsTalk.secretValidator!("").status);
    assert.isFalse(WordsTalk.secretValidator!("key\nextra").status);
  });

  it("renders a visible full URL that opens once from the real config dialog", async function () {
    this.timeout(10000);
    const dialog = new ServiceSettingsDialog();
    WordsTalk.config!(dialog);
    const originalLaunch = Zotero.launchURL;
    const opened: string[] = [];
    try {
      Zotero.launchURL = ((url: string) => {
        opened.push(url);
      }) as typeof Zotero.launchURL;
      await new Promise<void>((resolve) => {
        dialog.setDialogData({ loadCallback: resolve }).open("WordsTalk test");
      });
      const link = dialog.window.document.querySelector(
        "a",
      ) as HTMLAnchorElement;
      assert.isNotNull(link);
      assert.strictEqual(link.textContent, WordsTalk.helpUrl);
      // Check visible output and the click destination, not toolkit attributes.
      assert.isTrue(link.isConnected);
      assert.isAbove(link.getBoundingClientRect().width, 0);
      assert.isAbove(link.getBoundingClientRect().height, 0);
      assert.notEqual(
        dialog.window.getComputedStyle(link)!.visibility,
        "hidden",
      );
      assert.include(
        dialog.window.document.body.textContent || "",
        getString("service-wordstalk-info"),
      );
      link.click();
      assert.deepEqual(opened, [WordsTalk.helpUrl]);
    } finally {
      Zotero.launchURL = originalLaunch;
      dialog.window?.close();
    }
  });

  it("sends only selected text with Bearer auth and a fixed non-streaming request", async function () {
    const data = task("  A study of Japanese and English.\n第二行  ");
    data.secret = "  test-key  ";
    data.itemId = 123;
    await WordsTalk.translate(data);
    assert.lengthOf(requests, 1);
    const { method, url, options } = requests[0];
    assert.strictEqual(method, "POST");
    assert.strictEqual(
      url,
      "https://wordstalk.ai/klee-api/v1/chat/completions",
    );
    assert.deepEqual(options.headers, {
      "Content-Type": "application/json",
      Authorization: "Bearer test-key",
    });
    assert.deepEqual(JSON.parse(options.body as string), {
      model: "wordstalk",
      stream: false,
      messages: [{ role: "user", content: data.raw }],
    });
    assert.strictEqual(options.errorDelayMax, 0);
    assert.strictEqual(options.successCodes, false);
    assert.strictEqual(options.logBodyLength, 0);
    assert.strictEqual(data.result, "机器学习。");
  });

  it("round-trips through Zotero HTTP using the local mock server", async function () {
    Zotero.HTTP.request = ((method, url, options) => {
      if (String(url) !== "https://wordstalk.ai/klee-api/v1/chat/completions") {
        return originalRequest.call(Zotero.HTTP, method, url, options);
      }
      assert.strictEqual(
        String(url),
        "https://wordstalk.ai/klee-api/v1/chat/completions",
      );
      return originalRequest.call(
        Zotero.HTTP,
        method,
        "http://127.0.0.1:23190/v1/chat/completions",
        options,
      );
    }) as typeof Zotero.HTTP.request;
    const data = task("WordsTalk transport test");
    await WordsTalk.translate(data);
    assert.include(data.result, "path=/v1/chat/completions");
    assert.include(data.result, "auth=true");
    assert.include(data.result, "model=wordstalk");
    assert.include(data.result, "userText=WordsTalk transport test");
  });

  it("leaves direction to the backend even when the plugin target is different", async function () {
    const data = task("机器学习。");
    data.langto = "fr-FR";
    response = { choices: [{ message: { content: "Machine learning." } }] };
    await WordsTalk.translate(data);
    assert.deepEqual(JSON.parse(requests[0].options.body as string).messages, [
      { role: "user", content: "机器学习。" },
    ]);
    assert.strictEqual(data.result, "Machine learning.");
  });

  it("rejects a missing key before making a request", async function () {
    const data = task();
    data.secret = " ";
    await expectError(data, getString("service-wordstalk-error-key"));
    assert.lengthOf(requests, 0);
  });

  it("rejects blank text before making a request", async function () {
    await expectError(
      task(" \r\n\t"),
      getString("service-wordstalk-error-empty"),
    );
    assert.lengthOf(requests, 0);
  });

  it("accepts 5,000 code units with extra line breaks without altering the text", async function () {
    const raw = "a".repeat(2500) + "\r\n" + "b".repeat(2500);
    await WordsTalk.translate(task(raw));
    assert.strictEqual(
      JSON.parse(requests[0].options.body as string).messages[0].content,
      raw,
    );
  });

  it("rejects 5,001 code units without truncating or splitting into paid requests", async function () {
    await expectError(
      task("a".repeat(5001)),
      getString("service-wordstalk-error-length"),
    );
    assert.lengthOf(requests, 0);
  });

  it("counts spaces and both halves of surrogate pairs like the backend", async function () {
    await expectError(
      task("a".repeat(4999) + "  "),
      getString("service-wordstalk-error-length"),
    );
    await expectError(
      task("😀".repeat(2500) + "a"),
      getString("service-wordstalk-error-length"),
    );
    assert.lengthOf(requests, 0);
    await WordsTalk.translate(task("😀".repeat(2500)));
    assert.lengthOf(requests, 1);
  });

  for (const [code, key] of [
    [400, "request"],
    [401, "key"],
    [403, "key"],
    [402, "quota"],
    [413, "length"],
    [429, "rate"],
    [0, "network"],
  ] as const) {
    it(`reports HTTP ${code} without retrying or leaking the response`, async function () {
      status = code;
      response = { error: { message: "private server detail test-key" } };
      await expectError(task(), getString(`service-wordstalk-error-${key}`));
      assert.lengthOf(requests, 1);
    });
  }

  for (const code of [500, 502, 503]) {
    it(`reports HTTP ${code} without an automatic retry`, async function () {
      status = code;
      await expectError(
        task(),
        getString("service-wordstalk-error-server", { args: { status: code } }),
      );
      assert.lengthOf(requests, 1);
    });
  }

  it("handles a network failure without exposing the exception or retrying", async function () {
    networkError = new Error("timeout Authorization: Bearer test-key");
    await expectError(task(), getString("service-wordstalk-error-network"));
    assert.lengthOf(requests, 1);
  });

  for (const [name, payload] of [
    ["missing body", null],
    ["no choices", {}],
    ["empty content", { choices: [{ message: { content: " " } }] }],
    ["non-text content", { choices: [{ message: { content: ["text"] } }] }],
  ] as const) {
    it(`rejects an invalid success response: ${name}`, async function () {
      response = payload;
      await expectError(task(), getString("service-wordstalk-error-response"));
      assert.lengthOf(requests, 1);
    });
  }
});
