class TransBase {
  protected _PDFTranslate: PDFTranslate;
  constructor(parent: PDFTranslate) {
    this._PDFTranslate = parent;
  }
}

export {TransBase}