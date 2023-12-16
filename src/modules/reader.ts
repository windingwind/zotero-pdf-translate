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
      const item = ZoteroPane.getSelectedItems()[0];
      var abstract = item.getField("abstractNote");
      // addon.data.translate.selectedText = "I love bananas. It is nice!!";
      addon.data.translate.selectedText = abstract.toString();
      ////////////////////////////////////////////////////////////////////
      addon.hooks.onReaderPopupShow(event);
    },
    config.addonID,
  );
}
