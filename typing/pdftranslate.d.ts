declare interface PDFTranslate {
  events: import("../src/events");
  view: import("../src/view");
  reader: import("../src/reader");
  translate: import("../src/translate");
  _selectedText: string;
  _sourceText: string;
  _translatedText: string;
  _debug: string;
}

interface TransArgs {
  secret: string;
  sl: string;
  tl: string;
  text: string;
}
