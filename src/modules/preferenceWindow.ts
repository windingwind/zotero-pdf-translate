import { config, homepage } from "../../package.json";
import { LANG_CODE } from "../utils/config";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import {
  getServiceSecret,
  setServiceSecret,
  validateServiceSecret,
} from "../utils/secret";
import { createServiceSettingsDialog } from "../utils";
import { setDefaultPrefSettings } from "./defaultPrefs";
import { services } from "./services";

export function registerPrefsWindow() {
  Zotero.PreferencePanes.register({
    pluginID: config.addonID,
    src: rootURI + "chrome/content/preferences.xhtml",
    label: getString("pref-title"),
    image: `chrome://${config.addonRef}/content/icons/favicon.png`,
    helpURL: homepage,
  });
}

export function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  addon.data.prefs.window = _window;
  buildPrefsPane();
  updatePrefsPaneDefault();
}

function buildPrefsPane() {
  const doc = addon.data.prefs.window?.document;
  if (!doc) {
    return;
  }

  // menus
  ztoolkit.UI.replaceElement(
    {
      tag: "menulist",
      id: makeId("sentenceServices"),
      attributes: {
        value: getPref("translateSource") as string,
        native: "true",
      },
      listeners: [
        {
          type: "command",
          listener: (e: Event) => {
            onPrefsEvents("setSentenceService");
          },
        },
      ],
      children: [
        {
          tag: "menupopup",
          children: services.getAllServicesWithType("sentence").map((s) => ({
            tag: "menuitem",
            attributes: {
              label: services.getServiceNameByID(s.id),
              value: s.id,
            },
          })),
        },
      ],
    },
    doc.querySelector(`#${makeId("sentenceServices-placeholder")}`)!,
  );

  ztoolkit.UI.replaceElement(
    {
      tag: "menulist",
      id: makeId("wordServices"),
      attributes: {
        value: getPref("dictSource") as string,
        native: "true",
      },
      classList: ["use-word-service"],
      listeners: [
        {
          type: "command",
          listener: (e: Event) => {
            onPrefsEvents("setWordService");
          },
        },
      ],
      children: [
        {
          tag: "menupopup",
          children: services.getAllServicesWithType("word").map((s) => ({
            tag: "menuitem",
            attributes: {
              label: services.getServiceNameByID(s.id),
              value: s.id,
            },
          })),
        },
      ],
    },
    doc.querySelector(`#${makeId("wordServices-placeholder")}`)!,
  );

  ztoolkit.UI.replaceElement(
    {
      tag: "menulist",
      id: makeId("langfrom"),
      attributes: {
        value: getPref("sourceLanguage") as string,
        native: "true",
      },
      listeners: [
        {
          type: "command",
          listener: (e: Event) => {
            onPrefsEvents("setSourceLanguage");
          },
        },
      ],
      styles: {
        maxWidth: "250px",
      },
      children: [
        {
          tag: "menupopup",
          children: LANG_CODE.map((lang) => ({
            tag: "menuitem",
            attributes: {
              label: lang.name,
              value: lang.code,
            },
          })),
        },
      ],
    },
    doc.querySelector(`#${makeId("langfrom-placeholder")}`)!,
  );

  ztoolkit.UI.replaceElement(
    {
      tag: "menulist",
      id: makeId("langto"),
      attributes: {
        value: getPref("targetLanguage") as string,
        native: "true",
      },
      listeners: [
        {
          type: "command",
          listener: (e: Event) => {
            onPrefsEvents("setTargetLanguage");
          },
        },
      ],
      styles: {
        maxWidth: "250px",
      },
      children: [
        {
          tag: "menupopup",
          children: LANG_CODE.map((lang) => ({
            tag: "menuitem",
            attributes: {
              label: lang.name,
              value: lang.code,
            },
          })),
        },
      ],
    },
    doc.querySelector(`#${makeId("langto-placeholder")}`)!,
  );

  doc
    .querySelector(`#${makeId("manageKeys")}`)
    ?.addEventListener("command", (e: Event) => {
      onPrefsEvents("manageKeys");
    });
  doc
    .querySelector(`#${makeId("renameServices")}`)
    ?.addEventListener("command", (e: Event) => {
      onPrefsEvents("renameServices");
    });

  doc
    .querySelector(`#${makeId("enableAuto")}`)
    ?.addEventListener("command", (e: Event) => {
      onPrefsEvents("setAutoTranslateSelection");
    });

  doc
    .querySelector(`#${makeId("enableComment")}`)
    ?.addEventListener("command", (e: Event) => {
      onPrefsEvents("setAutoTranslateAnnotation");
    });

  doc
    .querySelector(`#${makeId("annotationTranslationPosition")}`)
    ?.addEventListener("command", (e: Event) => {
      onPrefsEvents("setAnnotationTranslationPosition");
    });

  doc
    .querySelector(`#${makeId("enablePopup")}`)
    ?.addEventListener("command", (e: Event) => {
      onPrefsEvents("setEnablePopup");
    });

  doc
    .querySelector(`#${makeId("enableAddToNote")}`)
    ?.addEventListener("command", (e: Event) => {
      onPrefsEvents("setEnableAddToNote");
    });

  doc
    .querySelector(`#${makeId("showPlayBtn")}`)
    ?.addEventListener("command", (e: Event) => {
      onPrefsEvents("setShowPlayBtn");
    });

  doc
    .querySelector(`#${makeId("useWordService")}`)
    ?.addEventListener("command", (e: Event) => {
      onPrefsEvents("setUseWordService");
    });

  doc
    .querySelector(`#${makeId("hideUnconfiguredServices")}`)
    ?.addEventListener("command", () => {
      addon.hooks.onReaderTabPanelRefresh();
    });

  doc
    .querySelector(`#${makeId("sentenceServicesSecret")}`)
    ?.addEventListener("blur", (e: Event) => {
      onPrefsEvents("updateSentenceSecret");
    });

  doc
    .querySelector(`#${makeId("wordServicesSecret")}`)
    ?.addEventListener("blur", (e: Event) => {
      onPrefsEvents("updateWordSecret");
    });

  doc
    .querySelector(`#${makeId("fontSize")}`)
    ?.addEventListener("input", (e: Event) => {
      onPrefsEvents("updateFontSize");
    });

  doc
    .querySelector(`#${makeId("lineHeight")}`)
    ?.addEventListener("input", (e: Event) => {
      onPrefsEvents("updatelineHeight");
    });

  doc
    .querySelector(`#${makeId("reset-titleTranslation")}`)
    ?.addEventListener("command", (e: Event) => {
      ztoolkit
        .getGlobal("ZoteroPane")
        .getSelectedItems()
        .forEach((item) => {
          ztoolkit.ExtraField.setExtraField(item, "titleTranslation", "");
        });
    });

  doc
    .querySelector(`#${makeId("reset-abstractTranslation")}`)
    ?.addEventListener("command", (e: Event) => {
      ztoolkit
        .getGlobal("ZoteroPane")
        .getSelectedItems()
        .forEach((item) => {
          ztoolkit.ExtraField.setExtraField(item, "abstractTranslation", "");
        });
    });

  doc
    .querySelector(`#${makeId("backup-pluginData")}`)
    ?.addEventListener("command", () => {
      onPrefsEvents("backupPluginData");
    });

  doc
    .querySelector(`#${makeId("restore-pluginData")}`)
    ?.addEventListener("command", () => {
      onPrefsEvents("restorePluginData");
    });

  doc
    .querySelector(`#${makeId("reset-pluginData")}`)
    ?.addEventListener("command", () => {
      onPrefsEvents("resetPluginData");
    });

  doc
    .querySelector(`#${makeId("enableAutoTagAnnotation")}`)
    ?.addEventListener("command", (e: Event) => {
      onPrefsEvents("setEnableAutoTagAnnotation");
    });
}

function updatePrefsPaneDefault() {
  onPrefsEvents("setAutoTranslateAnnotation", false);
  onPrefsEvents("setAnnotationTranslationPosition", false);
  onPrefsEvents("setEnablePopup", false);
  onPrefsEvents("setShowPlayBtn", false);
  onPrefsEvents("setUseWordService", false);
  onPrefsEvents("setSentenceSecret", false);
  onPrefsEvents("setWordSecret", false);
  onPrefsEvents("setEnableAutoTagAnnotation", false);
}

function onPrefsEvents(type: string, fromElement: boolean = true) {
  const doc = addon.data.prefs.window?.document;
  if (!doc) {
    return;
  }

  const setDisabled = (className: string, disabled: boolean) => {
    doc
      .querySelectorAll(`.${className}`)
      .forEach(
        (elem) => ((elem as XUL.Element & XUL.IDisabled).disabled = disabled),
      );
  };
  switch (type) {
    case "setAutoTranslateSelection":
      addon.hooks.onReaderTabPanelRefresh();
      break;
    case "setAutoTranslateAnnotation":
      {
        addon.hooks.onReaderTabPanelRefresh();
      }
      break;
    case "setAnnotationTranslationPosition":
      {
        const elemValue = fromElement
          ? (
              doc.querySelector(
                `#${makeId("annotationTranslationPosition")}`,
              ) as XUL.Element
            ).getAttribute("value")
          : (getPref("annotationTranslationPosition") as string);
        const hidden = elemValue !== "body";
        setDisabled("annotation-translation-position-in-body", hidden);
      }
      break;
    case "setEnablePopup":
      {
        const elemValue = fromElement
          ? (doc.querySelector(`#${makeId("enablePopup")}`) as XUL.Checkbox)
              .checked
          : (getPref("enablePopup") as boolean);
        const hidden = !elemValue;
        setDisabled("enable-popup", hidden);
        if (!hidden) {
          onPrefsEvents("setEnableAddToNote", fromElement);
        }
      }
      break;
    case "setEnableAddToNote":
      {
        const elemValue = fromElement
          ? (doc.querySelector(`#${makeId("enableAddToNote")}`) as XUL.Checkbox)
              .checked
          : (getPref("enableNote") as boolean);
        const hidden = !elemValue;
        setDisabled("enable-popup-addtonote", hidden);
      }
      break;
    case "setShowPlayBtn":
      {
        const elemValue = fromElement
          ? (doc.querySelector(`#${makeId("showPlayBtn")}`) as XUL.Checkbox)
              .checked
          : (getPref("showPlayBtn") as boolean);
        const hidden = !elemValue;
        setDisabled("show-play-btn", hidden);
      }
      break;
    case "setUseWordService":
      {
        const elemValue = fromElement
          ? (doc.querySelector(`#${makeId("useWordService")}`) as XUL.Checkbox)
              .checked
          : (getPref("enableDict") as boolean);
        const hidden = !elemValue;
        setDisabled("use-word-service", hidden);
        if (!hidden) {
          onPrefsEvents("setShowPlayBtn", fromElement);
        }
      }
      break;
    case "setEnableAutoTagAnnotation":
      {
        const elemValue = fromElement
          ? (
              doc.querySelector(
                `#${makeId("enableAutoTagAnnotation")}`,
              ) as XUL.Checkbox
            ).checked
          : (getPref("enableAutoTagAnnotation") as boolean);
        const hidden = !elemValue;
        setDisabled("enable-auto-tag-annotation", hidden);
      }
      break;
    case "setSentenceService":
      {
        setPref(
          "translateSource",
          (
            doc.querySelector(`#${makeId("sentenceServices")}`) as XUL.MenuList
          ).getAttribute("value")!,
        );
        onPrefsEvents("setSentenceSecret", fromElement);
        addon.hooks.onReaderTabPanelRefresh();
      }
      break;
    case "updateSentenceSecret":
      {
        const serviceId = getPref("translateSource") as string;
        const inputElem = doc.querySelector(
          `#${makeId("sentenceServicesSecret")}`,
        ) as HTMLInputElement;
        const trimmedValue = inputElem.value.trim();
        if (trimmedValue !== inputElem.value) {
          setServiceSecret(serviceId, trimmedValue);
          inputElem.value = trimmedValue;
        }
      }
      break;
    case "setSentenceSecret":
      {
        const serviceId = getPref("translateSource") as string;
        const secretCheckResult = validateServiceSecret(
          serviceId,
          (validateResult) => {
            if (fromElement && !validateResult.status) {
              addon.data.prefs.window?.alert(
                `You see this because the translation service ${serviceId} requires SECRET, which is NOT correctly set.\n\nDetails:\n${validateResult.info}`,
              );
            }
          },
        );
        (
          doc.querySelector(
            `#${makeId("sentenceServicesSecret")}`,
          ) as HTMLInputElement
        ).value = secretCheckResult.secret;

        // Update secret status button
        const statusButton = doc.querySelector(
          `#${makeId("sentenceServicesStatus")}`,
        ) as XUL.Button;
        const service =
          addon.data.translate.services.getServiceById(serviceId)!;
        if (service.config) {
          statusButton.hidden = false;
          statusButton.label = getString("service-dialog-config");
          statusButton.onclick = (ev) => {
            createServiceSettingsDialog(service);
          };
        } else {
          statusButton.hidden = true;
        }
      }
      break;
    case "setWordService":
      {
        setPref(
          "dictSource",
          (
            doc.querySelector(`#${makeId("wordServices")}`) as XUL.MenuList
          ).getAttribute("value")!,
        );
        onPrefsEvents("setWordSecret", fromElement);
      }
      break;
    case "updateWordSecret":
      {
        const serviceId = getPref("dictSource") as string;
        const inputElem = doc.querySelector(
          `#${makeId("wordServicesSecret")}`,
        ) as HTMLInputElement;
        const trimmedValue = inputElem.value.trim();
        if (trimmedValue !== inputElem.value) {
          setServiceSecret(serviceId, trimmedValue);
          inputElem.value = trimmedValue;
        }
      }
      break;
    case "setWordSecret":
      {
        const serviceId = getPref("dictSource") as string;
        const secretCheckResult = validateServiceSecret(
          serviceId,
          (validateResult) => {
            if (fromElement && !validateResult.status) {
              addon.data.prefs.window?.alert(
                `You see this because the translation service ${serviceId} requires SECRET, which is NOT correctly set.\n\nDetails:\n${validateResult.info}`,
              );
            }
          },
        );
        (
          doc.querySelector(
            `#${makeId("wordServicesSecret")}`,
          ) as HTMLInputElement
        ).value = secretCheckResult.secret;
      }
      break;
    case "setSourceLanguage":
      {
        setPref(
          "sourceLanguage",
          (
            doc.querySelector(`#${makeId("langfrom")}`) as XUL.MenuList
          ).getAttribute("value")!,
        );
        addon.hooks.onReaderTabPanelRefresh();
      }
      break;
    case "setTargetLanguage":
      {
        setPref(
          "targetLanguage",
          (
            doc.querySelector(`#${makeId("langto")}`) as XUL.MenuList
          ).getAttribute("value")!,
        );
        addon.hooks.onReaderTabPanelRefresh();
      }
      break;
    case "updateFontSize":
      addon.api.getTemporaryRefreshHandler()();
      break;
    case "updatelineHeight":
      addon.api.getTemporaryRefreshHandler()();
      break;
    case "manageKeys":
      {
        import("../modules/settings/manageKeys").then(
          ({ manageKeysDialog }) => {
            manageKeysDialog();
          },
        );
      }
      break;
    case "renameServices":
      {
        import("../modules/settings/renameServices").then(
          ({ renameServicesDialog }) => {
            renameServicesDialog();
          },
        );
      }
      break;
    case "backupPluginData":
      {
        void backupPluginData();
      }
      break;
    case "restorePluginData":
      {
        void restorePluginData();
      }
      break;
    case "resetPluginData":
      {
        void resetPluginData();
      }
      break;
    default:
      return;
  }
}

function makeId(type: string) {
  return `${config.addonRef}-${type}`;
}

type PrefValue = string | number | boolean;
type PluginPrefsSnapshot = Record<string, PrefValue>;
type ItemTranslationSnapshot = {
  libraryID: number;
  key: string;
  titleTranslation?: string;
  abstractTranslation?: string;
};

const PREF_STRING = Services.prefs.PREF_STRING;
const PREF_INT = Services.prefs.PREF_INT;
const PREF_BOOL = Services.prefs.PREF_BOOL;
const EXCLUDED_BACKUP_PREF_KEYS = new Set([
  // UI cache/state
  "popupWidth",
  "popupHeight",
  "customRawRatio",
  "customResultRatio",
  // Runtime cache for NiuTrans account resources
  "niutransDictLibList",
  "niutransMemoryLibList",
]);

function getPromptParent() {
  return (addon.data.prefs.window || ztoolkit.getGlobal("window")) as any;
}

function showPromptAlert(message: string) {
  Services.prompt.alert(
    getPromptParent(),
    getString("pluginData-dialog-title"),
    message,
  );
}

function showPromptConfirm(message: string) {
  return Services.prompt.confirm(
    getPromptParent(),
    getString("pluginData-dialog-title"),
    message,
  );
}

function showPromptConfirmWithCheck(
  message: string,
  checkMessage: string,
  defaultChecked = false,
) {
  const checkState = {
    value: defaultChecked,
  };
  const confirmed = Services.prompt.confirmCheck(
    getPromptParent(),
    getString("pluginData-dialog-title"),
    message,
    checkMessage,
    checkState as any,
  );
  return {
    confirmed,
    checked: !!checkState.value,
  };
}

function getPluginPrefBranch() {
  return Services.prefs.getBranch(`${config.prefsPrefix}.`);
}

function shouldExcludeFromBackup(key: string) {
  if (EXCLUDED_BACKUP_PREF_KEYS.has(key)) {
    return true;
  }
  return key.toLowerCase().includes("cache");
}

function listPluginPrefKeys() {
  return getPluginPrefBranch().getChildList("").sort();
}

function readPluginPrefSnapshot(): PluginPrefsSnapshot {
  const branch = getPluginPrefBranch();
  const snapshot: PluginPrefsSnapshot = {};
  for (const key of listPluginPrefKeys()) {
    if (shouldExcludeFromBackup(key)) {
      continue;
    }
    const prefType = branch.getPrefType(key);
    switch (prefType) {
      case PREF_STRING:
        snapshot[key] = branch.getStringPref(key);
        break;
      case PREF_INT:
        snapshot[key] = branch.getIntPref(key);
        break;
      case PREF_BOOL:
        snapshot[key] = branch.getBoolPref(key);
        break;
      default:
        break;
    }
  }
  return snapshot;
}

async function readItemTranslationSnapshot() {
  const snapshot: ItemTranslationSnapshot[] = [];
  for (const library of Zotero.Libraries.getAll()) {
    const items = await Zotero.Items.getAll(library.libraryID);
    for (const item of items) {
      if (!item?.isRegularItem?.()) {
        continue;
      }
      const titleTranslation =
        (ztoolkit.ExtraField.getExtraField(
          item,
          "titleTranslation",
        ) as string) || "";
      const abstractTranslation =
        (ztoolkit.ExtraField.getExtraField(
          item,
          "abstractTranslation",
        ) as string) || "";
      if (!titleTranslation && !abstractTranslation) {
        continue;
      }
      snapshot.push({
        libraryID: item.libraryID,
        key: item.key,
        ...(titleTranslation ? { titleTranslation } : {}),
        ...(abstractTranslation ? { abstractTranslation } : {}),
      });
    }
  }
  return snapshot;
}

function clearPluginUserPrefs() {
  const branch = getPluginPrefBranch();
  for (const key of listPluginPrefKeys()) {
    if (branch.prefHasUserValue(key)) {
      branch.clearUserPref(key);
    }
  }
}

function syncPrefsPaneFromPrefs() {
  const doc = addon.data.prefs.window?.document;
  if (!doc) {
    return;
  }

  const setMenuValue = (id: string, value: string) => {
    const menu = doc.querySelector(`#${makeId(id)}`) as XUL.MenuList | null;
    if (!menu) {
      return;
    }
    menu.value = value;
    menu.setAttribute("value", value);
  };

  setMenuValue("sentenceServices", getPref("translateSource") as string);
  setMenuValue("wordServices", getPref("dictSource") as string);
  setMenuValue("langfrom", getPref("sourceLanguage") as string);
  setMenuValue("langto", getPref("targetLanguage") as string);

  updatePrefsPaneDefault();
  onPrefsEvents("setSentenceSecret", false);
  onPrefsEvents("setWordSecret", false);
}

function readBackupPrefs(raw: unknown): PluginPrefsSnapshot {
  const rawPrefs =
    raw && typeof raw === "object" && "prefs" in raw
      ? (raw as Record<string, unknown>).prefs
      : raw;

  if (!rawPrefs || typeof rawPrefs !== "object" || Array.isArray(rawPrefs)) {
    throw new Error("Invalid backup format");
  }

  const prefs: PluginPrefsSnapshot = {};
  for (const [key, value] of Object.entries(
    rawPrefs as Record<string, unknown>,
  )) {
    if (shouldExcludeFromBackup(key)) {
      continue;
    }
    if (typeof value === "string" || typeof value === "boolean") {
      prefs[key] = value;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      prefs[key] = value;
      continue;
    }
    throw new Error(`Invalid value type for pref "${key}"`);
  }

  return prefs;
}

function readBackupItemTranslations(raw: unknown) {
  const backupObj = raw as Record<string, unknown>;
  const data = backupObj?.itemTranslations;
  if (!data) {
    return [] as ItemTranslationSnapshot[];
  }
  if (!Array.isArray(data)) {
    throw new Error("Invalid itemTranslations format");
  }

  const snapshots: ItemTranslationSnapshot[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (typeof row.libraryID !== "number" || !Number.isFinite(row.libraryID)) {
      continue;
    }
    if (typeof row.key !== "string" || !row.key.trim()) {
      continue;
    }
    const titleTranslation =
      typeof row.titleTranslation === "string"
        ? row.titleTranslation
        : undefined;
    const abstractTranslation =
      typeof row.abstractTranslation === "string"
        ? row.abstractTranslation
        : undefined;
    if (!titleTranslation && !abstractTranslation) {
      continue;
    }
    snapshots.push({
      libraryID: row.libraryID,
      key: row.key,
      ...(titleTranslation ? { titleTranslation } : {}),
      ...(abstractTranslation ? { abstractTranslation } : {}),
    });
  }
  return snapshots;
}

async function applyItemTranslations(snapshots: ItemTranslationSnapshot[]) {
  for (const row of snapshots) {
    const item = Zotero.Items.getByLibraryAndKey(row.libraryID, row.key) as
      | Zotero.Item
      | false;
    if (!item || !item.isRegularItem()) {
      continue;
    }

    if (typeof row.titleTranslation === "string") {
      ztoolkit.ExtraField.setExtraField(
        item,
        "titleTranslation",
        row.titleTranslation,
      );
    }
    if (typeof row.abstractTranslation === "string") {
      ztoolkit.ExtraField.setExtraField(
        item,
        "abstractTranslation",
        row.abstractTranslation,
      );
    }
    await item.saveTx();
  }
}

async function clearAllItemTranslations() {
  for (const library of Zotero.Libraries.getAll()) {
    const items = await Zotero.Items.getAll(library.libraryID);
    for (const item of items) {
      if (!item?.isRegularItem?.()) {
        continue;
      }
      const titleTranslation =
        (ztoolkit.ExtraField.getExtraField(
          item,
          "titleTranslation",
        ) as string) || "";
      const abstractTranslation =
        (ztoolkit.ExtraField.getExtraField(
          item,
          "abstractTranslation",
        ) as string) || "";
      if (!titleTranslation && !abstractTranslation) {
        continue;
      }
      ztoolkit.ExtraField.setExtraField(item, "titleTranslation", "");
      ztoolkit.ExtraField.setExtraField(item, "abstractTranslation", "");
      await item.saveTx();
    }
  }
}

function getFilePathFromPickerResult(file: unknown) {
  if (!file) {
    return "";
  }
  if (typeof file === "string") {
    return file;
  }
  if (typeof file === "object" && "path" in file) {
    const path = (file as { path?: unknown }).path;
    if (typeof path === "string") {
      return path;
    }
  }
  return "";
}

async function pickJsonFile(
  mode: "open" | "save",
  title: string,
  defaultName = "",
) {
  const Backend = ChromeUtils.importESModule(
    "chrome://zotero/content/modules/filePicker.mjs",
  ) as { FilePicker: new () => any };
  const fp = new Backend.FilePicker();
  fp.init(
    addon.data.prefs.window || ztoolkit.getGlobal("window"),
    title,
    mode === "open" ? fp.modeOpen : fp.modeSave,
  );
  fp.appendFilter("*.json", "*.json");
  fp.appendFilters(fp.filterAll);
  if (mode === "save") {
    fp.defaultString = defaultName;
    fp.defaultExtension = "json";
  }
  const result = await fp.show();
  if (result !== fp.returnOK && result !== fp.returnReplace) {
    return "";
  }
  return getFilePathFromPickerResult(fp.file);
}

async function backupPluginData() {
  try {
    const itemTranslations = await readItemTranslationSnapshot();
    const backup = {
      schemaVersion: 1,
      addonID: config.addonID,
      exportedAt: new Date().toISOString(),
      prefs: readPluginPrefSnapshot(),
      itemTranslations,
    };
    const json = JSON.stringify(backup, null, 2);
    const timeTag = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await pickJsonFile(
      "save",
      getString("pluginData-export-title"),
      `zotero-pdf-translate-backup-${timeTag}.json`,
    );
    if (!path) {
      return;
    }
    await IOUtils.writeUTF8(path, json);
    showPromptAlert(getString("pluginData-backup-saved", { args: { path } }));
  } catch (e) {
    showPromptAlert(
      getString("pluginData-backup-failed", {
        args: { reason: e instanceof Error ? e.message : String(e) },
      }),
    );
  }
}

async function restorePluginData() {
  try {
    const path = await pickJsonFile(
      "open",
      getString("pluginData-import-title"),
    );
    if (!path) {
      return;
    }
    const payload = await IOUtils.readUTF8(path);
    if (!payload.trim()) {
      throw new Error(getString("pluginData-file-empty"));
    }
    const parsed = JSON.parse(payload) as {
      addonID?: string;
    };
    if (parsed.addonID && parsed.addonID !== config.addonID) {
      const confirmed = showPromptConfirm(
        getString("pluginData-addon-mismatch", {
          args: { addonID: parsed.addonID },
        }),
      );
      if (!confirmed) {
        return;
      }
    }

    const prefs = readBackupPrefs(parsed);
    const itemTranslations = readBackupItemTranslations(parsed);
    let overwriteItemTranslations = false;
    if (itemTranslations.length > 0) {
      const choice = showPromptConfirmWithCheck(
        getString("pluginData-restore-confirm"),
        getString("pluginData-restore-overwrite-check"),
        false,
      );
      if (!choice.confirmed) {
        return;
      }
      overwriteItemTranslations = choice.checked;
    } else {
      const confirmed = showPromptConfirm(
        getString("pluginData-restore-confirm"),
      );
      if (!confirmed) {
        return;
      }
    }

    clearPluginUserPrefs();
    for (const [key, value] of Object.entries(prefs)) {
      setPref(key, value);
    }
    if (overwriteItemTranslations) {
      await applyItemTranslations(itemTranslations);
    }
    setDefaultPrefSettings();
    syncPrefsPaneFromPrefs();
    addon.api.getTemporaryRefreshHandler()();
    showPromptAlert(
      getString("pluginData-restore-success", { args: { path } }),
    );
  } catch (e) {
    showPromptAlert(
      getString("pluginData-restore-failed", {
        args: { reason: e instanceof Error ? e.message : String(e) },
      }),
    );
  }
}

async function resetPluginData() {
  const choice = showPromptConfirmWithCheck(
    getString("pluginData-reset-confirm"),
    getString("pluginData-reset-clearTranslations-check"),
    false,
  );
  if (!choice.confirmed) {
    return;
  }

  try {
    clearPluginUserPrefs();
    setDefaultPrefSettings();
    if (choice.checked) {
      await clearAllItemTranslations();
    }
    syncPrefsPaneFromPrefs();
    addon.api.getTemporaryRefreshHandler()();
    showPromptAlert(getString("pluginData-reset-success"));
  } catch (e) {
    showPromptAlert(
      getString("pluginData-reset-failed", {
        args: { reason: e instanceof Error ? e.message : String(e) },
      }),
    );
  }
}
