import { config } from "../../package.json";
import { SVGIcon } from "../utils/config";
import { addTranslateAnnotationTask } from "../utils/translate";

export function registerReaderInitializer() {
  ztoolkit.ReaderInstance.register(
    "initialized",
    `${config.addonRef}-selection`,
    initializeReaderSelectionEvent
  );
  ztoolkit.ReaderInstance.register(
    "initialized",
    `${config.addonRef}-annotationButtons`,
    initializeReaderAnnotationButton
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
    unInitializeReaderSelectionEvent(r);
  });
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
  instance: _ZoteroTypes.ReaderInstance
) {
  await instance._initPromise;
  await instance._waitForReader();
  if (instance._pdftranslateInitialized) {
    return;
  }
  instance._pdftranslateInitialized = true;
  function selectionCallback(ev: MouseEvent) {
    // Work around to only allow event from iframe#viewer
    const target = ev.target as Element;
    if (!target?.ownerDocument?.querySelector("#viewer")?.contains(target)) {
      return false;
    }
    addon.data.translate.concatKey = ev.altKey;
    addon.hooks.onReaderTextSelection(instance);
  }
  instance._iframeWindow?.addEventListener("pointerup", selectionCallback);
  instance._pdftranslateSelectionCallback = selectionCallback;
}

async function unInitializeReaderSelectionEvent(
  instance: _ZoteroTypes.ReaderInstance
): Promise<void> {
  await instance._initPromise;
  await instance._waitForReader();
  if (!instance._pdftranslateInitialized) {
    return;
  }
  instance._iframeWindow?.removeEventListener(
    "pointerup",
    instance._pdftranslateSelectionCallback
  );
  instance._pdftranslateInitialized = false;
}

async function initializeReaderAnnotationButton(
  instance: _ZoteroTypes.ReaderInstance
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
  for (const moreButton of _document.querySelectorAll(".more")) {
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
      itemKey
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
                "background-color"
              );
            },
          },
        ],
        enableElementRecord: true,
      },
      moreButton
    );
  }
  return hitItems;
}

async function unInitializeReaderAnnotationButton(
  instance: _ZoteroTypes.ReaderInstance
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
  for (const moreButton of _document.querySelectorAll(".more")) {
    if (moreButton.getAttribute("_pdftranslateInitialized") === "true") {
      moreButton.removeAttribute("_pdftranslateInitialized");
    }
  }
}
