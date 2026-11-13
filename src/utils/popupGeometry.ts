export type ResizeEdge = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export interface PopupRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PopupViewport {
  width: number;
  height: number;
}

export interface PopupLimits {
  minWidth: number;
  minHeight: number;
  margin: number;
}

const resizeEdges = new Set<ResizeEdge>([
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
  "nw",
]);

function finite(value: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function between(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * All coordinates use viewport CSS pixels. Relax margins before reducing the
 * effective minimum size, so a small reader can still contain the entire popup.
 */
function bounds(viewport: PopupViewport, limits: PopupLimits) {
  const viewportWidth = Math.max(0, finite(viewport.width, 0));
  const viewportHeight = Math.max(0, finite(viewport.height, 0));
  const minWidth = Math.min(
    Math.max(0, finite(limits.minWidth, 240)),
    viewportWidth,
  );
  const minHeight = Math.min(
    Math.max(0, finite(limits.minHeight, 160)),
    viewportHeight,
  );
  const margin = Math.max(0, finite(limits.margin, 8));
  const left = Math.min(margin, Math.max(0, (viewportWidth - minWidth) / 2));
  const top = Math.min(margin, Math.max(0, (viewportHeight - minHeight) / 2));
  return {
    left,
    top,
    right: viewportWidth - left,
    bottom: viewportHeight - top,
    minWidth,
    minHeight,
  };
}

/** Fit a preferred rectangle without negative or non-finite dimensions. */
export function clampPopupRect(
  rect: PopupRect,
  viewport: PopupViewport,
  limits: PopupLimits,
): PopupRect {
  const area = bounds(viewport, limits);
  const width = between(
    finite(rect.width, area.minWidth),
    area.minWidth,
    area.right - area.left,
  );
  const height = between(
    finite(rect.height, area.minHeight),
    area.minHeight,
    area.bottom - area.top,
  );
  return {
    left: between(finite(rect.left, area.left), area.left, area.right - width),
    top: between(finite(rect.top, area.top), area.top, area.bottom - height),
    width,
    height,
  };
}

/** Drag an edge or corner while keeping the opposite edges anchored. */
export function resizePopupRect(
  start: PopupRect,
  edge: ResizeEdge,
  dx: number,
  dy: number,
  viewport: PopupViewport,
  limits: PopupLimits,
): PopupRect {
  const initial = clampPopupRect(start, viewport, limits);
  if (!resizeEdges.has(edge)) return initial;
  const area = bounds(viewport, limits);
  dx = finite(dx, 0);
  dy = finite(dy, 0);
  let left = initial.left,
    top = initial.top;
  let right = left + initial.width,
    bottom = top + initial.height;
  if (edge.includes("w"))
    left = between(left + dx, area.left, right - area.minWidth);
  if (edge.includes("e"))
    right = between(right + dx, left + area.minWidth, area.right);
  if (edge.includes("n"))
    top = between(top + dy, area.top, bottom - area.minHeight);
  if (edge.includes("s"))
    bottom = between(bottom + dy, top + area.minHeight, area.bottom);
  return { left, top, width: right - left, height: bottom - top };
}

/**
 * Apply a viewport delta to a continuous CSS offset, e.g. parseFloat(style.left).
 * Do not pass offsetLeft/offsetTop: their integer rounding can make repeated
 * viewport fitting alternate between two positions when the anchor is fractional.
 */
export function calculatePopupOffset(
  currentOffset: number,
  delta: number,
  scale: number = 1,
): number {
  const current = finite(currentOffset, 0);
  const factor = finite(scale, 1);
  const next = current + finite(delta, 0) / (factor > 0 ? factor : 1);
  return Number.isFinite(next) ? next : current;
}

/** Convert WheelEvent units without rounding away small trackpad deltas. */
export function normalizeWheelDelta(
  deltaY: number,
  deltaMode: number,
  lineHeight: number = 16,
  pageHeight: number = lineHeight,
): number {
  const delta = finite(deltaY, 0);
  const line = finite(lineHeight, 16) > 0 ? finite(lineHeight, 16) : 16;
  const page = finite(pageHeight, line) > 0 ? finite(pageHeight, line) : line;
  const scale = deltaMode === 1 ? line : deltaMode === 2 ? page : 1;
  const pixels = delta * scale;
  return Number.isFinite(pixels) ? pixels : Math.sign(delta) * Number.MAX_VALUE;
}
