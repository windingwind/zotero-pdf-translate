import { getString, initLocale } from "./utils/locale";
import {
  registerPrefsScripts,
  registerPrefsWindow,
} from "./modules/preferenceWindow";
import {
  registerReaderTabPanel,
  updateReaderTabPanels,
} from "./modules/tabpanel";
import {
  ReaderPopupEvent,
  buildReaderPopup,
  updateReaderPopup,
} from "./modules/popup";
import { registerNotify } from "./modules/notify";
import { registerReaderInitializer } from "./modules/reader";
import { getPref, setPref } from "./utils/prefs";
import {
  addTranslateAnnotationTask,
  addTranslateTask,
  addTranslateTitleTask,
  getLastTranslateTask,
  TranslateTask,
} from "./utils/task";
import { setDefaultPrefSettings } from "./modules/defaultPrefs";
import Addon from "./addon";
import { registerMenu } from "./modules/menu";
import { config } from "../package.json";
import { registerPrompt } from "./modules/prompt";
import { createZToolkit } from "./utils/ztoolkit";

// 要約結果の配列
let summaries: string[] = [
  "これは1番目の要約です。",
  "これは2番目の要約です。",
  "これは3番目の要約です。",
];

function registerLibraryTabPanel() {
  window.alert("registerLibraryTabPanel() 開始");
  const tabId = ztoolkit.LibraryTabPanel.register(
    "要約",
    (panel: XUL.Element, win: Window) => {
      const elem = ztoolkit.UI.createElement(win.document, "vbox", {
        children: [
          {
            tag: "h2",
            properties: {
              innerText: "要約",
            },
          },
          {
            id: "generated-summary",
            tag: "div",
            properties: {
              innerText: "ここに要約文が出力されます。",
            },
          },
        ],
      });
      panel.append(elem);
    },
    {
      targetIndex: 1,
    },
  );

  window.alert("registerLibraryTabPanel() 完了");
}

// pdf文書の全文の取得
const FullText = async () => {
  window.alert("FullText() 開始");
  const item = ZoteroPane.getSelectedItems()[0];
  const fulltext: string[] = [];
  if (item.isRegularItem()) {
    // not an attachment already
    const attachmentIDs = item.getAttachments();
    for (const id of attachmentIDs) {
      const attachment = Zotero.Items.get(id);
      if (
        attachment.attachmentContentType == "application/pdf" ||
        attachment.attachmentContentType == "text/html"
      ) {
        const text = await attachment.attachmentText;
        fulltext.push(text);
        window.alert("FullText() 完了");
        return fulltext.toString();
      }
    }
  }
};

// ChatGPT の要約結果
function GPT_summary() {
  window.alert("GPT_summary() 完了");
  return "要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。要約結果はこれです。";
}

// ChatGPT のタグ付け結果の配列
function GPT_tag() {
  window.alert("GPT_tag() 完了");
  return [
    "ChatGPTがつけたタグ1",
    "ChatGPTがつけたタグ2",
    "ChatGPTがつけたタグ3",
  ];
}

// ここに「pdfが読み込まれた時に実行される関数」を記述する
function onLoadingPdf() {
  window.alert("onLoadingPdf() 開始");
  const summary = window.document.getElementById("generated-summary");
  if (summary != null) {
    window.alert("要約・タグ付け完了!!");
    summary.innerHTML = GPT_summary();
  }
  for (const tag of GPT_tag()) {
    const items = ZoteroPane.getSelectedItems();
    items[0].addTag(tag);
  }
  window.alert("onLoadingPdf() 完了");
}

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();

  setDefaultPrefSettings();

  registerReaderInitializer();

  registerNotify(["item"]);
  await onMainWindowLoad(window);
}

async function onMainWindowLoad(win: Window): Promise<void> {
  await new Promise((resolve) => {
    if (win.document.readyState !== "complete") {
      win.document.addEventListener("readystatechange", () => {
        if (win.document.readyState === "complete") {
          resolve(void 0);
        }
      });
    }
    resolve(void 0);
  });

  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();
  registerReaderTabPanel();
  registerPrefsWindow();
  registerMenu();
  registerPrompt();
  registerLibraryTabPanel();
  onLoadingPdf();
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  delete Zotero[config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this function clear.
 */
function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  if (event === "add" && type === "item") {
    const annotationItems = Zotero.Items.get(ids as number[]).filter((item) =>
      item.isAnnotation(),
    );
    if (annotationItems.length === 0) {
      return;
    }
    if (getPref("enableComment")) {
      addon.hooks.onTranslateInBatch(
        annotationItems
          .map((item) => addTranslateAnnotationTask(item.id))
          .filter((task) => task) as TranslateTask[],
        { noDisplay: true },
      );
    }
  } else {
    return;
  }
}

function onPrefsLoad(event: Event) {
  registerPrefsScripts((event.target as any).ownerGlobal);
}

function onShortcuts(type: string) {
  switch (type) {
    case "library":
      {
        addon.hooks.onSwitchTitleColumnDisplay();
        addon.hooks.onTranslateInBatch(
          ZoteroPane.getSelectedItems(true)
            .map((id) => addTranslateTitleTask(id, true))
            .filter((task) => task) as TranslateTask[],
          { noDisplay: true },
        );
      }
      break;
    case "reader":
      {
        addon.hooks.onTranslate(undefined, {
          noCheckZoteroItemLanguage: true,
        });
      }
      break;
    default:
      break;
  }
}

async function onTranslate(): Promise<void>;
async function onTranslate(
  options: Parameters<
    Addon["data"]["translate"]["services"]["runTranslationTask"]
  >["1"],
): Promise<void>;
async function onTranslate(
  task: TranslateTask | undefined,
  options?: Parameters<
    Addon["data"]["translate"]["services"]["runTranslationTask"]
  >["1"],
): Promise<void>;
async function onTranslate(...data: any) {
  let task = undefined;
  let options = {};
  if (data.length === 1) {
    if (data[0].raw) {
      task = data[0];
    } else {
      options = data[0];
    }
  } else if (data.length === 2) {
    task = data[0];
    options = data[1];
  }
  await addon.data.translate.services.runTranslationTask(task, options);
}

async function onTranslateInBatch(
  tasks: TranslateTask[],
  options: Parameters<
    Addon["data"]["translate"]["services"]["runTranslationTask"]
  >["1"] = {},
) {
  for (const task of tasks) {
    await addon.hooks.onTranslate(task, options);
    await Zotero.Promise.delay(addon.data.translate.batchTaskDelay);
  }
}

function onReaderPopupShow(event: ReaderPopupEvent) {
  const selection = addon.data.translate.selectedText;
  const task = getLastTranslateTask();
  if (task?.raw === selection) {
    buildReaderPopup(event);
    addon.hooks.onReaderPopupRefresh();
    return;
  }
  addTranslateTask(selection, event.reader.itemID);
  buildReaderPopup(event);
  addon.hooks.onReaderPopupRefresh();
  if (getPref("enableAuto")) {
    addon.hooks.onTranslate();
  }
}

function onReaderPopupRefresh() {
  updateReaderPopup();
}

function onReaderTabPanelRefresh() {
  updateReaderTabPanels();
}

function onSwitchTitleColumnDisplay() {
  setPref(
    "titleColumnMode",
    getPref("titleColumnMode") === "raw" ? "result" : "raw",
  );
  ztoolkit.ItemTree.refresh();
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

export default {
  onStartup,
  onMainWindowLoad,
  onMainWindowUnload,
  onShutdown,
  onNotify,
  onPrefsLoad,
  onShortcuts,
  onTranslate,
  onTranslateInBatch,
  onReaderPopupShow,
  onReaderPopupRefresh,
  onReaderTabPanelRefresh,
  onSwitchTitleColumnDisplay,
};
