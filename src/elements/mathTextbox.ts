import { renderMathInText, containsMath } from "../utils/mathRenderer";
import { getPref } from "../utils/prefs";

export class MathTextboxElement extends XULElementBase {
  private _textbox: XULTextBoxElement | null = null;
  private _overlay: HTMLElement | null = null;
  private _value: string = "";

  get content() {
    return MozXULElement.parseXULToFragment(`
      <editable-text id="inner-textbox" multiline="true" />
    `);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.init();
  }

  init(): void {
    this._textbox = this.querySelector("#inner-textbox") as XULTextBoxElement;
    if (!this._textbox) return;
    this._textbox.addEventListener("input", this._onInput);
    this._textbox.addEventListener("focus", this._onFocus);
    this._textbox.addEventListener("blur", this._onBlur);
  }

  set value(v: string) {
    this._value = v ?? "";
    if (this._textbox) this._textbox.value = this._value;
    this._updateOverlay();
  }
  get value() {
    return this._textbox?.value ?? this._value;
  }

  set placeholder(v: string) {
    if (this._textbox) this._textbox.placeholder = v;
  }

  focus(): void {
    this._textbox?.focus();
  }

  private _onInput = (e: Event) => {
    const val = (e.target as HTMLTextAreaElement).value;
    this._value = val;
    // do not redispatch input; bubble from inner editable-text already reaches panel listener
  };

  private _onFocus = () => {
    this._hideOverlay();
  };

  private _onBlur = () => {
    this._updateOverlay();
  };

  private _updateOverlay(): void {
    // Respect user preference gate
    const enabled = (getPref("enableMathRendering") as boolean) === true;
    if (!enabled || !this._value || !containsMath(this._value)) {
      this._hideOverlay();
      return;
    }
    this._showOverlay();
  }

  private _showOverlay(): void {
    if (this._overlay) this._overlay.remove();
    const HTML_NS = "http://www.w3.org/1999/xhtml";
    const overlay = document.createElementNS(
      HTML_NS,
      "div",
    ) as unknown as HTMLElement;
    overlay.className = "math-overlay";
    overlay.innerHTML = renderMathInText(document, this._value);
    overlay.addEventListener("click", () => {
      this._hideOverlay();
      this._textbox?.focus();
    });
    this._overlay = overlay;
    this.appendChild(overlay);
    this.toggleAttribute("overlay-visible", true);
  }

  private _hideOverlay(): void {
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
    this.toggleAttribute("overlay-visible", false);
  }

  destroy(): void {
    this._hideOverlay();
    if (this._textbox) {
      this._textbox.removeEventListener("input", this._onInput);
      this._textbox.removeEventListener("focus", this._onFocus);
      this._textbox.removeEventListener("blur", this._onBlur);
    }
  }
}
