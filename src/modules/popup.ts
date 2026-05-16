import { SVGIcon } from "../utils/config";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import { addTranslateTask, getLastTranslateTask } from "../utils/task";
import { slice } from "../utils/str";
import { getMathOverlayState, renderMathInText } from "../utils/mathRenderer";

const popupMathOverlayFrames = new WeakMap<HTMLDivElement, number>();
const popupTaskMaxWidths = new Map<string, number>();

export function updateReaderPopup() {
  const popup = addon.data.popup.currentPopup;
  if (!popup) {
    return;
  }
  const enablePopup = getPref("enablePopup");
  const hidePopupTextarea = getPref("enableHidePopupTextarea") as boolean;
  Array.from(popup.querySelectorAll(`.${config.addonRef}-readerpopup`)).forEach(
    (elem) => ((elem as HTMLElement).hidden = !enablePopup),
  );

  const idPrefix = popup?.getAttribute(`${config.addonRef}-prefix`);
  const makeId = (type: string) => `${idPrefix}-${type}`;
  const audiobox = popup?.querySelector(
    `#${makeId("audiobox")}`,
  ) as HTMLDivElement;
  const translateButton = popup?.querySelector(
    `#${makeId("translate")}`,
  ) as HTMLDivElement;
  const textContainer = popup?.querySelector(
    `#${makeId("text-container")}`,
  ) as HTMLDivElement;
  const textarea = popup?.querySelector(
    `#${makeId("text")}`,
  ) as HTMLTextAreaElement;
  const mathOverlay = popup?.querySelector(
    `#${makeId("math-overlay")}`,
  ) as HTMLDivElement;
  const addToNoteButton = popup?.querySelector(
    `#${makeId("addtonote")}`,
  ) as HTMLDivElement;

  const updateHidden = (elem: HTMLElement, hidden: boolean) => {
    if (hidden) {
      elem.style.display = "none";
    } else {
      elem.style.removeProperty("display");
    }
  };

  if (!enablePopup) {
    cancelPopupMathOverlayRender(mathOverlay);
    mathOverlay.innerHTML = "";
    updateHidden(audiobox, true);
    updateHidden(translateButton, true);
    updateHidden(textContainer, true);
    updateHidden(textarea, true);
    updateHidden(mathOverlay, true);
    updateHidden(addToNoteButton, true);
    return;
  }
  updateHidden(audiobox, false);
  updateHidden(translateButton, false);
  updateHidden(textContainer, false);
  updateHidden(textarea, false);
  updateHidden(mathOverlay, false);
  updateHidden(addToNoteButton, false);
  const task = getLastTranslateTask({ type: "text" });
  if (!task) {
    return;
  }
  popup.setAttribute("translate-task-id", task.id);

  if (task.audio.length > 0 && getPref("showPlayBtn")) {
    audiobox.innerHTML = "";
    updateHidden(audiobox, false);
    ztoolkit.UI.appendElement(
      {
        tag: "fragment",
        children: task.audio.map((audioData) => ({
          tag: "button",
          namespace: "html",
          classList: ["toolbar-button", "wide-button"],
          attributes: {
            tabindex: "-1",
            title: audioData.text,
          },
          properties: {
            innerHTML: `🔊 ${audioData.text}`,
            onclick: () => {
              new (ztoolkit.getGlobal("Audio"))(audioData.url).play();
            },
          },
          styles: { whiteSpace: "nowrap", flexGrow: "1" },
        })),
      },
      audiobox,
    );
  }

  if (task.audio.length > 0 && getPref("showPlayBtn") && getPref("autoPlay")) {
    const firstAudio = task.audio[0];
    const audio = new (ztoolkit.getGlobal("Audio"))(firstAudio.url);
    audio.play();
  }

  const hideTranslateButton = task.status !== "waiting";
  updateHidden(translateButton, hideTranslateButton);

  switch (task.langto?.split("-")[0]) {
    case "ar":
    case "fa":
    case "he":
      textarea.style.direction = "rtl";
      break;
    default:
      textarea.style.direction = "ltr";
  }

  textarea.hidden = hidePopupTextarea || !hideTranslateButton;
  textarea.value = task.result || task.raw;
  textarea.style.fontSize = `${getPref("fontSize")}px`;
  textarea.style.lineHeight = `${
    Number(getPref("lineHeight")) * Number(getPref("fontSize"))
  }px`;
  updatePopupSize(
    popup,
    textarea,
    getPopupWidthTrackingTaskId(task.id, task.result),
  );
  syncPopupTextContainer(textContainer, textarea);
  updatePopupMathOverlay(mathOverlay, textContainer, textarea);

  const enableAddToNote = getPref("enableNote") as boolean;
  if (
    !Zotero.getMainWindow().ZoteroContextPane.activeEditor ||
    !enableAddToNote
  ) {
    updateHidden(addToNoteButton, true);
  }
}

export function buildReaderPopup(
  event: _ZoteroTypes.Reader.EventParams<"renderTextSelectionPopup">,
) {
  const { reader, doc, append } = event;
  const annotation = event.params.annotation;
  const popup = doc.querySelector(".selection-popup") as HTMLDivElement;
  ensurePopupMathStyles(doc);
  addon.data.popup.currentPopup = popup;
  popup.style.maxWidth = "none";
  popup.setAttribute(
    `${config.addonRef}-prefix`,
    `${config.addonRef}-${reader._instanceID}`,
  );

  const ZoteroContextPane = Zotero.getMainWindow().ZoteroContextPane;

  const colors = popup.querySelector(".colors") as HTMLDivElement;
  colors.style.width = "100%";
  colors.style.justifyContent = "space-evenly";

  const keepSize = getPref("keepPopupSize") as boolean;

  const makeId = (type: string) =>
    `${config.addonRef}-${reader._instanceID}-${type}`;
  const onTextAreaCopy = getOnTextAreaCopy(popup, makeId("text"));

  const hidePopupTextarea = getPref("enableHidePopupTextarea") as boolean;
  append(
    ztoolkit.UI.createElement(doc, "fragment", {
      children: [
        {
          tag: "div",
          id: makeId("audiobox"),
          classList: [`${config.addonRef}-readerpopup`],
          styles: {
            display: "flex",
            width: "calc(100% - 4px)",
            marginLeft: "2px",
            justifyContent: "space-evenly",
          },
          ignoreIfExists: true,
        },
        {
          tag: "button",
          namespace: "html",
          id: makeId("translate"),
          classList: [
            "toolbar-button",
            "wide-button",
            `${config.addonRef}-readerpopup`,
          ],
          properties: {
            innerHTML: `${SVGIcon}${getString("readerpopup-translate-label")}`,
            hidden: getPref("enableAuto"),
          },
          listeners: [
            {
              type: "click",
              listener: (ev: Event) => {
                addon.hooks.onTranslate({
                  noCheckZoteroItemLanguage: true,
                  noCache: true,
                });
                const button = ev.target as HTMLDivElement;
                button.hidden = true;
                (
                  button.ownerDocument.querySelector(
                    `#${makeId("text")}`,
                  ) as HTMLTextAreaElement
                ).hidden = hidePopupTextarea;
              },
            },
          ],
          ignoreIfExists: true,
        },
        {
          tag: "div",
          namespace: "html",
          id: makeId("text-container"),
          classList: [
            `${config.addonRef}-popup-text-container`,
            `${config.addonRef}-readerpopup`,
          ],
          styles: {
            position: "relative",
            width: keepSize ? `${getPref("popupWidth")}px` : "-moz-available",
            minWidth: "184px",
            height: `${Math.max(
              keepSize ? Number(getPref("popupHeight")) : 30,
            )}px`,
            marginInline: "2px",
          },
          children: [
            {
              tag: "textarea",
              id: makeId("text"),
              attributes: {
                rows: "3",
                columns: "10",
              },
              classList: [`${config.addonRef}-popup-textarea`],
              styles: {
                fontSize: `${getPref("fontSize")}px`,
                fontFamily: "inherit",
                lineHeight: `${
                  Number(getPref("lineHeight")) * Number(getPref("fontSize"))
                }px`,
                width: keepSize
                  ? `${getPref("popupWidth")}px`
                  : "-moz-available",
                // Minimum width to prevent the textarea from being smaller than the popup
                minWidth: "184px",
                height: `${Math.max(
                  keepSize ? Number(getPref("popupHeight")) : 30,
                )}px`,
                border: "none",
                background: "var(--color-sidepane)",
                borderRadius: "6px",
                padding: "5px",
              },
              properties: {
                onpointerup: (e: Event) => e.stopPropagation(),
                ondragstart: (e: Event) => e.stopPropagation(),
                spellcheck: false,
                value: addon.data.translate.selectedText,
              },
              ignoreIfExists: true,
              listeners: [
                {
                  type: "mousedown",
                  listener: (_ev) => {
                    _ev.target?.addEventListener(
                      "mousemove",
                      onTextAreaResize as (ev: Event) => void,
                    );
                  },
                },
                {
                  type: "mouseup",
                  listener: (_ev) => {
                    _ev.target?.removeEventListener(
                      "mousemove",
                      onTextAreaResize as (ev: Event) => void,
                    );
                  },
                },
                {
                  type: "keydown",
                  listener: onTextAreaCopy as (ev: Event) => void,
                },
                {
                  type: "dblclick",
                  listener: (_ev) => {
                    const textarea = popup.querySelector(
                      `#${makeId("text")}`,
                    ) as HTMLTextAreaElement;
                    textarea.selectionStart = 0;
                    textarea.selectionEnd = textarea.value.length;
                    const text = textarea.value.slice(
                      textarea.selectionStart,
                      textarea.selectionEnd,
                    );
                    new ztoolkit.Clipboard().addText(text, "text/plain").copy();
                    new ztoolkit.ProgressWindow("Copied to Clipboard")
                      .createLine({
                        text: slice(text, 50),
                        progress: 100,
                        type: "default",
                      })
                      .show();
                  },
                },
              ],
            },
            {
              tag: "div",
              namespace: "html",
              id: makeId("math-overlay"),
              classList: [`${config.addonRef}-popup-math-overlay`],
              styles: {
                display: "none",
                position: "absolute",
                inset: "0",
                boxSizing: "border-box",
                fontSize: `${getPref("fontSize")}px`,
                fontFamily: "inherit",
                lineHeight: `${
                  Number(getPref("lineHeight")) * Number(getPref("fontSize"))
                }px`,
                border: "none",
                background: "var(--color-sidepane)",
                borderRadius: "6px",
                padding: "5px",
                overflow: "auto",
                textAlign: "start",
              },
              properties: {
                onpointerup: (e: Event) => e.stopPropagation(),
                ondragstart: (e: Event) => e.stopPropagation(),
              },
              listeners: [
                {
                  type: "click",
                  listener: () => {
                    const overlay = popup.querySelector(
                      `#${makeId("math-overlay")}`,
                    ) as HTMLDivElement;
                    const textarea = popup.querySelector(
                      `#${makeId("text")}`,
                    ) as HTMLTextAreaElement;
                    cancelPopupMathOverlayRender(overlay);
                    overlay.style.display = "none";
                    textarea.style.removeProperty("visibility");
                    textarea.focus();
                  },
                },
              ],
              ignoreIfExists: true,
            },
          ],
          ignoreIfExists: true,
        },
        {
          tag: "button",
          namespace: "html",
          id: makeId("addtonote"),
          classList: [
            "toolbar-button",
            "wide-button",
            `${config.addonRef}-readerpopup`,
          ],
          styles: {
            marginTop: "8px",
          },
          properties: {
            innerHTML: `${SVGIcon}${getString("readerpopup-addToNote-label")}`,
          },
          ignoreIfExists: true,
          listeners: [
            {
              type: "click",
              listener: async (ev) => {
                const noteEditor =
                  ZoteroContextPane && ZoteroContextPane.activeEditor;
                if (!noteEditor) {
                  return;
                }
                const editorInstance = noteEditor.getCurrentInstance();
                if (!editorInstance) {
                  return;
                }
                const task = addTranslateTask(
                  addon.data.translate.selectedText,
                  reader.itemID,
                  "addtonote",
                );
                if (!task) {
                  return;
                }
                await addon.hooks.onTranslate(task, {
                  noCheckZoteroItemLanguage: true,
                  noDisplay: true,
                });
                if (task.status !== "success") {
                  return;
                }
                const replaceMode = getPref("enableNoteReplaceMode") as boolean;
                if (replaceMode) {
                  annotation.text = task.result;
                } else {
                  annotation.comment = task.result;
                }
                // @ts-ignore should be fixed in the zotero-types
                reader._addToNote([annotation]);
              },
            },
          ],
        },
      ],
    }),
  );
}

function onTextAreaResize(ev: MouseEvent) {
  if (getPref("keepPopupSize")) {
    const textarea = ev.target as HTMLTextAreaElement;
    setPref("popupWidth", textarea.offsetWidth);
    setPref("popupHeight", textarea.offsetHeight);
  }
}

function getOnTextAreaCopy(selectionMenu: HTMLElement, targetId: string) {
  return (ev: KeyboardEvent) => {
    const textarea = selectionMenu.querySelector(
      `#${targetId}`,
    ) as HTMLTextAreaElement;
    const isMod = ev.ctrlKey || ev.metaKey;
    if (ev.key === "c" && isMod) {
      ztoolkit.getGlobal("setTimeout")(() => {
        new ztoolkit.Clipboard()
          .addText(
            textarea.value.slice(
              textarea.selectionStart,
              textarea.selectionEnd,
            ),
            "text/plain",
          )
          .copy();
      }, 10);
      ev.stopPropagation();
    } else if (ev.key === "a" && isMod) {
      textarea.selectionStart = 0;
      textarea.selectionEnd = textarea.value.length;
      ev.stopPropagation();
    } else if (ev.key === "x" && isMod) {
      new ztoolkit.Clipboard()
        .addText(
          textarea.value.slice(textarea.selectionStart, textarea.selectionEnd),
          "text/plain",
        )
        .copy();
      textarea.value = `${textarea.value.slice(
        0,
        textarea.selectionStart,
      )}${textarea.value.slice(textarea.selectionEnd)}`;
      ev.stopPropagation();
    }
  };
}

function updatePopupSize(
  selectionMenu: HTMLDivElement,
  textarea: HTMLTextAreaElement,
  taskId?: string,
  resetSize: boolean = true,
): void {
  const keepSize = getPref("keepPopupSize") as boolean;
  if (keepSize) {
    return;
  }
  if (resetSize) {
    textarea.style.width = "-moz-available";
    textarea.style.height = "30px";
  }
  const viewer = selectionMenu.ownerDocument.body;
  // Get current H & W
  const textHeight = textarea.scrollHeight;
  const textWidth = textarea.scrollWidth;
  const newWidth = textWidth + 20;
  // Check until H/W<0.75 and don't overflow viewer border
  if (
    textHeight / textWidth > 0.75 &&
    selectionMenu.offsetLeft + newWidth < viewer.offsetWidth
  ) {
    // Update width
    textarea.style.width = `${newWidth}px`;
    updatePopupSize(selectionMenu, textarea, taskId, false);
    return;
  }
  if (taskId) {
    textarea.style.width = `${getTaskScopedPopupWidth(
      taskId,
      textarea.offsetWidth,
    )}px`;
  }
  // Update height
  textarea.style.height = `${textHeight + 3}px`;
}

function getTaskScopedPopupWidth(taskId: string, width: number): number {
  const previousWidth = popupTaskMaxWidths.get(taskId) ?? 0;
  const nextWidth = Math.max(previousWidth, width);
  popupTaskMaxWidths.set(taskId, nextWidth);
  return nextWidth;
}

function getPopupWidthTrackingTaskId(
  taskId: string,
  result: string,
): string | undefined {
  const trimmedResult = result.trim();
  if (!trimmedResult || trimmedResult === getString("status-translating")) {
    return undefined;
  }
  return taskId;
}

function syncPopupTextContainer(
  container: HTMLDivElement,
  textarea: HTMLTextAreaElement,
): void {
  container.hidden = textarea.hidden;
  container.style.width = textarea.style.width;
  container.style.height = textarea.style.height;
}

function ensurePopupMathStyles(doc: Document): void {
  const id = `${config.addonRef}-popup-math-styles`;
  if (doc.getElementById(id)) {
    return;
  }
  const link = doc.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `chrome://${config.addonRef}/content/styles/katex.min.css`;
  doc.head?.append(link);
}

function updatePopupMathOverlay(
  overlay: HTMLDivElement,
  container: HTMLDivElement,
  textarea: HTMLTextAreaElement,
): void {
  const enabled = (getPref("enableMathRendering") as boolean) === true;
  const state = getMathOverlayState({
    text: textarea.value,
    enabled,
    hiddenByPreference: container.hidden,
  });
  if (state.overlayDisplay === "none") {
    cancelPopupMathOverlayRender(overlay);
    overlay.innerHTML = "";
    overlay.style.display = state.overlayDisplay;
    textarea.style.removeProperty("visibility");
    return;
  }

  overlay.style.fontSize = textarea.style.fontSize;
  overlay.style.lineHeight = textarea.style.lineHeight;
  overlay.style.direction = textarea.style.direction;
  overlay.style.display = state.overlayDisplay;
  textarea.style.visibility = state.textareaVisibility;
  schedulePopupMathOverlayRender(overlay, container, textarea);
}

function schedulePopupMathOverlayRender(
  overlay: HTMLDivElement,
  container: HTMLDivElement,
  textarea: HTMLTextAreaElement,
): void {
  if (popupMathOverlayFrames.has(overlay)) {
    return;
  }
  const render = () => {
    popupMathOverlayFrames.delete(overlay);
    overlay.innerHTML = renderMathInText(overlay.ownerDocument, textarea.value);
    syncPopupRenderedTextContainer(container, textarea, overlay);
  };
  const win = overlay.ownerDocument.defaultView;
  if (win?.requestAnimationFrame) {
    popupMathOverlayFrames.set(overlay, win.requestAnimationFrame(render));
    return;
  }
  render();
}

function syncPopupRenderedTextContainer(
  container: HTMLDivElement,
  textarea: HTMLTextAreaElement,
  overlay: HTMLDivElement,
): void {
  if (getPref("keepPopupSize")) {
    return;
  }
  const width = container.clientWidth || textarea.offsetWidth;
  if (!width) {
    return;
  }

  const measurement = overlay.cloneNode(false) as HTMLDivElement;
  measurement.removeAttribute("id");
  measurement.innerHTML = overlay.innerHTML;
  measurement.style.position = "absolute";
  measurement.style.inset = "auto";
  measurement.style.left = "-100000px";
  measurement.style.top = "0";
  measurement.style.visibility = "hidden";
  measurement.style.pointerEvents = "none";
  measurement.style.display = "block";
  measurement.style.boxSizing = overlay.style.boxSizing;
  measurement.style.width = `${width}px`;
  measurement.style.height = "auto";
  measurement.style.maxHeight = "none";
  measurement.style.overflow = "visible";

  overlay.ownerDocument.body.appendChild(measurement);
  const renderedHeight = Math.max(
    30,
    Math.ceil(measurement.scrollHeight),
    Math.ceil(measurement.offsetHeight),
  );
  measurement.remove();

  const height = `${renderedHeight}px`;
  container.style.height = height;
  textarea.style.height = height;
}

function cancelPopupMathOverlayRender(overlay: HTMLDivElement): void {
  const frame = popupMathOverlayFrames.get(overlay);
  if (typeof frame === "undefined") {
    return;
  }
  overlay.ownerDocument.defaultView?.cancelAnimationFrame?.(frame);
  popupMathOverlayFrames.delete(overlay);
}
