import { config } from "../../package.json";
import { renderMathInText, shouldRenderMath } from "../utils/mathRenderer";
import { getPref } from "../utils/prefs";

export class MathTextboxElement extends XULElementBase {
  private _textbox: XULTextBoxElement | null = null;
  private _overlay: HTMLElement | null = null;
  private _overlayFrame: number | null = null;
  private _value: string = "";

  get content() {
    return MozXULElement.parseXULToFragment(`
      <editable-text id="inner-textbox" multiline="true" />
      <linkset>
        <html:link
          rel="stylesheet"
          href="chrome://${config.addonRef}/content/styles/mathTextbox.css"
        ></html:link>
        <html:link
          rel="stylesheet"
          href="chrome://${config.addonRef}/content/styles/katex.min.css"
        ></html:link>
      </linkset>
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
    if (!shouldRenderMath(this._value, enabled)) {
      this._hideOverlay();
      return;
    }
    this._showOverlay();
  }

  private _showOverlay(): void {
    const overlay = this._ensureOverlay();
    overlay.style.display = "block";
    this.toggleAttribute("overlay-visible", true);
    this._scheduleOverlayRender();
  }

  private _hideOverlay(): void {
    if (this._overlay) {
      this._cancelOverlayRender();
      this._overlay.innerHTML = "";
      this._overlay.style.display = "none";
    }
    this.toggleAttribute("overlay-visible", false);
  }

  private _ensureOverlay(): HTMLElement {
    if (this._overlay) {
      return this._overlay;
    }
    const HTML_NS = "http://www.w3.org/1999/xhtml";
    const doc = this.ownerDocument;
    const overlay = doc.createElementNS(
      HTML_NS,
      "div",
    ) as unknown as HTMLElement;
    overlay.className = "math-overlay";
    overlay.style.display = "none";
    overlay.addEventListener("click", () => {
      this._hideOverlay();
      this._textbox?.focus();
    });
    this._overlay = overlay;
    this.appendChild(overlay);
    return overlay;
  }

  private _scheduleOverlayRender(): void {
    if (this._overlayFrame !== null) {
      return;
    }
    const win = this.ownerDocument.defaultView;
    const render = () => {
      this._overlayFrame = null;
      if (!this._overlay) {
        return;
      }
      this._overlay.innerHTML = renderMathInText(
        this.ownerDocument,
        this._value,
      );
    };
    if (win?.requestAnimationFrame) {
      this._overlayFrame = win.requestAnimationFrame(render);
      return;
    }
    render();
  }

  private _cancelOverlayRender(): void {
    if (this._overlayFrame === null) {
      return;
    }
    this.ownerDocument.defaultView?.cancelAnimationFrame?.(this._overlayFrame);
    this._overlayFrame = null;
  }

  destroy(): void {
    this._cancelOverlayRender();
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
    this.toggleAttribute("overlay-visible", false);
    if (this._textbox) {
      this._textbox.removeEventListener("input", this._onInput);
      this._textbox.removeEventListener("focus", this._onFocus);
      this._textbox.removeEventListener("blur", this._onBlur);
    }
  }
}
