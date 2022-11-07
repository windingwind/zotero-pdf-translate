import TransEvents from "./events";
import TransView from "./view";
import TransLocale from "./locale";
import TransReader from "./reader";
import TransEngine from "./translate";
import TransPref from "./prefs";

class PDFTranslate {
  _selectedText: string;
  _sourceText: string;
  _translatedText: string;
  _debug: string;
  public events: TransEvents;
  public view: TransView;
  public reader: TransReader;
  public translate: TransEngine;
  public prefs: TransPref;
  public locale: TransLocale;

  constructor() {
    this._selectedText = "";
    this._sourceText = "";
    this._translatedText = "";
    this._debug = "";
    this.events = new TransEvents(this);
    this.view = new TransView(this);
    this.reader = new TransReader(this);
    this.translate = new TransEngine(this);
    this.prefs = new TransPref(this);
    this.locale = new TransLocale(this);
  }
}

export default PDFTranslate;
