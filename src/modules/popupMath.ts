import { config } from "../../package.json";
import { containsMath, renderMathInText } from "../utils/mathRenderer";

const HTML_NS = "http://www.w3.org/1999/xhtml";
const overlayClass = `${config.addonRef}-popup-math`;
type MathOverlay = HTMLDivElement & {
  pendingText?: string;
  renderedText?: string;
  renderFrame?: number;
  enabled?: boolean;
};

/** Keep the source textarea for editing/copying, rendering only complete math. */
export function updatePopupMath(
  popup: HTMLDivElement,
  textarea: HTMLTextAreaElement,
  enabled: boolean,
  copy: (text: string) => void,
  options: {
    rememberSize?: boolean;
    onResize?: (event: MouseEvent) => void;
    label?: string;
  } = {},
): void {
  const doc = popup.ownerDocument;
  const win = doc.defaultView!;
  let overlay = popup.querySelector<MathOverlay>(`.${overlayClass}`);
  if (overlay) overlay.enabled = enabled;
  const visible =
    enabled &&
    !textarea.hidden &&
    doc.activeElement !== textarea &&
    containsMath(textarea.value);
  if (!visible) {
    if (overlay) {
      overlay.hidden = true;
      if (overlay.renderFrame) win.cancelAnimationFrame(overlay.renderFrame);
      overlay.renderFrame = undefined;
    }
    textarea.style.removeProperty("display");
    return;
  }

  if (!overlay) {
    overlay = doc.createElementNS(HTML_NS, "div") as MathOverlay;
    overlay.className = `${overlayClass} ${config.addonRef}-readerpopup`;
    overlay.enabled = enabled;
    overlay.tabIndex = 0;
    overlay.setAttribute("role", "region");
    overlay.setAttribute(
      "aria-label",
      options.label || textarea.getAttribute("aria-label") || "Translation",
    );
    Object.assign(overlay.style, {
      fontFamily: "inherit",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      minWidth: "184px",
      maxWidth: "calc(100vw - 40px)",
      maxHeight: "50vh",
      overflow: "auto",
      resize: "both",
      boxSizing: "border-box",
      marginInline: "2px",
      padding: "5px",
      borderRadius: "6px",
      background: "var(--color-sidepane)",
    });
    overlay.addEventListener("pointerup", (e) => e.stopPropagation());
    overlay.addEventListener("mousedown", (e) => e.stopPropagation());
    overlay.addEventListener("mouseup", (e) => {
      textarea.style.width = overlay!.style.width;
      if (overlay!.style.height) textarea.style.height = overlay!.style.height;
      options.onResize?.(e);
    });
    overlay.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      copy(textarea.value);
    });
    overlay.addEventListener("keydown", (e) => {
      const selection = win.getSelection();
      const selectionInside = Boolean(
        selection?.toString() &&
        overlay!.contains(selection.anchorNode) &&
        overlay!.contains(selection.focusNode),
      );
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "c" &&
        !selectionInside
      ) {
        e.preventDefault();
        e.stopPropagation();
        copy(textarea.value);
      }
      if (e.key === "F2") {
        e.preventDefault();
        e.stopPropagation();
        overlay!.hidden = true;
        textarea.style.removeProperty("display");
        textarea.focus();
      }
    });
    textarea.addEventListener("blur", () =>
      updatePopupMath(
        popup,
        textarea,
        Boolean(overlay!.enabled),
        copy,
        options,
      ),
    );
    textarea.after(overlay);
    for (const stylesheet of ["katex.min.css", "popupMath.css"]) {
      if (doc.querySelector(`link[data-popup-math="${stylesheet}"]`)) continue;
      const link = doc.createElementNS(HTML_NS, "link") as HTMLLinkElement;
      link.rel = "stylesheet";
      link.href = `chrome://${config.addonRef}/content/styles/${stylesheet}`;
      link.dataset.popupMath = stylesheet;
      (doc.head || doc.documentElement).appendChild(link);
    }
  }

  const task = popup.getAttribute("translate-task-id") || "";
  if (overlay.dataset.task !== task) {
    overlay.dataset.task = task;
    overlay.style.width = options.rememberSize
      ? textarea.style.width
      : `${Math.min(680, Math.max(184, textarea.getBoundingClientRect().width))}px`;
    if (options.rememberSize) overlay.style.height = textarea.style.height;
    else overlay.style.removeProperty("height");
  }
  overlay.style.fontSize = textarea.style.fontSize;
  overlay.style.lineHeight = textarea.style.lineHeight;
  overlay.style.direction = textarea.style.direction;
  overlay.hidden = false;
  textarea.style.display = "none";
  overlay.pendingText = textarea.value;
  if (overlay.renderFrame) return;
  overlay.renderFrame = win.requestAnimationFrame(() => {
    overlay!.renderFrame = undefined;
    if (!overlay!.isConnected || overlay!.hidden) return;
    const text = overlay!.pendingText!;
    if (overlay!.renderedText === text) return;
    overlay!.innerHTML = renderMathInText(doc, text);
    overlay!.renderedText = text;
  });
}
