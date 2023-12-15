import { config } from "../../package.json";
import { SVGIcon } from "../utils/config";
import { addTranslateAnnotationTask } from "../utils/task";

export function registerReaderInitializer() {
  Zotero.Reader.registerEventListener(
    "renderTextSelectionPopup",
    (event) => {
      const { reader, doc, params, append } = event;
      ////////////////////////////////////////////////////////////////////
      // addon.data.translate.selectedText = params.annotation.text.trim();
      addon.data.translate.selectedText = "I love bananas. It is nice!!";
      ////////////////////////////////////////////////////////////////////
      addon.hooks.onReaderPopupShow(event);
    },
    config.addonID,
  );

  Zotero.Reader.registerEventListener(
    "renderSidebarAnnotationHeader",
    (event) => {
      const { reader, doc, params, append } = event;
      const annotationData = params.annotation;

      append(
        ztoolkit.UI.createElement(doc, "div", {
          classList: ["icon"],
          properties: {
            innerHTML: SVGIcon,
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
