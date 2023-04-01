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
import {
  checkReaderAnnotationButton,
  registerReaderInitializer,
  unregisterReaderInitializer,
} from "./modules/reader";
import { getPref, setPref } from "./utils/prefs";
import {
  addTranslateAnnotationTask,
  addTranslateTask,
  addTranslateTitleTask,
  getLastTranslateTask,
  TranslateTask,
} from "./utils/translate";
import { setDefaultPrefSettings } from "./modules/defaultSettings";
import Addon from "./addon";
import { registerMenu } from "./modules/menu";
import {
  registerExtraColumns,
  registerTitleRenderer,
} from "./modules/itemTree";
import { registerShortcuts } from "./modules/shortcuts";
import { config } from "../package.json";
import { registerItemBoxExtraRows } from "./modules/itemBox";
import { registerPrompt } from "./modules/prompt";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();

  setDefaultPrefSettings();

  registerNotify(["item"]);
  registerReaderTabPanel();
  registerReaderInitializer();
  registerPrefsWindow();
  registerMenu();
  await registerExtraColumns();
  await registerItemBoxExtraRows();
  registerTitleRenderer();
  registerShortcuts();
  registerPrompt();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  unregisterReaderInitializer();
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
  extraData: { [key: string]: any }
) {
  if (event === "add" && type === "item") {
    const annotationItems = Zotero.Items.get(ids as number[]).filter((item) =>
      item.isAnnotation()
    );
    if (annotationItems.length === 0) {
      return;
    }
    checkReaderAnnotationButton(annotationItems);
    if (getPref("enableComment")) {
      addon.hooks.onTranslateInBatch(
        annotationItems
          .map((item) => addTranslateAnnotationTask(item.id))
          .filter((task) => task) as TranslateTask[],
        { noDisplay: true }
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
          { noDisplay: true }
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
  >["1"]
): Promise<void>;
async function onTranslate(
  task: TranslateTask | undefined,
  options?: Parameters<
    Addon["data"]["translate"]["services"]["runTranslationTask"]
  >["1"]
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
  >["1"] = {}
) {
  for (const task of tasks) {
    await addon.hooks.onTranslate(task, options);
    await Zotero.Promise.delay(addon.data.translate.batchTaskDelay);
  }
}

function onReaderTextSelection(readerInstance: _ZoteroTypes.ReaderInstance) {
  const selection = ztoolkit.Reader.getSelectedText(readerInstance);
  const task = getLastTranslateTask();
  if (task?.raw === selection) {
    addon.hooks.onReaderPopupBuild(readerInstance);
    addon.hooks.onReaderPopupRefresh();
    return;
  }
  addTranslateTask(selection, readerInstance.itemID);
  addon.hooks.onReaderPopupBuild(readerInstance);
  addon.hooks.onReaderPopupRefresh();
  if (getPref("enableAuto")) {
    addon.hooks.onTranslate();
  }
}

function onReaderPopupBuild(readerInstance: _ZoteroTypes.ReaderInstance) {
  buildReaderPopup(readerInstance);
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
    getPref("titleColumnMode") === "raw" ? "result" : "raw"
  );
  ztoolkit.ItemTree.refresh();
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

export default {
  onStartup,
  onShutdown,
  onNotify,
  onPrefsLoad,
  onShortcuts,
  onTranslate,
  onTranslateInBatch,
  onReaderTextSelection,
  onReaderPopupBuild,
  onReaderPopupRefresh,
  onReaderTabPanelRefresh,
  onSwitchTitleColumnDisplay,
};
