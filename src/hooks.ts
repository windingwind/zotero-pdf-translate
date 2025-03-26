import { config } from "../package.json";
import { initLocale } from "./utils/locale";
import {
  registerPrefsScripts,
  registerPrefsWindow,
} from "./modules/preferenceWindow";
import {
  registerReaderTabPanel,
  updateReaderTabPanels,
} from "./modules/tabpanel";
import { buildReaderPopup, updateReaderPopup } from "./modules/popup";
import { registerNotify } from "./modules/notify";
import { registerReaderInitializer } from "./modules/reader";
import { getPref } from "./utils/prefs";
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
import { registerItemPaneInfoRows } from "./modules/infoBox";
import { registerPrompt } from "./modules/prompt";
import { registerCustomFields } from "./modules/fields";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  // TODO: Remove this after zotero#3387 is merged
  if (__env__ === "development") {
    // Keep in sync with the scripts/startup.mjs
    const loadDevToolWhen = `Plugin ${config.addonID} startup`;
    ztoolkit.log(loadDevToolWhen);
  }

  initLocale();

  setDefaultPrefSettings();

  registerCustomFields();

  registerReaderInitializer();

  registerShortcuts();

  registerNotify(["item"]);

  registerPrefsWindow();

  registerExtraColumns();

  registerItemPaneInfoRows();

  registerReaderTabPanel();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );
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

  Services.scriptloader.loadSubScript(
    `chrome://${config.addonRef}/content/scripts/customElements.js`,
    win,
  );

  (win as any).MozXULElement.insertFTLIfNeeded(
    `${config.addonRef}-mainWindow.ftl`,
  );

  registerMenu();
  registerPrompt();

  win.document.addEventListener("focusout", () => {
    addon.data.translate.concatKey = false;
  });
}

async function onMainWindowUnload(win: Window): Promise<void> {
  win.document
    .querySelector(`[href="${config.addonRef}-mainWindow.ftl"]`)
    ?.remove();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  // @ts-ignore - Plugin instance is not typed
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
    if (extraData?.skipAutoSync) return;
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
  } else if (type === "tab" && ["select", "add", "close"].includes(event)) {
    addon.data.translate.concatKey = false;
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
        addon.hooks.onTranslateInBatch(
          Zotero.getActiveZoteroPane()
            .getSelectedItems(true)
            .map((id) => addTranslateTitleTask(id, true))
            .filter((task) => task) as TranslateTask[],
          { noDisplay: true, noCache: true },
        );
      }
      break;
    case "reader":
      {
        addon.hooks.onTranslate(undefined, {
          noCheckZoteroItemLanguage: true,
          noCache: true,
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

function onReaderPopupShow(
  event: _ZoteroTypes.Reader.EventParams<"renderTextSelectionPopup">,
) {
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
};
