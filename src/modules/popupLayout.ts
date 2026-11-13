import {
  calculatePopupOffset,
  clampPopupRect,
  normalizeWheelDelta,
  resizePopupRect,
  type PopupRect,
  type ResizeEdge,
} from "../utils/popupGeometry";

type Size = { width: number; height: number };
type Options = {
  resizeLabel: string;
  initialSize?: Size;
  autoSize?: boolean;
  onResize?: (width: number, height: number) => void;
  onDispose?: () => void;
};
type Styles = Partial<CSSStyleDeclaration>;
const MIN_WIDTH = 200;
const MIN_TEXT_HEIGHT = 40;
const MARGIN = 8;

/** Own only the translation popup's layout; leave its native transform intact. */
export function createPopupLayout(
  popup: HTMLDivElement,
  textarea: HTMLTextAreaElement,
  options: Options,
) {
  const doc = popup.ownerDocument;
  const win = doc.defaultView!;
  const originalRect = popup.getBoundingClientRect();
  const savedStyles = new Map<HTMLElement, Map<string, string>>();
  const removeListeners: Array<() => void> = [];
  const handles: HTMLElement[] = [];
  let disposed = false;
  let frame: number | undefined;
  let nativeTransform = popup.style.transform;
  let userSized = !!options.initialSize;
  let expandedSize = options.initialSize;
  let compact = false;
  let drag:
    | {
        edge: ResizeEdge;
        pointerId: number;
        x: number;
        y: number;
        start: PopupRect;
        handle: HTMLElement;
        changed: boolean;
      }
    | undefined;

  function styles(element: HTMLElement, values: Styles) {
    let original = savedStyles.get(element);
    if (!original) savedStyles.set(element, (original = new Map()));
    for (const [key, value] of Object.entries(values)) {
      const style = element.style as unknown as Record<string, string>;
      if (!original.has(key)) original.set(key, style[key] || "");
      if (style[key] !== value) style[key] = value as string;
    }
  }
  function listen(
    target: EventTarget,
    type: string,
    listener: EventListener,
    listenerOptions?: AddEventListenerOptions | boolean,
  ) {
    target.addEventListener(type, listener, listenerOptions);
    removeListeners.push(() =>
      target.removeEventListener(type, listener, listenerOptions),
    );
  }
  function visible() {
    return (
      !textarea.hidden && win.getComputedStyle(textarea)?.display !== "none"
    );
  }
  function scale() {
    const rect = popup.getBoundingClientRect();
    const css = win.getComputedStyle(popup);
    // offsetWidth/Height are rounded integers, including at fractional zoom.
    return {
      x: rect.width / Number.parseFloat(css?.width || "") || 1,
      y: rect.height / Number.parseFloat(css?.height || "") || 1,
    };
  }
  function bounds() {
    const viewport = popup.closest(".primary-view, .secondary-view");
    const rect = viewport?.getBoundingClientRect();
    const width = doc.documentElement.clientWidth;
    const height = doc.documentElement.clientHeight;
    const left = Math.max(0, rect?.left || 0);
    const top = Math.max(0, rect?.top || 0);
    return {
      left,
      top,
      width: Math.max(0, Math.min(width, rect?.right ?? width) - left),
      height: Math.max(0, Math.min(height, rect?.bottom ?? height) - top),
    };
  }
  function localRect(): PopupRect {
    const rect = popup.getBoundingClientRect();
    const area = bounds();
    return {
      left: rect.left - area.left,
      top: rect.top - area.top,
      width: rect.width,
      height: rect.height,
    };
  }
  function limits() {
    const zoom = scale();
    const chrome =
      popup.getBoundingClientRect().height -
      textarea.getBoundingClientRect().height;
    return {
      minWidth: MIN_WIDTH * zoom.x,
      minHeight:
        Math.max(0, chrome) + (visible() ? MIN_TEXT_HEIGHT * zoom.y : 0),
      margin: MARGIN,
    };
  }
  function applyRect(rect: PopupRect) {
    const zoom = scale();
    styles(popup, {
      width: `${rect.width / zoom.x}px`,
      height: `${rect.height / zoom.y}px`,
    });
    const area = bounds();
    const current = popup.getBoundingClientRect();
    const css = win.getComputedStyle(popup);
    const left = Number.parseFloat(popup.style.left || css?.left || "") || 0;
    const top = Number.parseFloat(popup.style.top || css?.top || "") || 0;
    const dx = area.left + rect.left - current.left;
    const dy = area.top + rect.top - current.top;
    if (Math.abs(dx) > 0.02)
      styles(popup, { left: `${calculatePopupOffset(left, dx, zoom.x)}px` });
    if (Math.abs(dy) > 0.02)
      styles(popup, { top: `${calculatePopupOffset(top, dy, zoom.y)}px` });
  }
  function fitToViewport() {
    if (disposed || drag || !popup.isConnected || !textarea.isConnected) return;
    const area = bounds();
    const rect = localRect();
    if (!area.width || !area.height || !rect.width || !rect.height) return;
    applyRect(clampPopupRect(rect, area, limits()));
  }
  function scheduleFit() {
    if (disposed || frame !== undefined) return;
    frame = win.requestAnimationFrame(() => {
      frame = undefined;
      fitToViewport();
    });
  }
  function finishDrag() {
    const previous = drag;
    if (!previous) return;
    drag = undefined;
    try {
      if (previous.handle.hasPointerCapture(previous.pointerId))
        previous.handle.releasePointerCapture(previous.pointerId);
    } catch {
      // The native reader can remove the popup during pointer capture.
    }
    fitToViewport();
    if (previous.changed && popup.isConnected && textarea.isConnected) {
      const rect = popup.getBoundingClientRect();
      const zoom = scale();
      if (rect.width && rect.height) {
        expandedSize = {
          width: rect.width / zoom.x,
          height: rect.height / zoom.y,
        };
        options.onResize?.(expandedSize.width, expandedSize.height);
      }
    }
  }
  function onMove(event: Event) {
    const e = event as PointerEvent;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = resizePopupRect(
      drag.start,
      drag.edge,
      e.clientX - drag.x,
      e.clientY - drag.y,
      bounds(),
      limits(),
    );
    drag.changed ||=
      Math.abs(rect.width - drag.start.width) > 0.02 ||
      Math.abs(rect.height - drag.start.height) > 0.02;
    if (drag.changed) userSized = true;
    applyRect(rect);
  }
  function onEnd(event: Event) {
    if (!drag || (event as PointerEvent).pointerId !== drag.pointerId) return;
    event.stopPropagation();
    finishDrag();
  }

  styles(popup, {
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    minWidth: "0",
    minHeight: "0",
    maxWidth: "none",
    maxHeight: "none",
    overflow: "visible",
  });
  const chain: HTMLElement[] = [];
  for (
    let parent = textarea.parentElement;
    parent && parent !== popup;
    parent = parent.parentElement
  ) {
    chain.push(parent);
    styles(parent, {
      display: "flex",
      flexDirection: "column",
      flex: "1 1 auto",
      minHeight: "0",
      minWidth: "0",
      maxHeight: "none",
      overflow: "hidden",
    });
  }
  for (const parent of [popup, ...chain]) {
    for (const child of Array.from(parent.children) as HTMLElement[]) {
      if (child !== textarea && !chain.includes(child))
        styles(child, { flexShrink: "0" });
    }
  }
  styles(textarea, {
    flex: "1 1 0",
    width: "calc(100% - 4px)",
    height: "auto",
    boxSizing: "border-box",
    minWidth: "0",
    minHeight: "0",
    maxHeight: "none",
    resize: "none",
    overflowX: "hidden",
    overflowY: "auto",
    overscrollBehavior: "contain",
    scrollbarGutter: "stable",
  });

  const edges: Record<ResizeEdge, Styles> = {
    n: {
      top: "-4px",
      left: "10px",
      right: "10px",
      height: "8px",
      cursor: "ns-resize",
    },
    s: {
      bottom: "-4px",
      left: "10px",
      right: "10px",
      height: "8px",
      cursor: "ns-resize",
    },
    e: {
      right: "-4px",
      top: "10px",
      bottom: "10px",
      width: "8px",
      cursor: "ew-resize",
    },
    w: {
      left: "-4px",
      top: "10px",
      bottom: "10px",
      width: "8px",
      cursor: "ew-resize",
    },
    ne: {
      right: "-4px",
      top: "-4px",
      width: "14px",
      height: "14px",
      cursor: "nesw-resize",
    },
    nw: {
      left: "-4px",
      top: "-4px",
      width: "14px",
      height: "14px",
      cursor: "nwse-resize",
    },
    se: {
      right: "-4px",
      bottom: "-4px",
      width: "14px",
      height: "14px",
      cursor: "nwse-resize",
    },
    sw: {
      left: "-4px",
      bottom: "-4px",
      width: "14px",
      height: "14px",
      cursor: "nesw-resize",
    },
  };
  for (const edge of Object.keys(edges) as ResizeEdge[]) {
    const handle = doc.createElement("div");
    handle.dataset.popupResize = edge;
    handle.title = options.resizeLabel;
    handle.setAttribute("aria-label", options.resizeLabel);
    Object.assign(handle.style, {
      position: "absolute",
      zIndex: "2",
      touchAction: "none",
      userSelect: "none",
      ...edges[edge],
    });
    if (edge === "se") {
      const grip = doc.createElement("span");
      Object.assign(grip.style, {
        position: "absolute",
        right: "4px",
        bottom: "4px",
        width: "7px",
        height: "7px",
        borderRight: "2px solid var(--color-icon, #8c96a3)",
        borderBottom: "2px solid var(--color-icon, #8c96a3)",
        pointerEvents: "none",
      });
      handle.append(grip);
    }
    listen(handle, "pointerdown", (event) => {
      const e = event as PointerEvent;
      if (disposed || e.button !== 0 || !visible()) return;
      e.preventDefault();
      e.stopPropagation();
      finishDrag();
      fitToViewport();
      drag = {
        edge,
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        start: localRect(),
        handle,
        changed: false,
      };
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        /* Document listeners are the fallback. */
      }
    });
    listen(handle, "lostpointercapture", onEnd);
    for (const type of ["mousedown", "mouseup", "click", "dblclick"])
      listen(handle, type, (event) => event.stopPropagation());
    popup.append(handle);
    handles.push(handle);
  }
  listen(doc, "pointermove", onMove, true);
  listen(doc, "pointerup", onEnd, true);
  listen(doc, "pointercancel", onEnd, true);
  listen(win, "blur", finishDrag);
  listen(win, "resize", scheduleFit);
  listen(win, "unload", dispose);
  listen(
    textarea,
    "wheel",
    (event) => {
      const e = event as WheelEvent;
      e.stopPropagation();
      const maximum = Math.max(
        0,
        textarea.scrollHeight - textarea.clientHeight,
      );
      if (
        e.ctrlKey ||
        e.metaKey ||
        !maximum ||
        (e.deltaY < 0 && textarea.scrollTop <= 0) ||
        (e.deltaY > 0 && textarea.scrollTop >= maximum - 0.01)
      )
        e.preventDefault();
    },
    { passive: false },
  );
  listen(
    popup,
    "wheel",
    (event) => {
      const e = event as WheelEvent;
      e.preventDefault();
      e.stopPropagation();
      if (
        !visible() ||
        e.ctrlKey ||
        e.metaKey ||
        (e.target as Element)?.closest("button, select, input, a")
      )
        return;
      const delta = normalizeWheelDelta(
        e.deltaY,
        e.deltaMode,
        Number.parseFloat(win.getComputedStyle(textarea)?.lineHeight || ""),
        textarea.clientHeight,
      );
      textarea.scrollTop = Math.min(
        Math.max(0, textarea.scrollHeight - textarea.clientHeight),
        Math.max(0, textarea.scrollTop + delta),
      );
    },
    { passive: false },
  );

  const observer = new win.MutationObserver(() => {
    if (!popup.isConnected || !textarea.isConnected) return dispose();
    // Ignore our own size/offset writes: they must not schedule another fit.
    if (popup.style.transform !== nativeTransform) {
      nativeTransform = popup.style.transform;
      scheduleFit();
    }
  });
  for (
    let parent = textarea.parentElement;
    parent;
    parent = parent.parentElement
  )
    observer.observe(parent, { childList: true });
  observer.observe(popup, {
    childList: true,
    attributes: true,
    attributeFilter: ["style"],
  });
  const resizeObserver = new win.ResizeObserver(scheduleFit);
  resizeObserver.observe(
    popup.closest(".primary-view, .secondary-view") || doc.documentElement,
  );

  function update(autoSize = options.autoSize !== false) {
    if (disposed || drag || !popup.isConnected || !textarea.isConnected) return;
    const shown = visible();
    for (const handle of handles) handle.hidden = !shown;
    if (!shown) {
      compact = true;
      styles(popup, { height: "auto" });
      fitToViewport();
      return;
    }
    if (compact && expandedSize) {
      const zoom = scale();
      applyRect(
        clampPopupRect(
          {
            ...localRect(),
            width: expandedSize.width * zoom.x,
            height: expandedSize.height * zoom.y,
          },
          bounds(),
          limits(),
        ),
      );
    }
    compact = false;
    if (autoSize && !userSized) {
      styles(textarea, { flex: "0 0 auto", height: "0px" });
      styles(popup, { height: "auto" });
      const area = bounds();
      const zoom = scale();
      let width = Math.max(MIN_WIDTH * zoom.x, localRect().width);
      const maximumWidth = Math.max(0, area.width - 2 * MARGIN);
      // Preserve the existing text-aspect heuristic, with a bounded loop.
      for (
        let step = 0;
        step < 64 &&
        width < maximumWidth &&
        textarea.scrollHeight / Math.max(1, textarea.clientWidth) > 0.75;
        step++
      ) {
        width = Math.min(maximumWidth, width + 20 * zoom.x);
        styles(popup, { width: `${width / zoom.x}px` });
      }
      const chrome =
        popup.getBoundingClientRect().height -
        textarea.getBoundingClientRect().height;
      const height = chrome + textarea.scrollHeight * zoom.y;
      styles(textarea, { flex: "1 1 0", height: "auto" });
      applyRect(
        clampPopupRect({ ...localRect(), width, height }, area, limits()),
      );
    }
    fitToViewport();
    scheduleFit();
  }
  function dispose() {
    if (disposed) return;
    finishDrag();
    disposed = true;
    if (frame !== undefined) win.cancelAnimationFrame(frame);
    observer.disconnect();
    resizeObserver.disconnect();
    for (const remove of removeListeners) remove();
    for (const handle of handles) handle.remove();
    for (const [element, original] of savedStyles)
      for (const [key, value] of original)
        (element.style as unknown as Record<string, string>)[key] = value;
    options.onDispose?.();
  }
  const zoom = scale();
  applyRect(
    clampPopupRect(
      {
        ...localRect(),
        width: options.initialSize
          ? options.initialSize.width * zoom.x
          : originalRect.width,
        height: options.initialSize
          ? options.initialSize.height * zoom.y
          : originalRect.height,
      },
      bounds(),
      limits(),
    ),
  );
  update();
  return { update, fitToViewport, dispose };
}

/** Keep the reading/copy position stable during status-only and streaming updates. */
export function updatePopupText(
  textarea: HTMLTextAreaElement,
  value: string,
  reset: boolean,
) {
  if (value === textarea.value && !reset) return;
  const oldValue = textarea.value;
  const top = textarea.scrollTop;
  const left = textarea.scrollLeft;
  const maximum = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
  const followEnd =
    maximum > 0 && top >= maximum - 1 && value.startsWith(oldValue);
  const start = textarea.selectionStart,
    end = textarea.selectionEnd;
  if (value !== oldValue) textarea.value = value;
  textarea.scrollTop = reset ? 0 : followEnd ? textarea.scrollHeight : top;
  textarea.scrollLeft = reset ? 0 : left;
  if (!reset && start !== end)
    textarea.setSelectionRange(
      Math.min(start, value.length),
      Math.min(end, value.length),
    );
}
