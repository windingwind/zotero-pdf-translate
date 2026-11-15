/*
 * Regression test for the secondary translation pass: the fast primary result
 * is replaced by the secondary service result without another Translate click.
 * Uses the mock LLM server from `npm test`, which echoes the request summary
 * (including the model name) as the translation.
 */
import { services } from "../src/modules/services";
import type { TranslateTask } from "../src/utils/task";
import { getActiveTextTask } from "../src/utils/task";
import { getPref, setPref } from "../src/utils/prefs";
import { getServiceSecret, setServiceSecret } from "../src/utils/secret";
import {
  SECOND_PASS_OFF,
  getMenuValue,
  menuValueToServiceId,
  selectMenuValue,
  serviceIdToMenuValue,
} from "../src/utils/secondPass";
import type Addon from "../src/addon";

const MOCK = "http://127.0.0.1:23190/v1/chat/completions";
const PRIMARY = "customgpt2";
const SECONDARY = "customgpt3";
const RERUN = "customgpt1";

/*
 * The test sandbox does not get the plugin's bare `addon`/`ztoolkit`
 * globals; bridge the running instance so the translation pipeline can use
 * its logger and refresh hooks.
 */
if (!(globalThis as { addon?: unknown }).addon) {
  const running = (Zotero as unknown as { PDFTranslate?: Addon }).PDFTranslate;
  (globalThis as { addon?: unknown }).addon = running;
}
if (!(globalThis as { ztoolkit?: unknown }).ztoolkit) {
  const running = (Zotero as unknown as { PDFTranslate?: Addon }).PDFTranslate;
  (globalThis as { ztoolkit?: unknown }).ztoolkit = running?.data.ztoolkit ?? {
    log: () => {},
  };
}

function configure(prefix: string, model: string) {
  setPref(`${prefix}.endPoint`, MOCK);
  setPref(`${prefix}.model`, model);
  setPref(`${prefix}.prompt`, "${sourceText}");
  setPref(`${prefix}.apiFormat`, "openai");
  setPref(`${prefix}.temperature`, "0.3");
  setPref(`${prefix}.stream`, false);
}

async function waitForSecondPass(task: TranslateTask) {
  const deadline = Date.now() + 15000;
  while (task.secondPass?.status === "processing" && Date.now() < deadline) {
    await Zotero.Promise.delay(100);
  }
}

describe("Secondary service menu values", function () {
  it("maps the blank option to the disabled preference", function () {
    assert.equal(menuValueToServiceId(SECOND_PASS_OFF), "");
    assert.equal(serviceIdToMenuValue(""), SECOND_PASS_OFF);
    assert.equal(menuValueToServiceId("cnki"), "cnki");
    assert.equal(serviceIdToMenuValue("cnki"), "cnki");
  });

  it("selects a non-empty item when the native value setter lags", function () {
    const item = {
      getAttribute: (name: string) => {
        if (name === "value") {
          return "customgpt3";
        }
        return name === "label" ? "dsf-Mus" : null;
      },
    };
    const menu = {
      querySelectorAll: () => [item],
      selectedItem: null,
      value: "",
    } as unknown as NonNullable<Parameters<typeof selectMenuValue>[0]>;

    selectMenuValue(menu, "customgpt3");

    assert.equal(menu.selectedItem, item);
    assert.equal(menu.selectedIndex, 0);
    assert.equal(menu.label, "dsf-Mus");
    assert.equal(getMenuValue(menu), "customgpt3");
  });
});

describe("Secondary translation pass", function () {
  const prefKeys = [
    "translateSource",
    "secondPassService",
    "sourceLanguage",
    "targetLanguage",
  ];
  let savedPrefs: (string | number | boolean)[];
  let savedSecrets: string[];

  before(function () {
    savedPrefs = prefKeys.map((key) => getPref(key));
    savedSecrets = [PRIMARY, SECONDARY, RERUN].map((id) =>
      getServiceSecret(id),
    );

    configure("customGPT2", "primary-model");
    configure("customGPT3", "secondary-model");
    configure("customGPT1", "rerun-model");
    for (const id of [PRIMARY, SECONDARY, RERUN]) {
      setServiceSecret(id, "test-key");
    }
    setPref("translateSource", PRIMARY);
    setPref("secondPassService", SECONDARY);
    setPref("sourceLanguage", "en-US");
    setPref("targetLanguage", "zh-CN");
  });

  after(function () {
    prefKeys.forEach((key, index) => setPref(key, savedPrefs[index]));
    [PRIMARY, SECONDARY, RERUN].forEach((id, index) =>
      setServiceSecret(id, savedSecrets[index]),
    );
  });

  it("replaces the primary result with the secondary result", async function () {
    this.timeout(20000);
    const task: TranslateTask = {
      id: `secondary-pass-${Date.now()}`,
      type: "text",
      raw: "The quick brown fox jumps over the lazy dog.",
      result: "",
      audio: [],
      service: PRIMARY,
      candidateServices: [],
      itemId: undefined,
      status: "waiting",
      extraTasks: [],
    };

    await services.runTranslationTask(task, { noCache: true });
    await waitForSecondPass(task);

    assert.equal(task.secondPass?.service, SECONDARY);
    assert.equal(task.secondPass?.status, "success");
    assert.include(task.result, "model=secondary-model");
    assert.notInclude(task.result, "model=primary-model");
  });

  it("re-runs the secondary pass after switching the service", async function () {
    this.timeout(20000);
    setPref("secondPassService", SECONDARY);
    const addon = (Zotero as unknown as { PDFTranslate: Addon }).PDFTranslate;
    const savedActiveTaskId = addon.data.popup.activeTaskId;
    const savedPopup = addon.data.popup.currentPopup;
    const task: TranslateTask = {
      id: `secondary-switch-${Date.now()}`,
      type: "text",
      raw: "Switching the secondary service should replace the result again.",
      result: "",
      audio: [],
      service: PRIMARY,
      candidateServices: [],
      itemId: undefined,
      status: "waiting",
      extraTasks: [],
    };
    addon.data.translate.queue.push(task);
    addon.data.popup.activeTaskId = task.id;

    await services.runTranslationTask(task, { noCache: true });
    await waitForSecondPass(task);
    assert.include(task.result, "model=secondary-model");

    // A newer task in the queue must not cause the popup refresh to read an
    // older entry: rerunning must move the active task to the head.
    const newer: TranslateTask = {
      ...task,
      id: `secondary-newer-${Date.now()}`,
      raw: "A newer selection.",
      result: "",
      status: "waiting",
      extraTasks: [],
    };
    addon.data.translate.queue.push(newer);
    // The visible popup task wins over a newer queued task.
    addon.data.popup.currentPopup = {
      isConnected: true,
    } as HTMLDivElement;
    assert.equal(getActiveTextTask()?.id, task.id);
    addon.data.popup.currentPopup = savedPopup;
    setPref("secondPassService", RERUN);
    services.rerunSecondPass(task);
    assert.equal(addon.data.translate.queue.at(-1)?.id, task.id);
    await waitForSecondPass(task);

    assert.equal(task.secondPass?.service, RERUN);
    assert.equal(task.secondPass?.status, "success");
    assert.include(task.result, "model=rerun-model");
    assert.notInclude(task.result, "model=secondary-model");
    assert.equal(getActiveTextTask()?.id, task.id);

    addon.data.translate.queue = addon.data.translate.queue.filter(
      (item) => item !== task && item !== newer,
    );
    addon.data.popup.activeTaskId = savedActiveTaskId;
    addon.data.popup.currentPopup = savedPopup;
  });
});
