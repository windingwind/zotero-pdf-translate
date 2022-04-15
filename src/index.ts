import PDFTranslate from "./PDFTranslate";

Zotero.ZoteroPDFTranslate = new PDFTranslate();

window.addEventListener(
  "load",
  async function (e) {
    Zotero.ZoteroPDFTranslate.events.onInit();
  },
  false
);
