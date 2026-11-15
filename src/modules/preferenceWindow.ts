import { config, homepage } from "../../package.json";
import { LANG_CODE } from "../utils/config";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import {
  getServiceSecret,
  setServiceSecret,
  validateServiceSecret,
} from "../utils/secret";
import { createServiceSettingsDialog, getActiveTextTask } from "../utils";
import {
  getMenuValue,
  SECOND_PASS_OFF,
  menuValueToServiceId,
  selectMenuValue,
  serviceIdToMenuValue,
} from "../utils/secondPass";
import { services } from "./services";

let prefsUpdatingMenus = false;

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

  const sentenceServices = services.getAllServicesWithType("sentence");
  const applySecondPassService = (force: boolean) => {
    if (prefsUpdatingMenus) {
      return;
    }
    const menu = doc.querySelector(
      `#${makeId("secondPassService")}`,
    ) as XUL.MenuList;
    if (!menu) {
      return;
    }
    const menuValue = getMenuValue(menu);
    const serviceId = menuValueToServiceId(menuValue);
    prefsUpdatingMenus = true;
    try {
      selectMenuValue(menu, serviceIdToMenuValue(serviceId));
    } finally {
      prefsUpdatingMenus = false;
    }
    const currentTask = getActiveTextTask();
    const activeSecondPass = currentTask?.secondPass;
    const alreadyActive =
      !!serviceId &&
      activeSecondPass?.service === serviceId &&
      (activeSecondPass.status === "success" ||
        activeSecondPass.status === "processing");
    if (
      !force &&
      serviceId === (getPref("secondPassService") as string) &&
      (alreadyActive || !currentTask)
    ) {
      return;
    }
    setPref("secondPassService", serviceId);
    addon.hooks.onReaderTabPanelRefresh();
    if (serviceId) {
      services.rerunSecondPass(currentTask);
    } else {
      currentTask?.secondPass?.cancel?.();
      if (currentTask?.secondPass?.status === "processing") {
        currentTask.secondPass = undefined;
      }
    }
  };
  ztoolkit.UI.replaceElement(
    {
      tag: "menulist",
      id: makeId("secondPassService"),
      attributes: {
        value: serviceIdToMenuValue(getPref("secondPassService") as string),
        native: "true",
      },
      listeners: [
        {
          type: "command",
          listener: () => applySecondPassService(true),
        },
      ],
      styles: {
        maxWidth: "250px",
      },
      children: [
        {
          tag: "menupopup",
          children: [
            {
              tag: "menuitem",
              attributes: {
                label: "",
                value: SECOND_PASS_OFF,
              },
            },
            ...sentenceServices.map((service) => ({
              tag: "menuitem",
              attributes: {
                label: services.getServiceNameByID(service.id),
                value: service.id,
              },
            })),
          ],
        },
      ],
    },
    doc.querySelector(`#${makeId("secondPassService-placeholder")}`)!,
  );
  // The value attribute is set before the items exist; restore it explicitly
  // so the blank "disabled" option is selected reliably.
  const secondPassMenu = doc.querySelector(
    `#${makeId("secondPassService")}`,
  ) as XUL.MenuList;
  if (secondPassMenu) {
    prefsUpdatingMenus = true;
    try {
      selectMenuValue(
        secondPassMenu,
        serviceIdToMenuValue(getPref("secondPassService") as string),
      );
    } finally {
      prefsUpdatingMenus = false;
    }
    secondPassMenu
      .querySelector("menupopup")
      ?.addEventListener("popuphidden", () => applySecondPassService(false));
  }

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
  // The value attributes are applied before the menu items exist; select the
  // matching items explicitly so the closed menulists show the real value.
  prefsUpdatingMenus = true;
  try {
    selectMenuValue(
      doc.querySelector(`#${makeId("sentenceServices")}`) as XUL.MenuList,
      getPref("translateSource") as string,
    );
    selectMenuValue(
      doc.querySelector(`#${makeId("wordServices")}`) as XUL.MenuList,
      getPref("dictSource") as string,
    );
    selectMenuValue(
      doc.querySelector(`#${makeId("langfrom")}`) as XUL.MenuList,
      getPref("sourceLanguage") as string,
    );
    selectMenuValue(
      doc.querySelector(`#${makeId("langto")}`) as XUL.MenuList,
      getPref("targetLanguage") as string,
    );
  } finally {
    prefsUpdatingMenus = false;
  }

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
  if (!doc || prefsUpdatingMenus) {
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
        const serviceId = getMenuValue(
          doc.querySelector(`#${makeId("sentenceServices")}`) as XUL.MenuList,
        );
        if (!serviceId) {
          break;
        }
        setPref("translateSource", serviceId);
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
          inputElem.value = trimmedValue;
        }
        if (trimmedValue !== getServiceSecret(serviceId)) {
          setServiceSecret(serviceId, trimmedValue);
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
        const serviceId = getMenuValue(
          doc.querySelector(`#${makeId("wordServices")}`) as XUL.MenuList,
        );
        if (!serviceId) {
          break;
        }
        setPref("dictSource", serviceId);
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
          inputElem.value = trimmedValue;
        }
        if (trimmedValue !== getServiceSecret(serviceId)) {
          setServiceSecret(serviceId, trimmedValue);
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
        const language = getMenuValue(
          doc.querySelector(`#${makeId("langfrom")}`) as XUL.MenuList,
        );
        if (!language) {
          break;
        }
        setPref("sourceLanguage", language);
        addon.hooks.onReaderTabPanelRefresh();
      }
      break;
    case "setTargetLanguage":
      {
        const language = getMenuValue(
          doc.querySelector(`#${makeId("langto")}`) as XUL.MenuList,
        );
        if (!language) {
          break;
        }
        setPref("targetLanguage", language);
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
    default:
      return;
  }
}

function makeId(type: string) {
  return `${config.addonRef}-${type}`;
}
