import { SVGIcon } from "../utils/config";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import { addTranslateTask, getLastTranslateTask } from "../utils/translate";

export function updateReaderPopup() {
  const popup = addon.data.popup.currentPopup;
  if (!popup) {
    return;
  }
  const enablePopup = getPref("enablePopup");
  Array.from(popup.querySelectorAll(`.${config.addonRef}-readerpopup`)).forEach(
    (elem) => ((elem as HTMLElement).hidden = !enablePopup)
  );
  if (!enablePopup) {
    return;
  }
  const task = getLastTranslateTask();
  if (!task) {
    return;
  }
  popup.setAttribute("translate-task-id", task.id);
  const idPrefix = popup?.getAttribute(`${config.addonRef}-prefix`);
  const makeId = (type: string) => `${idPrefix}-${type}`;

  const audiobox = popup?.querySelector(
    `#${makeId("audiobox")}`
  ) as HTMLDivElement;
  const translateButton = popup?.querySelector(
    `#${makeId("translate")}`
  ) as HTMLDivElement;
  const textarea = popup?.querySelector(
    `#${makeId("text")}`
  ) as HTMLTextAreaElement;
  const addToNoteButton = popup?.querySelector(
    `#${makeId("addtonote")}`
  ) as HTMLDivElement;
  if (task.audio.length > 0 && getPref("showPlayBtn")) {
    audiobox.innerHTML = "";
    ztoolkit.UI.appendElement(
      {
        tag: "fragment",
        children: task.audio.map((audioData) => ({
          tag: "button",
          namespace: "html",
          classList: ["toolbarButton"],
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
      audiobox
    );
  }
  translateButton.hidden = task.status !== "waiting";
  textarea.hidden = task.status === "waiting";
  textarea.value = task.result || task.raw;
  textarea.style.fontSize = `${getPref("fontSize")}px`;
  textarea.style.lineHeight = `${
    Number(getPref("lineHeight")) * Number(getPref("fontSize"))
  }px`;
  addToNoteButton.hidden = !Boolean(ZoteroContextPane.getActiveEditor());
  updatePopupSize(popup, textarea);
}

export function buildReaderPopup(readerInstance: _ZoteroTypes.ReaderInstance) {
  const popup = readerInstance._iframeWindow?.document.querySelector(
    "#selection-menu"
  ) as HTMLDivElement;
  if (!popup) {
    return;
  }
  addon.data.popup.currentPopup = popup;
  popup.style.height = "-moz-fit-content";
  popup.setAttribute(
    `${config.addonRef}-prefix`,
    `${config.addonRef}-${readerInstance._instanceID}`
  );

  const colors = popup.querySelector(".colors") as HTMLDivElement;
  colors.style.width = "100%";
  colors.style.justifyContent = "space-evenly";

  const keepSize = getPref("keepPopupSize") as boolean;

  const makeId = (type: string) =>
    `${config.addonRef}-${readerInstance._instanceID}-${type}`;

  const onTextAreaCopy = getOnTextAreaCopy(popup, makeId("text"));

  ztoolkit.UI.appendElement(
    {
      tag: "fragment",
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
          tag: "div",
          id: makeId("translate"),
          classList: ["wide-button", `${config.addonRef}-readerpopup`],
          properties: {
            innerHTML: `${SVGIcon}${getString("readerpopup.translate.label")}`,
            hidden: getPref("enableAuto"),
          },
          listeners: [
            {
              type: "mouseup",
              listener: (ev: Event) => {
                addon.hooks.onTranslate({ noCheckZoteroItemLanguage: true });
                const button = ev.target as HTMLDivElement;
                button.hidden = true;
                (
                  button.ownerDocument.querySelector(
                    `#${makeId("text")}`
                  ) as HTMLTextAreaElement
                ).hidden = false;
              },
            },
          ],
          ignoreIfExists: true,
        },
        {
          tag: "textarea",
          id: makeId("text"),
          attributes: {
            rows: "3",
            columns: "10",
          },
          classList: [
            `${config.addonRef}-popup-textarea`,
            `${config.addonRef}-readerpopup`,
          ],
          styles: {
            fontSize: `${getPref("fontSize")}px`,
            fontFamily: "inherit",
            lineHeight: `${
              Number(getPref("lineHeight")) * Number(getPref("fontSize"))
            }px`,
            width: "-moz-available",
            height: `${Math.max(
              keepSize ? Number(getPref("popupHeight")) : 30
            )}px`,
            marginLeft: "2px",
            // @ts-ignore
            scrollbarWidth: "none",
          },
          properties: {
            onpointerup: (e: Event) => e.stopPropagation(),
            ondragstart: (e: Event) => e.stopPropagation(),
            spellcheck: false,
            value: ztoolkit.Reader.getSelectedText(readerInstance),
          },
          ignoreIfExists: true,
          listeners: [
            {
              type: "mousedown",
              listener: (_ev) => {
                _ev.target?.addEventListener(
                  "mousemove",
                  onTextAreaResize as (ev: Event) => void
                );
              },
            },
            {
              type: "mouseup",
              listener: (_ev) => {
                _ev.target?.removeEventListener(
                  "mousemove",
                  onTextAreaResize as (ev: Event) => void
                );
                const textarea = popup.querySelector(
                  `#${makeId("text")}`
                ) as HTMLTextAreaElement;
                if (popup.scrollWidth > textarea.offsetWidth + 4) {
                  textarea.style.width = `${popup.scrollWidth - 4}px`;
                }
              },
            },
            {
              type: "mouseenter",
              listener: (_ev) => {
                _ev.target?.addEventListener(
                  "keydown",
                  onTextAreaCopy as (ev: Event) => void
                );
                const head =
                  readerInstance._iframe.contentWindow.document.querySelector(
                    "head"
                  );
                ztoolkit.UI.appendElement(
                  {
                    tag: "style",
                    id: makeId("style"),
                    properties: {
                      innerHTML: `.${config.addonRef}-popup-textarea::-moz-selection {background: #7fbbea;}`,
                    },
                    skipIfExists: true,
                  },
                  head
                );
              },
            },
            {
              type: "mouseleave",
              listener: (_ev) => {
                _ev.target?.removeEventListener(
                  "keydown",
                  onTextAreaCopy as (ev: Event) => void
                );
                const head =
                  readerInstance._iframe.contentWindow.document.querySelector(
                    "head"
                  );
                ztoolkit.UI.appendElement(
                  {
                    tag: "style",
                    id: makeId("style"),
                    properties: {
                      innerHTML: `.${config.addonRef}-popup-textarea::-moz-selection {background: #bfbfbf;}`,
                    },
                    skipIfExists: true,
                  },
                  head
                );
              },
            },
            {
              type: "dbclick",
              listener: (_ev) => {
                const textarea = popup.querySelector(
                  `#${makeId("text")}`
                ) as HTMLTextAreaElement;
                textarea.selectionStart = 0;
                textarea.selectionEnd = textarea.value.length;
                new ztoolkit.Clipboard()
                  .addText(
                    textarea.value.slice(
                      textarea.selectionStart,
                      textarea.selectionEnd
                    ),
                    "text/unicode"
                  )
                  .copy();
              },
            },
          ],
        },
        {
          tag: "div",
          id: makeId("addtonote"),
          classList: ["wide-button", `${config.addonRef}-readerpopup`],
          properties: {
            innerHTML: `${SVGIcon}${Zotero.getString("pdfReader.addToNote")}`,
          },
          ignoreIfExists: true,
          listeners: [
            {
              type: "mouseup",
              listener: async (ev) => {
                const noteEditor =
                  ZoteroContextPane && ZoteroContextPane.getActiveEditor();
                if (!noteEditor) {
                  return;
                }
                const editorInstance = noteEditor.getCurrentInstance();
                if (!editorInstance) {
                  return;
                }
                const selection =
                  ztoolkit.Reader.getSelectedText(readerInstance);
                const task = addTranslateTask(
                  selection,
                  readerInstance.itemID,
                  "text"
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
                const { html } =
                  Zotero.EditorInstanceUtilities.serializeAnnotations([
                    {
                      type: "highlight",
                      text: replaceMode ? task.result : task.raw,
                      comment: replaceMode ? "" : task.result,
                      attachmentItemID: task.itemId,
                      pageLabel:
                        // @ts-ignore
                        readerInstance._iframeWindow.wrappedJSObject.extractor
                          .pageLabelsCache[readerInstance.state.pageIndex],
                      position: {
                        rects: [],
                      },
                    },
                  ]);
                editorInstance._postMessage({
                  action: "insertHTML",
                  pos: null,
                  html,
                });
              },
            },
          ],
        },
      ],
    },
    popup
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
      `#${targetId}`
    ) as HTMLTextAreaElement;
    const isMod = ev.ctrlKey || ev.metaKey;
    if (ev.key === "c" && isMod) {
      ztoolkit.getGlobal("setTimeout")(() => {
        new ztoolkit.Clipboard()
          .addText(
            textarea.value.slice(
              textarea.selectionStart,
              textarea.selectionEnd
            ),
            "text/unicode"
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
          "text/unicode"
        )
        .copy();
      textarea.value = `${textarea.value.slice(
        0,
        textarea.selectionStart
      )}${textarea.value.slice(textarea.selectionEnd)}`;
      ev.stopPropagation();
    }
  };
}

function updatePopupSize(
  selectionMenu: HTMLDivElement,
  textarea: HTMLTextAreaElement,
  resetSize: boolean = true
): void {
  const keepSize = getPref("keepPopupSize") as boolean;
  if (keepSize) {
    return;
  }
  if (resetSize) {
    textarea.style.width = "-moz-available";
    textarea.style.height = "30px";
  }
  const viewer = selectionMenu.ownerDocument.querySelector(
    "#viewer"
  ) as HTMLDivElement;
  // Get current H & W
  let textHeight = textarea.scrollHeight;
  let textWidth = textarea.scrollWidth;
  const newWidth = textWidth + 20;
  // Check until H/W<0.75 and don't overflow viewer border
  if (
    textHeight / textWidth > 0.75 &&
    selectionMenu.offsetLeft + newWidth < viewer.offsetWidth
  ) {
    // Update width
    textarea.style.width = `${newWidth}px`;
    updatePopupSize(selectionMenu, textarea, false);
    return;
  }
  // Update height
  textarea.style.height = `${textHeight + 3}px`;
}
