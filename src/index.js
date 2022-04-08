import PDFTranslate from "./PDFTranslate";
import view from "./view";
import reader from "./reader";
import translate from "./translate";

PDFTranslate.view = view;
PDFTranslate.reader = reader;
PDFTranslate.translate = translate;

Zotero.ZoteroPDFTranslate = PDFTranslate;

window.addEventListener(
  "load",
  async function (e) {
    Zotero.ZoteroPDFTranslate.init();
  },
  false
);
