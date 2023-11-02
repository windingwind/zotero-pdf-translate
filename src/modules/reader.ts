import { config } from "../../package.json";
import { SVGIcon } from "../utils/config";
import { addTranslateAnnotationTask } from "../utils/task";

export function registerReaderInitializer() {
  Zotero.Reader.registerEventListener(
    "renderTextSelectionPopup",
    (event) => {
      const { reader, doc, params, append } = event;
      addon.data.translate.selectedText = params.annotation.text.trim();
      addon.hooks.onReaderPopupShow(event);
    },
    config.addonID,
  );

  Zotero.Reader.registerEventListener(
    "renderSidebarAnnotationHeader",
    (event) => {
      const { reader, doc, params, append } = event;
      const annotationData = params.annotation;
      const annotationItem = Zotero.Items.getByLibraryAndKey(
        annotationData.libraryID,
        annotationData.id,
      ) as Zotero.Item;

      if (!annotationItem) {
        return;
      }
      const itemID = annotationItem.id;

      append(
        ztoolkit.UI.createElement(doc, "div", {
          id: `pdftranslate-translate-annotation-${itemID}`,
          classList: ["icon"],
          properties: {
            innerHTML: SVGIcon,
          },
          listeners: [
            {
              type: "click",
              listener: (e) => {
                const task = addTranslateAnnotationTask(itemID);
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
          enableElementRecord: false,
          ignoreIfExists: true,
        }),
      );
    },
    config.addonID,
  );
}
