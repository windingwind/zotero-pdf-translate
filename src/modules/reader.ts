import { config } from "../../package.json";
import { SVGIcon } from "../utils/config";
import { addTranslateAnnotationTask } from "../utils/task";

export function registerReaderInitializer() {
  ztoolkit.ReaderInstance.register(
    "initialized",
    `${config.addonRef}-selection`,
    initializeReaderSelectionEvent,
  );
  ztoolkit.ReaderInstance.register(
    "initialized",
    `${config.addonRef}-annotationButtons`,
    initializeReaderAnnotationButton,
  );
  // Force re-initialize
  Zotero.Reader._readers.forEach((r) => {
    initializeReaderSelectionEvent(r);
    initializeReaderAnnotationButton(r);
  });
}

export function unregisterReaderInitializer() {
  Zotero.Reader._readers.forEach((r) => {
    unInitializeReaderAnnotationButton(r);
  });
  addon.data.popup.observers.forEach((observer) => {
    observer.deref()?.disconnect();
  });
  addon.data.popup.observers = [];
}

export async function checkReaderAnnotationButton(items: Zotero.Item[]) {
  const hitSet = new Set<number>();
  let t = 0;
  const period = 100;
  const wait = 5000;
  while (items.length > hitSet.size && t < wait) {
    for (const instance of Zotero.Reader._readers) {
      const hitItems = await initializeReaderAnnotationButton(instance);
      hitItems.forEach((item) => hitSet.add(item.id));
    }
    await Zotero.Promise.delay(period);
    t += period;
  }
}

async function initializeReaderSelectionEvent(
  instance: _ZoteroTypes.ReaderInstance,
) {
  await instance._initPromise;
  await instance._waitForReader();
  async function selectionCallback(ev: MouseEvent) {
    if (!ztoolkit.Reader.getSelectedText(instance)) {
      return false;
    }
    addon.data.translate.concatKey = ev.altKey;
    await addon.hooks.onReaderTextSelection(instance);
  }
  function addSelectionCallback(iframe: HTMLIFrameElement) {
    iframe.contentWindow?.addEventListener("pointerup", selectionCallback);
  }
  const container =
    instance._iframeWindow?.document?.querySelector("#split-view");
  if (!container) {
    return;
  }
  const observer = new (ztoolkit.getGlobal("MutationObserver"))((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeName === "IFRAME") {
            addSelectionCallback(node as HTMLIFrameElement);
          }
        }
      }
    }
  });
  observer.observe(container, {
    childList: true,
    subtree: true,
  });
  container.querySelectorAll("iframe").forEach(addSelectionCallback);
  addon.data.popup.observers.push(new WeakRef(observer));
}

async function initializeReaderAnnotationButton(
  instance: _ZoteroTypes.ReaderInstance,
): Promise<Zotero.Item[]> {
  if (!instance) {
    return [];
  }
  await instance._initPromise;
  await instance._waitForReader();
  const _document = instance._iframeWindow?.document;
  if (!_document) {
    return [];
  }
  const hitItems: Zotero.Item[] = [];
  for (const moreButton of Array.from(_document.querySelectorAll(".more"))) {
    if (moreButton.getAttribute("_pdftranslateInitialized") === "true") {
      continue;
    }
    moreButton.setAttribute("_pdftranslateInitialized", "true");

    let annotationWrapper = moreButton;
    while (!annotationWrapper.getAttribute("data-sidebar-annotation-id")) {
      annotationWrapper = annotationWrapper.parentElement!;
    }
    const itemKey =
      annotationWrapper.getAttribute("data-sidebar-annotation-id") || "";
    if (!instance.itemID) {
      continue;
    }
    const libraryID = Zotero.Items.get(instance.itemID).libraryID;
    const annotationItem = (await Zotero.Items.getByLibraryAndKeyAsync(
      libraryID,
      itemKey,
    )) as Zotero.Item;

    if (!annotationItem) {
      continue;
    }

    hitItems.push(annotationItem);

    ztoolkit.UI.insertElementBefore(
      {
        tag: "div",
        classList: ["icon"],
        properties: {
          innerHTML: SVGIcon,
        },
        listeners: [
          {
            type: "click",
            listener: (e) => {
              const task = addTranslateAnnotationTask(annotationItem.id);
              addon.hooks.onTranslate(task, {
                noCheckZoteroItemLanguage: true,
              });
              e.preventDefault();
            },
          },
          {
            type: "mouseover",
            listener: (e) => {
              (e.target as HTMLElement).style.backgroundColor = "#F0F0F0";
            },
          },
          {
            type: "mouseout",
            listener: (e) => {
              (e.target as HTMLElement).style.removeProperty(
                "background-color",
              );
            },
          },
        ],
        enableElementRecord: true,
      },
      moreButton,
    );
  }
  return hitItems;
}

async function unInitializeReaderAnnotationButton(
  instance: _ZoteroTypes.ReaderInstance,
): Promise<void> {
  if (!instance) {
    return;
  }
  await instance._initPromise;
  await instance._waitForReader();
  const _document = instance._iframeWindow?.document;
  if (!_document) {
    return;
  }
  for (const moreButton of Array.from(_document.querySelectorAll(".more"))) {
    if (moreButton.getAttribute("_pdftranslateInitialized") === "true") {
      moreButton.removeAttribute("_pdftranslateInitialized");
    }
  }
}
