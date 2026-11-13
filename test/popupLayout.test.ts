import { createPopupLayout, updatePopupText } from "../src/modules/popupLayout";
import type { ResizeEdge } from "../src/utils/popupGeometry";

type Layout = ReturnType<typeof createPopupLayout>;
type FrameWindow = Window & typeof globalThis;

describe("Reader popup layout in the browser DOM", function () {
  this.timeout(15000);

  let iframe: HTMLIFrameElement;
  let doc: Document;
  let win: FrameWindow;
  let nativeFrame: Window["requestAnimationFrame"];
  let frameRequests: number;
  let area: HTMLDivElement;
  let popup: HTMLDivElement;
  let textarea: HTMLTextAreaElement;
  let noteButton: HTMLButtonElement;
  let layout: Layout | undefined;
  let saved: Array<{ width: number; height: number }>;

  async function frames(count = 2) {
    for (let i = 0; i < count; i++) {
      await new Promise<void>((resolve) => nativeFrame(() => resolve()));
    }
  }

  function rect() {
    const p = popup.getBoundingClientRect();
    const a = area.getBoundingClientRect();
    return {
      left: p.left - a.left,
      top: p.top - a.top,
      right: p.right - a.left,
      bottom: p.bottom - a.top,
      width: p.width,
      height: p.height,
    };
  }

  function pointer(
    target: EventTarget,
    type: string,
    x: number,
    y: number,
    pointerId = 7,
  ) {
    const event = new win.PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: "mouse",
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
      clientX: x,
      clientY: y,
    });
    target.dispatchEvent(event);
    return event;
  }

  function handle(edge: ResizeEdge) {
    const node = popup.querySelector<HTMLElement>(
      `[data-popup-resize="${edge}"]`,
    );
    assert.exists(node, `missing ${edge} resize handle`);
    return node!;
  }

  function drag(edge: ResizeEdge, dx: number, dy: number) {
    const target = handle(edge);
    const bounds = target.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    pointer(target, "pointerdown", x, y);
    // Synthetic pointer IDs cannot acquire native pointer capture. Dispatching
    // on the document exercises the same fallback used when capture is lost.
    pointer(doc, "pointermove", x + dx, y + dy);
    pointer(doc, "pointerup", x + dx, y + dy);
  }

  function wheel(target: EventTarget, deltaY: number, deltaMode = 0) {
    const event = new win.WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY,
      deltaMode,
    });
    target.dispatchEvent(event);
    return event;
  }

  function create(
    size: { width: number; height: number } | null = {
      width: 300,
      height: 240,
    },
    autoSize = false,
    onDispose?: () => void,
  ) {
    layout = createPopupLayout(popup, textarea, {
      resizeLabel: "Resize translation popup",
      initialSize: size || undefined,
      autoSize,
      onResize: (width, height) => saved.push({ width, height }),
      onDispose,
    });
    return layout;
  }

  before(async function () {
    try {
      // The scaffold's runner is a real XHTML window even when the isolated
      // Zotero instance has no library window (for example, in headless runs).
      const owner = (globalThis as unknown as { document: Document }).document;
      if (!owner?.documentElement)
        throw new Error("The test runner document is unavailable");
      iframe = owner.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "iframe",
      ) as HTMLIFrameElement;
      iframe.style.cssText =
        "position:fixed;left:0;top:0;width:1000px;height:800px;border:0;z-index:2147483647";
      iframe.src = "about:blank";
      owner.documentElement.append(iframe);
      // A chrome window can create the initial about:blank document without a
      // separate iframe load event. Populate that real document explicitly.
      doc = iframe.contentDocument!;
      win = iframe.contentWindow as FrameWindow;
      if (!doc?.documentElement || !win)
        throw new Error("The popup fixture iframe did not create its document");
      doc.open();
      doc.write(
        "<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;}button,textarea{font:14px sans-serif}textarea{line-height:20px}</style></head><body></body></html>",
      );
      doc.close();
      nativeFrame = win.requestAnimationFrame.bind(win);
    } catch (error) {
      const detail = `${String(error)}\n${(error as Error)?.stack || ""}`;
      (globalThis as unknown as { debug?: (message: string) => void }).debug?.(
        `Popup DOM fixture: ${detail}`,
      );
      const failure = new Error(detail);
      throw Object.assign(failure, {
        toJSON() {
          return { message: detail, stack: failure.stack };
        },
      });
    }
  });

  beforeEach(function () {
    saved = [];
    frameRequests = 0;
    win.requestAnimationFrame = (callback) => {
      frameRequests++;
      return nativeFrame(callback);
    };
    area = doc.createElement("div");
    area.className = "primary-view";
    area.style.cssText =
      "position:absolute;left:20px;top:20px;width:800px;height:600px;overflow:hidden";
    popup = doc.createElement("div");
    popup.className = "selection-popup";
    popup.style.cssText =
      "position:absolute;left:0;top:0;transform:translate(120.2px,70.4px);width:300px;box-sizing:border-box;padding:8px;display:flex;flex-direction:column;gap:6px;border:1px solid black";
    const colors = doc.createElement("div");
    colors.className = "colors";
    colors.style.cssText = "display:flex;height:24px;gap:4px";
    for (let i = 0; i < 8; i++) {
      const color = doc.createElement("button");
      color.textContent = String(i + 1);
      color.style.cssText = "width:20px;height:24px;padding:0";
      colors.append(color);
    }
    const custom = doc.createElement("div");
    custom.className = "custom-sections";
    const section = doc.createElement("div");
    section.className = "section";
    textarea = doc.createElement("textarea");
    textarea.value = "A short translation.";
    textarea.style.cssText =
      "width:280px;height:80px;margin:0 2px;padding:5px;border:0;box-sizing:border-box;line-height:20px";
    noteButton = doc.createElement("button");
    noteButton.textContent = "Add to note";
    noteButton.style.cssText = "height:26px;margin-top:6px";
    section.append(textarea, noteButton);
    custom.append(section);
    popup.append(colors, custom);
    area.append(popup);
    doc.body.append(area);
  });

  afterEach(function () {
    layout?.dispose();
    layout = undefined;
    area.remove();
    win.requestAnimationFrame = nativeFrame;
  });

  after(function () {
    iframe?.remove();
  });

  it("restores a whole-popup size and retains native controls and transform", async function () {
    const transform = popup.style.transform;
    create({ width: 420, height: 320 });
    await frames();
    assert.closeTo(rect().width, 420, 0.05);
    assert.closeTo(rect().height, 320, 0.05);
    assert.equal(popup.style.transform, transform);
    assert.lengthOf(popup.querySelectorAll("[data-popup-resize]"), 8);
    assert.lengthOf(popup.querySelectorAll(".colors button"), 8);
    assert.equal(win.getComputedStyle(textarea)!.resize, "none");
    assert.equal(win.getComputedStyle(textarea)!.overflowY, "auto");
    assert.equal(
      win.getComputedStyle(textarea.parentElement!)!.overflowY,
      "hidden",
    );
    assert.isEmpty(saved, "restoration must not count as a user resize");
  });

  for (const edge of ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const) {
    it(`resizes from the ${edge} handle and anchors the opposite edges`, function () {
      create();
      const before = rect();
      const dx = edge.includes("w") ? -30 : edge.includes("e") ? 30 : 0;
      const dy = edge.includes("n") ? -25 : edge.includes("s") ? 25 : 0;
      drag(edge, dx, dy);
      const after = rect();
      assert.closeTo(after.width, before.width + Math.abs(dx), 0.05);
      assert.closeTo(after.height, before.height + Math.abs(dy), 0.05);
      assert.closeTo(
        edge.includes("w") ? after.right : after.left,
        edge.includes("w") ? before.right : before.left,
        0.05,
      );
      assert.closeTo(
        edge.includes("n") ? after.bottom : after.top,
        edge.includes("n") ? before.bottom : before.top,
        0.05,
      );
      assert.lengthOf(saved, 1);
      assert.closeTo(saved[0].width, after.width, 0.05);
      assert.closeTo(saved[0].height, after.height, 0.05);
    });
  }

  it("keeps resized content inside the reader bounds and retains manual size on refresh", async function () {
    create(null, true);
    drag("se", 2000, 2000);
    const manual = rect();
    assert.isAtMost(manual.right, 792.05);
    assert.isAtMost(manual.bottom, 592.05);
    assert.isAtLeast(textarea.clientHeight, 39);
    textarea.value = "New streaming translation\n".repeat(150);
    layout!.update(true);
    await frames();
    assert.closeTo(rect().width, manual.width, 0.05);
    assert.closeTo(rect().height, manual.height, 0.05);
    assert.isAbove(textarea.scrollHeight, textarea.clientHeight);
  });

  it("settles fractional offsets using real integer offsetLeft without a self-sustaining frame loop", async function () {
    area.style.width = "608.2px";
    popup.style.transform = "translate(300px,70px)";
    popup.style.left = "0.4px";
    assert.equal(popup.offsetLeft, 0, "Gecko exposes a rounded offsetLeft");
    create({ width: 300, height: 200 });
    await frames(4);
    const expectedLeft = area.getBoundingClientRect().width - 300 - 8;
    assert.closeTo(rect().left, expectedLeft, 0.04);
    const stableLeft = popup.style.left;
    const stableTop = popup.style.top;
    for (let i = 0; i < 20; i++) layout!.fitToViewport();
    await frames(3);
    assert.equal(popup.style.left, stableLeft);
    assert.equal(popup.style.top, stableTop);
    const settledFrameCount = frameRequests;
    await frames(5);
    assert.equal(frameRequests, settledFrameCount);
  });

  it("does not schedule layout work for unrelated PDF page mutations", async function () {
    create();
    await frames(4);
    const settledFrameCount = frameRequests;
    const page = doc.createElement("div");
    area.append(page);
    for (let i = 0; i < 25; i++) page.append(doc.createElement("span"));
    await frames(3);
    assert.equal(frameRequests, settledFrameCount);
  });

  it("contains wheel events at text boundaries while allowing native interior scrolling", function () {
    textarea.value = "A long translation line.\n".repeat(150);
    create({ width: 300, height: 220 });
    let leaked = 0;
    area.addEventListener("wheel", () => leaked++);
    assert.isAbove(textarea.scrollHeight, textarea.clientHeight + 20);
    textarea.scrollTop = 30;
    assert.isFalse(wheel(textarea, 0.5).defaultPrevented);
    textarea.scrollTop = 0;
    assert.isTrue(wheel(textarea, -1).defaultPrevented);
    textarea.scrollTop = textarea.scrollHeight;
    assert.isTrue(wheel(textarea, 1).defaultPrevented);
    assert.equal(leaked, 0);
  });

  it("forwards blank-area wheel movement without changing button actions", function () {
    textarea.value = "Scrollable translation.\n".repeat(150);
    create({ width: 300, height: 220 });
    textarea.scrollTop = 20;
    assert.isTrue(wheel(popup, 35).defaultPrevented);
    assert.closeTo(textarea.scrollTop, 55, 1);
    const before = textarea.scrollTop;
    wheel(noteButton, 40);
    assert.equal(textarea.scrollTop, before);
    let clicked = 0;
    noteButton.addEventListener("click", () => clicked++);
    noteButton.click();
    assert.equal(clicked, 1);
    const event = pointer(textarea, "pointerdown", 0, 0);
    assert.isFalse(event.defaultPrevented);
  });

  it("shrinks hidden text without resize handles and restores the selected size", async function () {
    create({ width: 340, height: 280 });
    await frames();
    textarea.hidden = true;
    layout!.update(false);
    await frames();
    assert.isBelow(rect().height, 160);
    assert.isTrue(
      (
        Array.from(
          popup.querySelectorAll("[data-popup-resize]"),
        ) as HTMLElement[]
      ).every((node) => node.hidden),
    );
    textarea.hidden = false;
    layout!.update(false);
    await frames();
    assert.closeTo(rect().width, 340, 0.05);
    assert.closeTo(rect().height, 280, 0.05);
  });

  it("ends a drag on pointer cancellation and does not react to later movement", function () {
    create();
    const target = handle("se");
    const r = target.getBoundingClientRect();
    pointer(target, "pointerdown", r.left, r.top);
    pointer(doc, "pointermove", r.left + 30, r.top + 40);
    pointer(doc, "pointercancel", r.left + 30, r.top + 40);
    const stopped = rect();
    pointer(doc, "pointermove", r.left + 80, r.top + 90);
    assert.closeTo(rect().width, stopped.width, 0.05);
    assert.closeTo(rect().height, stopped.height, 0.05);
    assert.lengthOf(saved, 1);
  });

  it("disposes a removed popup during a drag without saving a zero size", async function () {
    let disposed = 0;
    create(undefined, false, () => disposed++);
    const originalTransform = popup.style.transform;
    const target = handle("se");
    const r = target.getBoundingClientRect();
    pointer(target, "pointerdown", r.left, r.top);
    pointer(doc, "pointermove", r.left + 30, r.top + 40);
    popup.remove();
    await frames();
    assert.equal(disposed, 1);
    assert.isEmpty(saved);
    assert.lengthOf(popup.querySelectorAll("[data-popup-resize]"), 0);
    assert.equal(popup.style.transform, originalTransform);
    assert.equal(popup.style.left, "0px");
    const restoredStyle = popup.getAttribute("style");
    pointer(doc, "pointermove", r.left + 100, r.top + 100);
    pointer(doc, "pointerup", r.left + 100, r.top + 100);
    assert.equal(popup.getAttribute("style"), restoredStyle);
    layout!.dispose();
    assert.equal(disposed, 1);
  });

  it("cleans up when native custom sections are replaced while the popup stays connected", async function () {
    let disposed = 0;
    create(undefined, false, () => disposed++);
    const target = handle("se");
    const r = target.getBoundingClientRect();
    pointer(target, "pointerdown", r.left, r.top);
    pointer(doc, "pointermove", r.left + 30, r.top + 40);
    popup.querySelector(".custom-sections")!.remove();
    await frames();
    assert.isTrue(popup.isConnected);
    assert.isFalse(textarea.isConnected);
    assert.equal(disposed, 1);
    assert.isEmpty(saved);
    assert.lengthOf(popup.querySelectorAll("[data-popup-resize]"), 0);
    const restoredStyle = popup.getAttribute("style");
    pointer(doc, "pointermove", r.left + 100, r.top + 100);
    pointer(doc, "pointerup", r.left + 100, r.top + 100);
    assert.equal(popup.getAttribute("style"), restoredStyle);
  });

  it("keeps reading and selection positions during streaming, follows the bottom only when already there", function () {
    textarea.value = "A long translation line.\n".repeat(100);
    create({ width: 300, height: 220 });
    textarea.scrollTop = 60;
    textarea.setSelectionRange(3, 12);
    updatePopupText(textarea, textarea.value, false);
    assert.closeTo(textarea.scrollTop, 60, 1);
    assert.equal(textarea.selectionStart, 3);
    assert.equal(textarea.selectionEnd, 12);
    updatePopupText(
      textarea,
      `${textarea.value}More translated text.\n`,
      false,
    );
    assert.closeTo(textarea.scrollTop, 60, 1);
    assert.equal(textarea.selectionStart, 3);
    assert.equal(textarea.selectionEnd, 12);
    textarea.scrollTop = textarea.scrollHeight;
    updatePopupText(textarea, `${textarea.value}Final line.\n`, false);
    assert.closeTo(
      textarea.scrollTop,
      textarea.scrollHeight - textarea.clientHeight,
      1,
    );
    updatePopupText(textarea, "A new selection", true);
    assert.equal(textarea.scrollTop, 0);
  });
});
