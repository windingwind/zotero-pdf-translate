import { config } from "../../package.json";
import { getService, LANG_CODE, SERVICES } from "../utils/config";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import {
  validateServiceSecret,
  secretStatusButtonData,
  setServiceSecret,
  getServiceSecret,
} from "../utils/translate";
import { updateGPTModel } from "./services/gpt";

export function registerPrefsWindow() {
  ztoolkit.PreferencePane.register({
    pluginID: config.addonID,
    src: rootURI + "chrome/content/preferences.xhtml",
    label: getString("pref.title"),
    image: `chrome://${config.addonRef}/content/icons/favicon.png`,
    extraDTD: [`chrome://${config.addonRef}/locale/overlay.dtd`],
    defaultXUL: true,
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
          children: SERVICES.filter(
            (service) => service.type === "sentence"
          ).map((service) => ({
            tag: "menuitem",
            attributes: {
              label: getString(`service.${service.id}`),
              value: service.id,
            },
          })),
        },
      ],
    },
    doc.querySelector(`#${makeId("sentenceServices-placeholder")}`)!
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
          children: SERVICES.filter((service) => service.type === "word").map(
            (service) => ({
              tag: "menuitem",
              attributes: {
                label: getString(`service.${service.id}`),
                value: service.id,
              },
            })
          ),
        },
      ],
    },
    doc.querySelector(`#${makeId("wordServices-placeholder")}`)!
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
    doc.querySelector(`#${makeId("langfrom-placeholder")}`)!
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
    doc.querySelector(`#${makeId("langto-placeholder")}`)!
  );
  // Set defualt GPT model
  ztoolkit.UI.replaceElement(
    {
      tag: "menulist",
      id: makeId("gptModel"),
      attributes: {
        value: getPref("gptModel") as string,
        native: "true",
      },
      listeners: [
        {
          type: "command",
          listener: (e: Event) => {
            onPrefsEvents("setGPTModel");
          },
        },
      ],
      children: [
        {
          tag: "menupopup",
          id: makeId("modelList"),
          children: [
            {
              tag: "menuitem",
              attributes: {
                label: "gpt-3.5-turbo",
                value: "gpt-3.5-turbo",
              },
            },
          ],
        },
      ],
    },
    doc.querySelector(`#${makeId("sentenceServices-gptModel")}`)!
  );

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
    .querySelector(`#${makeId("useWordService")}`)
    ?.addEventListener("command", (e: Event) => {
      onPrefsEvents("setUseWordService");
    });

  doc
    .querySelector(`#${makeId("sentenceServicesSecret")}`)
    ?.addEventListener("input", (e: Event) => {
      onPrefsEvents("updateSentenceSecret");
    });

  doc
    .querySelector(`#${makeId("sentenceServicesSecret")}`)
    ?.addEventListener("blur", (e: Event) => {
      onPrefsEvents("completeUpdateSentenceSecret");
    });

  doc
    .querySelector(`#${makeId("wordServicesSecret")}`)
    ?.addEventListener("input", (e: Event) => {
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
}

function updatePrefsPaneDefault() {
  onPrefsEvents("setAutoTranslateAnnotation", false);
  onPrefsEvents("setEnablePopup", false);
  onPrefsEvents("setUseWordService", false);
  onPrefsEvents("setSentenceSecret", false);
  onPrefsEvents("setWordSecret", false);
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
        (elem) => ((elem as XUL.Element & XUL.IDisabled).disabled = disabled)
      );
  };
  switch (type) {
    case "setAutoTranslateSelection":
      addon.hooks.onReaderTabPanelRefresh();
      break;
    case "setAutoTranslateAnnotation":
      {
        let elemValue = fromElement
          ? (doc.querySelector(`#${makeId("enableComment")}`) as XUL.Checkbox)
              .checked
          : (getPref("enableComment") as boolean);
        const hidden = !elemValue;
        setDisabled("auto-annotation", hidden);
        addon.hooks.onReaderTabPanelRefresh();
      }
      break;
    case "setEnablePopup":
      {
        let elemValue = fromElement
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
        let elemValue = fromElement
          ? (doc.querySelector(`#${makeId("enableAddToNote")}`) as XUL.Checkbox)
              .checked
          : (getPref("enableNote") as boolean);
        const hidden = !elemValue;
        setDisabled("enable-popup-addtonote", hidden);
      }
      break;
    case "setUseWordService":
      {
        let elemValue = fromElement
          ? (doc.querySelector(`#${makeId("useWordService")}`) as XUL.Checkbox)
              .checked
          : (getPref("enableDict") as boolean);
        const hidden = !elemValue;
        setDisabled("use-word-service", hidden);
      }
      break;
    case "setSentenceService":
      {
        setPref(
          "translateSource",
          (
            doc.querySelector(`#${makeId("sentenceServices")}`) as XUL.MenuList
          ).getAttribute("value")!
        );
        onPrefsEvents("setSentenceSecret", fromElement);
        addon.hooks.onReaderTabPanelRefresh();
      }
      break;
    case "updateSentenceSecret":
      {
        setServiceSecret(
          getPref("translateSource") as string,
          (
            doc.querySelector(
              `#${makeId("sentenceServicesSecret")}`
            ) as HTMLInputElement
          ).value
        );
      }
      break;
    case "completeUpdateSentenceSecret":
      {
        const doc = addon.data.prefs.window?.document!;
        const serviceId = getPref("translateSource") as string;
        const secret = getServiceSecret(serviceId);
        if (serviceId === "gpt") {
          updateGPTModelMenu(doc, secret);
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
                `You see this because the translation service ${serviceId} requires SECRET, which is NOT correctly set.\n\nDetails:\n${validateResult.info}`
              );
            }
          }
        );
        (
          doc.querySelector(
            `#${makeId("sentenceServicesSecret")}`
          ) as HTMLInputElement
        ).value = secretCheckResult.secret;
        // Update secret status button
        const statusButtonData = secretStatusButtonData[serviceId];
        const statusButton = doc.querySelector(
          `#${makeId("sentenceServicesStatus")}`
        ) as XUL.Button;
        if (statusButtonData) {
          statusButton.hidden = false;
          statusButton.label = getString(
            statusButtonData.labels[secretCheckResult.status ? "pass" : "fail"]
          );
          statusButton.onclick = (ev) => {
            statusButtonData.callback(secretCheckResult.status);
          };
        } else {
          statusButton.hidden = true;
        }
        // hide GPT model when change service
        const gptModelMenu = doc.querySelector(
          `#${makeId("gptModel")}`
        ) as XUL.MenuList;
        gptModelMenu.hidden = true;
        // Update gpt model when opening the settings page
        if (serviceId === "gpt") {
          updateGPTModelMenu(doc, secretCheckResult.secret);
        }
      }
      break;
    case "setWordService":
      {
        setPref(
          "dictSource",
          (
            doc.querySelector(`#${makeId("wordServices")}`) as XUL.MenuList
          ).getAttribute("value")!
        );
        onPrefsEvents("setWordSecret", fromElement);
      }
      break;
    case "updateWordSecret":
      {
        setServiceSecret(
          getPref("dictSource") as string,
          (
            doc.querySelector(
              `#${makeId("wordServicesSecret")}`
            ) as HTMLInputElement
          ).value
        );
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
                `You see this because the translation service ${serviceId} requires SECRET, which is NOT correctly set.\n\nDetails:\n${validateResult.info}`
              );
            }
          }
        );
        (
          doc.querySelector(
            `#${makeId("wordServicesSecret")}`
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
          ).getAttribute("value")!
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
          ).getAttribute("value")!
        );
        addon.hooks.onReaderTabPanelRefresh();
      }
      break;
    case "updateFontSize":
      addon.hooks.onReaderPopupRefresh();
      addon.hooks.onReaderTabPanelRefresh();
      break;
    case "updatelineHeight":
      addon.hooks.onReaderPopupRefresh();
      addon.hooks.onReaderTabPanelRefresh();
      break;
    case "setGPTModel":
      {
        Zotero.debug("setGPTModel");
        setPref(
          "gptModel",
          (
            doc.querySelector(`#${makeId("gptModel")}`) as XUL.MenuList
          ).getAttribute("value")!
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

// Update  the model from openAI:
function updateGPTModelMenu(doc: Document, secret: string) {
  const gptModelMenu = doc.querySelector(
    `#${makeId("gptModel")}`
  ) as XUL.MenuList;
  gptModelMenu.hidden = true;

  //Display the gptModelMenu only when the API retrieves the model
  if (secret) {
    updateGPTModel(secret).then((models) => {
      const child = models.map((model: string) => {
        return {
          tag: "menuitem",
          attributes: {
            label: model,
            value: model,
          },
        };
      });
      ztoolkit.UI.replaceElement(
        {
          tag: "menupopup",
          id: makeId("modelList"),
          children: child,
        },
        doc.querySelector(`#${makeId("modelList")}`) as XUL.MenuList
      );
      // Handling the case of lost model permissions
      const selectedModel = getPref("gptModel") as string;
      const currentModel = models.includes(selectedModel)
        ? selectedModel
        : "gpt-3.5-turbo";
      gptModelMenu.value = currentModel;
      setPref("gptModel", currentModel);
      gptModelMenu.hidden = false;
    });
  }
}
