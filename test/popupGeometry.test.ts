import {
  calculatePopupOffset,
  clampPopupRect,
  normalizeWheelDelta,
  resizePopupRect,
  type PopupRect,
  type PopupViewport,
  type ResizeEdge,
} from "../src/utils/popupGeometry";

const viewport = { width: 900, height: 700 };
const limits = { minWidth: 180, minHeight: 140, margin: 8 };
const start = { left: 120, top: 100, width: 260, height: 220 };
const edges: ResizeEdge[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
const right = (rect: PopupRect) => rect.left + rect.width;
const bottom = (rect: PopupRect) => rect.top + rect.height;

function assertFits(rect: PopupRect, view: PopupViewport) {
  for (const value of Object.values(rect))
    assert.isTrue(Number.isFinite(value));
  assert.isAtLeast(rect.left, -1e-9);
  assert.isAtLeast(rect.top, -1e-9);
  assert.isAtLeast(rect.width, 0);
  assert.isAtLeast(rect.height, 0);
  assert.isAtMost(right(rect), Math.max(0, view.width) + 1e-9);
  assert.isAtMost(bottom(rect), Math.max(0, view.height) + 1e-9);
}

function assertAnchored(
  initial: PopupRect,
  resized: PopupRect,
  edge: ResizeEdge,
) {
  if (edge.includes("w")) assert.strictEqual(right(resized), right(initial));
  else assert.strictEqual(resized.left, initial.left);
  if (edge.includes("n")) assert.strictEqual(bottom(resized), bottom(initial));
  else assert.strictEqual(resized.top, initial.top);
  if (!edge.includes("w") && !edge.includes("e"))
    assert.strictEqual(resized.width, initial.width);
  if (!edge.includes("n") && !edge.includes("s"))
    assert.strictEqual(resized.height, initial.height);
}

describe("Reader popup geometry", function () {
  it("preserves an already valid rectangle", function () {
    assert.deepEqual(clampPopupRect(start, viewport, limits), start);
  });

  it("fits dimensions and positions at all four viewport boundaries", function () {
    assert.deepEqual(
      clampPopupRect(
        { left: -100, top: -30, width: 60, height: 40 },
        viewport,
        limits,
      ),
      { left: 8, top: 8, width: 180, height: 140 },
    );
    assert.deepEqual(
      clampPopupRect(
        { left: 850, top: 680, width: 260, height: 220 },
        viewport,
        limits,
      ),
      { left: 632, top: 472, width: 260, height: 220 },
    );
    assert.deepEqual(
      clampPopupRect(
        { left: 100, top: 100, width: 2000, height: 2000 },
        viewport,
        limits,
      ),
      { left: 8, top: 8, width: 884, height: 684 },
    );
  });

  const expected: Record<ResizeEdge, PopupRect> = {
    n: { left: 120, top: 150, width: 260, height: 170 },
    ne: { left: 120, top: 150, width: 300, height: 170 },
    e: { left: 120, top: 100, width: 300, height: 220 },
    se: { left: 120, top: 100, width: 300, height: 270 },
    s: { left: 120, top: 100, width: 260, height: 270 },
    sw: { left: 160, top: 100, width: 220, height: 270 },
    w: { left: 160, top: 100, width: 220, height: 220 },
    nw: { left: 160, top: 150, width: 220, height: 170 },
  };
  for (const edge of edges) {
    it(`resizes the ${edge} edge without moving its opposite edges`, function () {
      const resized = resizePopupRect(start, edge, 40, 50, viewport, limits);
      assert.deepEqual(resized, expected[edge]);
      assertAnchored(start, resized, edge);
      assertFits(resized, viewport);
    });
  }

  it("stops expansion at the viewport edges", function () {
    const nw = resizePopupRect(start, "nw", -10000, -10000, viewport, limits);
    assert.deepEqual(nw, { left: 8, top: 8, width: 372, height: 312 });
    assertAnchored(start, nw, "nw");
    const se = resizePopupRect(start, "se", 10000, 10000, viewport, limits);
    assert.deepEqual(se, { left: 120, top: 100, width: 772, height: 592 });
    assertAnchored(start, se, "se");
  });

  it("stops at the minimum size instead of crossing the opposite edge", function () {
    assert.deepEqual(
      resizePopupRect(start, "nw", 10000, 10000, viewport, limits),
      { left: 200, top: 180, width: 180, height: 140 },
    );
    assert.deepEqual(
      resizePopupRect(start, "se", -10000, -10000, viewport, limits),
      { left: 120, top: 100, width: 180, height: 140 },
    );
  });

  it("relaxes margins and minimums in a reader smaller than the popup", function () {
    const small = { width: 100, height: 60 };
    const fitted = { left: 0, top: 0, width: 100, height: 60 };
    assert.deepEqual(clampPopupRect(start, small, limits), fitted);
    for (const edge of edges) {
      assert.deepEqual(
        resizePopupRect(start, edge, 2000, -2000, small, limits),
        fitted,
      );
    }
    assert.deepEqual(
      clampPopupRect(start, { width: 190, height: 150 }, limits),
      {
        left: 5,
        top: 5,
        width: 180,
        height: 140,
      },
    );
  });

  it("returns a finite empty rectangle for a zero-sized reader", function () {
    for (const edge of edges) {
      assert.deepEqual(
        resizePopupRect(
          start,
          edge,
          -100,
          100,
          { width: 0, height: 0 },
          limits,
        ),
        { left: 0, top: 0, width: 0, height: 0 },
      );
    }
  });

  it("handles non-finite dimensions and pointer deltas safely", function () {
    const invalid = { left: NaN, top: Infinity, width: -100, height: NaN };
    assert.deepEqual(clampPopupRect(invalid, viewport, limits), {
      left: 8,
      top: 8,
      width: 180,
      height: 140,
    });
    assert.deepEqual(
      resizePopupRect(start, "se", NaN, Infinity, viewport, limits),
      start,
    );
    assert.deepEqual(
      resizePopupRect(
        start,
        "unknown" as ResizeEdge,
        100,
        100,
        viewport,
        limits,
      ),
      start,
    );
    assert.deepEqual(
      clampPopupRect(
        invalid,
        { width: NaN, height: -1 },
        { minWidth: NaN, minHeight: Infinity, margin: -50 },
      ),
      { left: 0, top: 0, width: 0, height: 0 },
    );
  });

  it("keeps fractional drags anchored and bounded across reader sizes", function () {
    for (const view of [
      viewport,
      { width: 245, height: 161 },
      { width: 37, height: 21 },
    ]) {
      for (const input of [
        start,
        { left: -40, top: 1000, width: 999, height: 1000 },
        { left: 20, top: 30, width: 181, height: 142 },
      ]) {
        const initial = clampPopupRect(input, view, limits);
        for (const edge of edges)
          for (const dx of [-2000, -0.25, 0, 0.125, 2000])
            for (const dy of [-2000, -0.25, 0, 0.125, 2000]) {
              const resized = resizePopupRect(
                input,
                edge,
                dx,
                dy,
                view,
                limits,
              );
              assertFits(resized, view);
              assertAnchored(initial, resized, edge);
            }
      }
    }
  });
});

describe("Reader popup subpixel offsets", function () {
  it("stabilizes repeated fits without offsetLeft integer-rounding feedback", function () {
    const nativeTranslate = 300;
    const target = 300.2;
    let cssOffset = 0.4;
    for (let i = 0; i < 100; i++) {
      const actual = nativeTranslate + cssOffset;
      cssOffset = calculatePopupOffset(
        Number.parseFloat(`${cssOffset}px`),
        target - actual,
      );
      assert.closeTo(nativeTranslate + cssOffset, target, 1e-9);
      assert.closeTo(cssOffset, 0.2, 1e-9);
    }
  });

  it("preserves negative fractional offsets with a scaled reader", function () {
    const nativeTranslate = 20.365;
    const target = 8;
    const scale = 1.25;
    let cssOffset = -11.9833;
    for (let i = 0; i < 100; i++) {
      const actual = nativeTranslate + cssOffset * scale;
      cssOffset = calculatePopupOffset(cssOffset, target - actual, scale);
      assert.closeTo(nativeTranslate + cssOffset * scale, target, 1e-9);
    }
  });

  it("keeps offsets finite when a hidden or detached reader supplies invalid values", function () {
    assert.strictEqual(calculatePopupOffset(NaN, 5), 5);
    assert.strictEqual(calculatePopupOffset(0.4, Infinity), 0.4);
    assert.strictEqual(calculatePopupOffset(-0.25, 1, 0), 0.75);
    assert.strictEqual(calculatePopupOffset(-0.25, 1, NaN), 0.75);
    assert.strictEqual(calculatePopupOffset(0.4, 10, Number.MIN_VALUE), 0.4);
    assert.strictEqual(
      calculatePopupOffset(Number.MAX_VALUE, Number.MAX_VALUE),
      Number.MAX_VALUE,
    );
  });
});

describe("Reader popup wheel deltas", function () {
  it("supports pixel, line and page units without changing direction", function () {
    assert.strictEqual(normalizeWheelDelta(2.5, 0, 18, 300), 2.5);
    assert.strictEqual(normalizeWheelDelta(-2, 1, 18, 300), -36);
    assert.strictEqual(normalizeWheelDelta(0.5, 2, 18, 300), 150);
    assert.strictEqual(normalizeWheelDelta(-1.5, 2, 18, 300), -450);
  });

  it("preserves fine trackpad increments and rejects non-finite deltas", function () {
    assert.strictEqual(normalizeWheelDelta(0.125, 0, 18, 300), 0.125);
    assert.strictEqual(normalizeWheelDelta(-0.0078125, 0, 18, 300), -0.0078125);
    assert.strictEqual(normalizeWheelDelta(0.125, 1, 18, 300), 2.25);
    assert.strictEqual(normalizeWheelDelta(NaN, 1, 18, 300), 0);
    assert.strictEqual(normalizeWheelDelta(2, 1, NaN, 300), 32);
    assert.strictEqual(normalizeWheelDelta(2, 2, 18, NaN), 36);
    assert.strictEqual(normalizeWheelDelta(0.5, 99, 18, 300), 0.5);
    assert.isTrue(
      Number.isFinite(normalizeWheelDelta(Number.MAX_VALUE, 2, 18, 300)),
    );
  });
});
