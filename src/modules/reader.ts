import { config } from "../../package.json";
import { SVGIcon } from "../utils/config";
import { addTranslateAnnotationTask, getLastTranslateTask, isSingleWord, TranslateTask } from "../utils/task";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import { extractParagraphContext } from "../utils/paragraphExtractor";

export function registerReaderInitializer() {
  Zotero.Reader.registerEventListener(
    "renderTextSelectionPopup",
    (event) => {
      const { reader, doc, params, append } = event;
      addon.data.translate.selectedText = params.annotation.text.trim();
      addon.data.translate.paragraphContext = "";

      // Synchronous: build popup and create task
      addon.hooks.onReaderPopupShow(event);

      // Async: extract paragraph context and update the task
      if (getPref("enableParagraphContext")) {
        const selectedText = addon.data.translate.selectedText;
        extractParagraphContext(reader, params.annotation, selectedText)
          .then((context) => {
            const ctx = context || "";
            addon.data.translate.paragraphContext = ctx;
            const task = getLastTranslateTask({ type: "text" });
            if (task && ctx) {
              task.contextText = ctx;
            }
            // Add LLM extra task for dual-service mode (dict + LLM for single words)
            addDualServiceExtraTask(task, selectedText, ctx);
            // Trigger auto-translate now that context is ready
            if (getPref("enableAuto") && task?.status === "waiting") {
              addon.hooks.onTranslate();
            }
          })
          .catch(() => {
            // Extraction failed, trigger auto-translate without context
            const task = getLastTranslateTask({ type: "text" });
            addDualServiceExtraTask(task, selectedText, "");
            if (getPref("enableAuto")) {
              addon.hooks.onTranslate();
            }
          });
      } else if (getPref("enableAuto")) {
        addon.hooks.onTranslate();
      }
    },
    config.addonID,
  );

  Zotero.Reader.registerEventListener(
    "renderSidebarAnnotationHeader",
    (event) => {
      const { reader, doc, params, append } = event;
      const annotationData = params.annotation;

      // TEMP: If not many annotations, create the button immediately
      if (reader._item.numAnnotations() < 1000) {
        append(createTranslateAnnotationButton(doc, reader, annotationData));
        return;
      }

      // TEMP: Use error event to delay the button creation to avoid blocking the main thread
      const placeholder = doc.createElement("img");
      placeholder.src = "chrome://zotero/error.png";
      placeholder.dataset.annotationId = annotationData.id;
      placeholder.dataset.libraryId = reader._item.libraryID.toString();
      placeholder.addEventListener("error", (event) => {
        const placeholder = event.currentTarget as HTMLElement;
        placeholder.ownerGlobal?.requestIdleCallback(() => {
          const annotationID = placeholder.dataset.annotationId;
          const libraryID = parseInt(placeholder.dataset.libraryId || "");
          const button = doc.createElement("div");
          button.classList.add("icon");
          button.innerHTML = SVGIcon;
          button.title = getString("sideBarIcon-title");
          button.addEventListener("click", (e) => {
            const task = addTranslateAnnotationTask(libraryID, annotationID!);
            addon.hooks.onTranslate(task, {
              noCheckZoteroItemLanguage: true,
              noDisplay: true,
            });
            e.preventDefault();
          });
          button.addEventListener("mouseover", (e) => {
            (e.target as HTMLElement).style.backgroundColor =
              "var(--color-sidepane)";
          });
          button.addEventListener("mouseout", (e) => {
            (e.target as HTMLElement).style.removeProperty("background-color");
          });
          placeholder.replaceWith(button);
        });
      });
      append(placeholder);
    },
    config.addonID,
  );
}

function createTranslateAnnotationButton(
  doc: Document,
  reader: _ZoteroTypes.ReaderInstance,
  annotationData: any,
): HTMLElement {
  return ztoolkit.UI.createElement(doc, "div", {
    classList: ["icon"],
    properties: {
      innerHTML: SVGIcon,
      title: getString("sideBarIcon-title"),
    },
    listeners: [
      {
        type: "click",
        listener: (e) => {
          const task = addTranslateAnnotationTask(
            reader._item.libraryID,
            annotationData.id,
          );
          addon.hooks.onTranslate(task, {
            noCheckZoteroItemLanguage: true,
            noDisplay: true,
          });
          e.preventDefault();
        },
      },
      {
        type: "mouseover",
        listener: (e) => {
          (e.target as HTMLElement).style.backgroundColor =
            "var(--color-sidepane)";
        },
      },
      {
        type: "mouseout",
        listener: (e) => {
          (e.target as HTMLElement).style.removeProperty("background-color");
        },
      },
    ],
    enableElementRecord: false,
    ignoreIfExists: true,
  });
}

function addDualServiceExtraTask(
  task: TranslateTask | undefined,
  raw: string,
  contextText: string,
) {
  if (!task) return;
  if (!getPref("enableDict") || !getPref("enableParagraphContext")) return;
  if (!isSingleWord(raw)) return;

  task.extraTasks.push({
    id: `${Zotero.Utilities.randomString()}-${new Date().getTime()}`,
    type: "text",
    raw,
    result: "",
    audio: [],
    service: getPref("translateSource") as string,
    candidateServices: [],
    extraTasks: [],
    itemId: task.itemId,
    status: "waiting",
    contextText: contextText || undefined,
  });
}
