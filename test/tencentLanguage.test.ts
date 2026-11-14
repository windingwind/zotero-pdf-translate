import { Tencent } from "../src/modules/services/tencent";
import type { TranslateTask } from "../src/utils/task";
import { clearPref, getPref, setPref } from "../src/utils/prefs";

describe("Tencent source language", function () {
  const keys = [
    "tencent.secretId",
    "tencent.secretKey",
    "tencent.region",
    "tencent.projectId",
    "tencent.termRepoIDList",
    "tencent.sentRepoIDList",
  ];
  const success = { Source: "en", TargetText: "测试翻译" };
  const unsupported = {
    Error: { Code: "InvalidParameterValue", Message: "不支持的语种：af_to_zh" },
  };
  type Response = {
    Source?: string;
    TargetText?: string;
    Error?: { Code: string; Message: string };
  };
  let savedPrefs: (string | number | boolean)[];
  let toolkitDescriptor: PropertyDescriptor | undefined;
  let originalRequest: typeof Zotero.HTTP.request;
  let requests: URLSearchParams[];
  let responses: Response[];
  let status: number;

  before(function () {
    // crypto.base64 needs the plugin toolkit in the test runner's own scope.
    toolkitDescriptor = Object.getOwnPropertyDescriptor(globalThis, "ztoolkit");
    (globalThis as unknown as { ztoolkit: unknown }).ztoolkit =
      Zotero.PDFTranslate.data.ztoolkit;
  });

  after(function () {
    if (toolkitDescriptor) {
      Object.defineProperty(globalThis, "ztoolkit", toolkitDescriptor);
    } else {
      delete (globalThis as { ztoolkit?: unknown }).ztoolkit;
    }
  });

  beforeEach(function () {
    savedPrefs = keys.map((key) => getPref(key));
    ["test-id", "test-key", "ap-shanghai", "0", "", ""].forEach(
      (value, index) => setPref(keys[index], value),
    );
    requests = [];
    responses = [];
    status = 200;
    originalRequest = Zotero.HTTP.request;
    Zotero.HTTP.request = (async (method, url, options) => {
      if (url !== "https://tmt.tencentcloudapi.com") {
        return originalRequest.call(Zotero.HTTP, method, url, options);
      }
      requests.push(new URLSearchParams(options?.body as string));
      return { status, response: { Response: responses.shift() ?? success } };
    }) as typeof Zotero.HTTP.request;
  });

  afterEach(function () {
    Zotero.HTTP.request = originalRequest;
    keys.forEach((key, index) => {
      if (savedPrefs[index] === undefined) {
        clearPref(key);
      } else {
        setPref(key, savedPrefs[index]);
      }
    });
  });

  function task(langfrom: string, langfromInferred?: boolean) {
    return {
      raw: "This is an English sentence & phrase.",
      result: "",
      langfrom,
      langto: "zh-CN",
      langfromInferred,
      secret: Tencent.defaultSecret,
    } as Required<TranslateTask>;
  }

  async function expectError(data: Required<TranslateTask>, message: string) {
    let failure;
    try {
      await Tencent.translate(data);
    } catch (error) {
      failure = String(error);
    }
    assert.equal(failure, message);
    assert.equal(data.result, "");
  }

  it("retries rejected inferred af once, re-signs, and records the detected source", async function () {
    responses = [unsupported, success];
    const data = task("af", true);
    await Tencent.translate(data);
    assert.deepEqual(
      requests.map((r) => r.get("Source")),
      ["af", "auto"],
    );
    assert.equal(data.result, success.TargetText);
    assert.equal(data.langfrom, "en");

    // Independently verify both signed payloads, including the changed Source.
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode("test-key"),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["verify"],
    );
    for (const request of requests) {
      assert.equal(request.get("Target"), "zh");
      assert.equal(request.get("SourceText"), data.raw);
      const raw = [...request.keys()]
        .filter((key) => key !== "Signature")
        .sort()
        .map((key) => `${key}=${request.get(key)}`)
        .join("&");
      const signature = Uint8Array.from(atob(request.get("Signature")!), (c) =>
        c.charCodeAt(0),
      );
      assert.isTrue(
        await crypto.subtle.verify(
          "HMAC",
          key,
          signature,
          encoder.encode(`POSTtmt.tencentcloudapi.com/?${raw}`),
        ),
      );
    }
  });

  it("preserves supported inferred languages without an extra request", async function () {
    const data = task("fr-FR", true);
    await Tencent.translate(data);
    assert.deepEqual(
      requests.map((r) => r.get("Source")),
      ["fr"],
    );
    assert.equal(data.langfrom, "fr-FR");
  });

  it("preserves explicit source languages", async function () {
    await Tencent.translate(task("en-US", false));
    await Tencent.translate(task("fr-FR", false));
    assert.deepEqual(
      requests.map((r) => r.get("Source")),
      ["en", "fr"],
    );
  });

  for (const inferred of [false, undefined]) {
    it(`does not retry unsupported explicit sources with inference=${inferred}`, async function () {
      responses = [unsupported];
      await expectError(
        task("af", inferred),
        "Service error: InvalidParameterValue:不支持的语种：af_to_zh",
      );
      assert.lengthOf(requests, 1);
    });
  }

  for (const code of [
    "UnsupportedOperation.UnsupportedSourceLanguage",
    "UnsupportedOperation.UnsupportedLanguage",
  ]) {
    it(`recognizes ${code}`, async function () {
      responses = [
        { Error: { Code: code, Message: "Unsupported source language" } },
        success,
      ];
      await Tencent.translate(task("af", true));
      assert.deepEqual(
        requests.map((r) => r.get("Source")),
        ["af", "auto"],
      );
    });
  }

  for (const code of [
    "AuthFailure.SignatureFailure",
    "RequestLimitExceeded",
    "LimitExceeded",
    "InvalidParameterValue",
    "UnsupportedOperation.UnsupportedTargetLanguage",
  ]) {
    it(`does not retry unrelated ${code} errors`, async function () {
      responses = [{ Error: { Code: code, Message: "Other failure" } }];
      await expectError(
        task("af", true),
        `Service error: ${code}:Other failure`,
      );
      assert.lengthOf(requests, 1);
    });
  }

  it("propagates a failed fallback without retrying again or changing the source", async function () {
    responses = [
      unsupported,
      {
        Error: {
          Code: "AuthFailure.SignatureFailure",
          Message: "Retry failed",
        },
      },
    ];
    const data = task("af", true);
    await expectError(
      data,
      "Service error: AuthFailure.SignatureFailure:Retry failed",
    );
    assert.lengthOf(requests, 2);
    assert.equal(data.langfrom, "af");
  });

  it("does not retry HTTP errors", async function () {
    status = 503;
    await expectError(task("af", true), "Request error: 503");
    assert.lengthOf(requests, 1);
  });

  it("does not retry an already automatic source", async function () {
    responses = [unsupported];
    await expectError(
      task("auto", true),
      "Service error: InvalidParameterValue:不支持的语种：af_to_zh",
    );
    assert.lengthOf(requests, 1);
  });

  it("uses the auto cache key if the fallback response omits its detected source", async function () {
    responses = [unsupported, { TargetText: success.TargetText }];
    const data = task("af", true);
    await Tencent.translate(data);
    assert.equal(data.langfrom, "auto");
    assert.equal(data.result, success.TargetText);
  });
});
