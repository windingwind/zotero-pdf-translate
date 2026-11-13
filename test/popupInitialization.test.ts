import { UITool, unregister } from "zotero-plugin-toolkit";
import { config } from "../package.json";
import {
  buildReaderPopup,
  disposeReaderPopups,
  updateReaderPopup,
} from "../src/modules/popup";
import { clearPref, getPref, setPref } from "../src/utils/prefs";
import type { TranslateTask } from "../src/utils/task";

describe("Reader popup preference initialization", function () {
  this.timeout(15000);

  const context = globalThis as unknown as {
    document: Document;
    addon?: unknown;
    ztoolkit?: unknown;
    debug?: (message: string) => void;
  };
  const zotero = Zotero as unknown as Record<string, unknown>;
  const prefNames = [
    "keepPopupSize",
    "popupWidth",
    "popupHeight",
    "popupOuterWidth",
    "popupOuterHeight",
    "enablePopup",
    "enableHidePopupTextarea",
    "enableAuto",
    "enableNote",
    "showPlayBtn",
    "autoPlay",
    "fontSize",
    "lineHeight",
  ];
  let iframe: HTMLIFrameElement;
  let doc: Document;
  let ui: UITool;
  let oldAddon: unknown;
  let oldToolkit: unknown;
  let oldInstance: unknown;
  let oldGetMainWindow: typeof Zotero.getMainWindow;
  let oldPrefs: Map<string, string | number | boolean | undefined>;
  let popup: HTMLDivElement;
  let section: HTMLDivElement;
  let task: TranslateTask;
  let fakeAddon: {
    data: {
      popup: { currentPopup?: HTMLDivElement };
      translate: { selectedText: string; queue: TranslateTask[] };
    };
  };

  before(async function () {
    try {
      const owner = context.document;
      if (!owner?.documentElement)
        throw new Error("The test runner document is unavailable");
      iframe = owner.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "iframe",
      ) as HTMLIFrameElement;
      iframe.style.cssText =
        "position:fixed;left:0;top:0;width:1000px;height:800px;border:0;z-index:2147483647";
      iframe.src = "about:blank";
      owner.documentElement.append(iframe);
      doc = iframe.contentDocument!;
      if (!doc?.documentElement)
        throw new Error("The initialization fixture has no document body");
      doc.open();
      doc.write(
        "<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%}button{height:24px}</style></head><body></body></html>",
      );
      doc.close();
    } catch (error) {
      const detail = `${String(error)}\n${(error as Error)?.stack || ""}`;
      context.debug?.(`Popup initialization fixture: ${detail}`);
      const failure = new Error(detail);
      throw Object.assign(failure, {
        toJSON() {
          return { message: detail, stack: failure.stack };
        },
      });
    }
  });

  beforeEach(function () {
    oldAddon = context.addon;
    oldToolkit = context.ztoolkit;
    oldInstance = zotero[config.addonInstance];
    oldGetMainWindow = Zotero.getMainWindow;
    oldPrefs = new Map(prefNames.map((key) => [key, getPref(key)]));
    ui = new UITool();
    context.ztoolkit = { UI: ui };
    // Only this test context and isolated scaffold profile are bridged. The
    // production plugin instance and main-window accessor are restored below.
    Zotero.getMainWindow = (() => ({
      ZoteroContextPane: { activeEditor: null },
    })) as unknown as typeof Zotero.getMainWindow;
    task = {
      id: "popup-legacy-waiting",
      type: "text",
      raw: "Selected English text",
      result: "",
      audio: [],
      service: "test",
      candidateServices: [],
      itemId: undefined,
      langto: "zh-CN",
      status: "waiting",
      extraTasks: [],
    };
    fakeAddon = {
      data: { popup: {}, translate: { selectedText: task.raw, queue: [task] } },
    };
    context.addon = fakeAddon;
    zotero[config.addonInstance] = fakeAddon;
    for (const [key, value] of Object.entries({
      keepPopupSize: true,
      popupWidth: 420,
      popupHeight: 160,
      popupOuterWidth: 0,
      popupOuterHeight: 0,
      enablePopup: true,
      enableHidePopupTextarea: false,
      enableAuto: false,
      enableNote: false,
      showPlayBtn: false,
      autoPlay: false,
      fontSize: 14,
      lineHeight: "1.5",
    }))
      setPref(key, value);
    const area = doc.createElement("div");
    area.className = "primary-view";
    area.style.cssText =
      "position:absolute;left:0;top:0;width:960px;height:720px;overflow:hidden";
    popup = doc.createElement("div");
    popup.className = "selection-popup";
    popup.style.cssText =
      "position:absolute;left:0;top:0;transform:translate(60px,40px);padding:8px;display:flex;flex-direction:column;gap:6px;width:max-content;max-width:198px";
    const colors = doc.createElement("div");
    colors.className = "colors";
    colors.style.cssText = "height:24px;min-width:184px";
    const wrappers = doc.createElement("div");
    wrappers.className = "custom-sections";
    section = doc.createElement("div");
    section.className = "section";
    wrappers.append(section);
    popup.append(colors, wrappers);
    area.append(popup);
    doc.body.append(area);
  });

  afterEach(function () {
    disposeReaderPopups();
    if (ui) unregister(ui);
    doc.body.replaceChildren();
    context.addon = oldAddon;
    context.ztoolkit = oldToolkit;
    zotero[config.addonInstance] = oldInstance;
    Zotero.getMainWindow = oldGetMainWindow;
    for (const [key, value] of oldPrefs) {
      if (value === undefined) clearPref(key);
      else setPref(key, value);
    }
  });

  after(function () {
    iframe?.remove();
  });

  function build() {
    const event = {
      reader: { _instanceID: "popup-initialization-test", itemID: 1 },
      doc,
      params: { annotation: { text: task.raw } },
      append: (node: Node) => section.append(node),
    };
    buildReaderPopup(
      event as unknown as Parameters<typeof buildReaderPopup>[0],
    );
    const textarea = popup.querySelector("textarea");
    assert.exists(textarea);
    return textarea!;
  }

  it("retains legacy textarea dimensions through the initial waiting state", function () {
    const textarea = build();
    updateReaderPopup();
    assert.isTrue(textarea.hidden);
    assert.equal(textarea.style.width, "420px");
    assert.equal(textarea.style.height, "160px");
    assert.lengthOf(popup.querySelectorAll("[data-popup-resize]"), 0);
    task.status = "processing";
    task.result = "Translated text";
    updateReaderPopup();
    assert.isFalse(textarea.hidden);
    assert.lengthOf(popup.querySelectorAll("[data-popup-resize]"), 8);
    assert.isAtLeast(popup.getBoundingClientRect().width, 420);
    assert.isAtLeast(textarea.getBoundingClientRect().height, 159);
    assert.equal(getPref("popupOuterWidth"), 0);
    assert.equal(getPref("popupOuterHeight"), 0);
  });

  it("applies saved outer dimensions only when translation text first becomes visible", function () {
    setPref("popupOuterWidth", 500);
    setPref("popupOuterHeight", 340);
    const textarea = build();
    updateReaderPopup();
    assert.isTrue(textarea.hidden);
    assert.lengthOf(popup.querySelectorAll("[data-popup-resize]"), 0);
    task.status = "success";
    task.result = "Complete translation";
    updateReaderPopup();
    assert.closeTo(popup.getBoundingClientRect().width, 500, 0.05);
    assert.closeTo(popup.getBoundingClientRect().height, 340, 0.05);
  });

  it("makes the textarea visible again after disabling and re-enabling the popup", function () {
    const textarea = build();
    task.status = "success";
    task.result = "A completed translation";
    updateReaderPopup();
    setPref("enablePopup", false);
    updateReaderPopup();
    assert.equal(textarea.style.display, "none");
    assert.lengthOf(popup.querySelectorAll("[data-popup-resize]"), 0);
    setPref("enablePopup", true);
    updateReaderPopup();
    assert.isFalse(textarea.hidden);
    assert.notEqual(
      doc.defaultView!.getComputedStyle(textarea)!.display,
      "none",
    );
    assert.lengthOf(popup.querySelectorAll("[data-popup-resize]"), 8);
    assert.equal(textarea.value, task.result);
  });
});
