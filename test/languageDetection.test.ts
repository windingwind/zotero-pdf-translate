import { inferLanguage } from "../src/utils/config";
import { autoDetectLanguage, TranslateTaskRunner } from "../src/utils/task";
import type { TranslateTask } from "../src/utils/task";
import { clearPref, getPref, setPref } from "../src/utils/prefs";
import fixtures from "./fixtures/languageDetection.json";

describe("Conservative language inference", function () {
  for (const fixture of fixtures) {
    it(fixture.name, function () {
      assert.equal(inferLanguage(fixture.text).code, fixture.expected);
    });
  }

  it("tries the next candidate after insufficient text", function () {
    const english = fixtures.find((fixture) => fixture.expected === "en")!;
    assert.equal(inferLanguage("paper", english.text).code, "en");
  });
});

describe("Item language inference policy", function () {
  const keys = ["sourceLanguage", "targetLanguage", "enableAutoDetectLanguage"];
  let savedPrefs: (string | number | boolean)[];
  let originalGet: typeof Zotero.Items.get;
  let originalGetTopLevel: typeof Zotero.Items.getTopLevel;
  let originalCache: Record<number, string>;
  let fields: Record<string, string>;
  let writes: number;
  let item: Zotero.Item;

  beforeEach(function () {
    savedPrefs = keys.map((key) => getPref(key));
    setPref("sourceLanguage", "en-US");
    setPref("targetLanguage", "zh-CN");
    setPref("enableAutoDetectLanguage", true);
    const french = fixtures.find((fixture) => fixture.expected === "fr")!;
    fields = { language: "", abstractNote: "paper", title: french.text };
    writes = 0;
    item = {
      id: 424242,
      getField: (key: string) => fields[key] || "",
      isRegularItem: () => true,
      setField: () => {
        writes++;
      },
    } as unknown as Zotero.Item;
    originalGet = Zotero.Items.get;
    originalGetTopLevel = Zotero.Items.getTopLevel;
    Zotero.Items.get = ((id) =>
      id === item.id
        ? item
        : Reflect.apply(originalGet, Zotero.Items, [
            id,
          ])) as typeof Zotero.Items.get;
    Zotero.Items.getTopLevel = ((items) =>
      items[0] === item
        ? [item]
        : originalGetTopLevel.call(
            Zotero.Items,
            items,
          )) as typeof Zotero.Items.getTopLevel;
    originalCache = Zotero.PDFTranslate.data.translate.cachedSourceLanguage;
    Zotero.PDFTranslate.data.translate.cachedSourceLanguage = {};
  });

  afterEach(function () {
    Zotero.Items.get = originalGet;
    Zotero.Items.getTopLevel = originalGetTopLevel;
    Zotero.PDFTranslate.data.translate.cachedSourceLanguage = originalCache;
    keys.forEach((key, index) => {
      if (savedPrefs[index] === undefined) clearPref(key);
      else setPref(key, savedPrefs[index]);
    });
  });

  it("falls through a short abstract to a substantial title without editing metadata", function () {
    const result = autoDetectLanguage(item);
    assert.equal(result.fromLanguage, "fr");
    assert.isTrue(result.isInferred);
    assert.equal(fields.language, "");
    assert.equal(writes, 0);
  });

  it("keeps the configured source when all candidates abstain", function () {
    fields.title = "main.pdf";
    const result = autoDetectLanguage(item);
    assert.equal(result.fromLanguage, "en-US");
    assert.isFalse(result.isInferred);
    assert.equal(writes, 0);
  });

  it("respects a valid item language ahead of inferred text", function () {
    fields.language = "de";
    assert.equal(autoDetectLanguage(item).fromLanguage, "de");
    assert.equal(writes, 0);
  });

  it("respects a manually cached item source ahead of metadata", function () {
    fields.language = "de";
    Zotero.PDFTranslate.data.translate.cachedSourceLanguage[item.id] = "es";
    const result = autoDetectLanguage(item);
    assert.equal(result.fromLanguage, "es");
    assert.isNotTrue(result.isInferred);
  });

  it("preserves configured languages when inference is disabled", function () {
    setPref("enableAutoDetectLanguage", false);
    const result = autoDetectLanguage(item);
    assert.equal(result.fromLanguage, "en-US");
    assert.equal(result.toLanguage, "zh-CN");
    assert.isFalse(result.isInferred);
  });

  it("preserves the existing behavior for a language matching the target", function () {
    fields.language = "zh";
    const result = autoDetectLanguage(item);
    assert.equal(result.fromLanguage, "en-US");
    assert.isFalse(result.isInferred);
  });

  it("preserves the configured source when there is no item", function () {
    assert.equal(autoDetectLanguage(null).fromLanguage, "en-US");
  });

  function task(langfrom?: string): TranslateTask {
    return {
      id: "language-policy-test",
      type: "text",
      itemId: item.id,
      raw: "Sample text",
      result: "",
      audio: [],
      service: "test",
      candidateServices: [],
      extraTasks: [],
      status: "waiting",
      langfrom,
    };
  }

  it("does not mark an explicit source as inferred when only the target is missing", async function () {
    const data = task("de");
    const runner = new TranslateTaskRunner(() => {});
    await runner.run(data);
    assert.equal(data.langfrom, "de");
    assert.equal(data.langto, "zh-CN");
    assert.isNotTrue(data.langfromInferred);
    assert.equal(data.status, "success");
  });

  it("marks a missing source as inferred when a candidate replaces the default", async function () {
    const data = task();
    const runner = new TranslateTaskRunner(() => {});
    await runner.run(data);
    assert.equal(data.langfrom, "fr");
    assert.isTrue(data.langfromInferred);
    assert.equal(data.status, "success");
    assert.equal(writes, 0);
  });
});
