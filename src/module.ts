import PDFTranslate from "./addon";

class AddonBase {
  protected _Addon: PDFTranslate;
  constructor(parent: PDFTranslate) {
    this._Addon = parent;
  }
}

export default AddonBase;
