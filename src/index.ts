import PDFTranslate from "./addon";

Zotero.ZoteroPDFTranslate = new PDFTranslate();

window.addEventListener(
  "load",
  async function (e) {
    Zotero.ZoteroPDFTranslate.events.onInit();
  },
  false
);
