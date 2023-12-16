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
import { registerExtraColumns } from "./modules/itemTree";
import { registerShortcuts } from "./modules/shortcuts";
import { config } from "../package.json";
import { registerItemBoxExtraRows } from "./modules/itemBox";
import { registerPrompt } from "./modules/prompt";
import { createZToolkit } from "./utils/ztoolkit";
import { randomInt } from "crypto";

// 要約結果の辞書型配列
// * idを指定するとその論文の要約を返す
const summaries: { [id: number]: string } = {};

function registerLibraryTabPanel() {
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
}

// pdf文書の全文の取得
const FullText = async () => {
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
        return fulltext.toString();
      }
    }
  }
};

// ChatGPT の要約結果
function GPT_summary() {
  return "要約結果" + Math.random();
}

// ChatGPT のタグ付け結果の配列
function GPT_tag() {
  return [
    "ChatGPTがつけたタグ1",
    "ChatGPTがつけたタグ2",
    "ChatGPTがつけたタグ3",
  ];
}

// ここに「pdfが読み込まれた時に実行される関数」を記述する
function onLoadingPdf() {
  const item = ZoteroPane.getSelectedItems()[0];

  window.alert("要約とタグの自動作成を開始");

  if (item == undefined) {
    window.alert("論文が選択されていません。");
  }
  summaries[item.id] = GPT_summary();

  window.alert(
    "論文: " +
      item.getDisplayTitle() +
      "\nid: " +
      item.id +
      " に\n要約: " +
      summaries[item.id].slice(0, 10) +
      "... を追加",
  );

  const summary = window.document.getElementById("generated-summary");
  if (summary != null) {
    summary.innerHTML = summaries[item.id];
  }
  for (const tag of GPT_tag()) {
    item.addTag(tag);

    window.alert(
      "論文: " +
        item.getDisplayTitle() +
        "\nid: " +
        item.id +
        " に\nタグ: " +
        tag +
        " を追加",
    );
  }
}

// ここに「論文を選択したときに実行される関数」を記述する
function onSelectedItem() {}

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

// Zoteroの起動時
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
  await registerExtraColumns();
  await registerItemBoxExtraRows();
  registerShortcuts();
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
