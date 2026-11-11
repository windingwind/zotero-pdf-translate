import { updatePopupMath } from "../src/modules/popupMath";
import { renderMathInText } from "../src/utils/mathRenderer";

describe("Reader popup math rendering", function () {
  let doc: Document;
  let popup: HTMLDivElement;
  let textarea: HTMLTextAreaElement;
  let copied: string;
  let win: Window;
  let originalFrame: Window["requestAnimationFrame"];
  let originalCancel: Window["cancelAnimationFrame"];
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  const render = () =>
    updatePopupMath(popup, textarea, true, (text) => {
      copied = text;
    });
  const frame = async () => {
    const callbacks = Array.from(frames.values());
    frames.clear();
    for (const callback of callbacks) callback(0);
  };
  const overlay = () =>
    popup.querySelector<HTMLDivElement>(".zoteropdftranslate-popup-math")!;

  beforeEach(function () {
    doc = Zotero.getMainWindow().document;
    win = doc.defaultView!;
    originalFrame = win.requestAnimationFrame;
    originalCancel = win.cancelAnimationFrame;
    frames = new Map();
    nextFrame = 0;
    win.requestAnimationFrame = (callback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    };
    win.cancelAnimationFrame = (id) => {
      frames.delete(id);
    };
    popup = doc.createElementNS(
      "http://www.w3.org/1999/xhtml",
      "div",
    ) as HTMLDivElement;
    textarea = doc.createElementNS(
      "http://www.w3.org/1999/xhtml",
      "textarea",
    ) as HTMLTextAreaElement;
    popup.setAttribute("translate-task-id", "first");
    popup.appendChild(textarea);
    doc.documentElement.appendChild(popup);
    copied = "";
  });
  afterEach(function () {
    popup.remove();
    win.requestAnimationFrame = originalFrame;
    win.cancelAnimationFrame = originalCancel;
  });

  it("renders all supported delimiters and escapes surrounding HTML", function () {
    for (const source of ["$Q_t$", "$$Q_t$$", "\\(Q_t\\)", "\\[Q_t\\]"]) {
      const html = renderMathInText(
        doc,
        `<img src=x onerror=alert(1)> ${source}`,
      );
      assert.include(html, 'class="katex"');
      assert.include(html, "&lt;img");
      assert.notInclude(html, "<img");
    }
    assert.include(renderMathInText(doc, "$\\notacommand{$"), "katex-error");
  });

  it("renders the latest streaming update and preserves incomplete formulas", async function () {
    textarea.value = "完整 $Q_t$，生成 $\\theta_";
    render();
    textarea.value += "Q";
    render();
    assert.equal(frames.size, 1);
    await frame();
    assert.include(overlay().innerHTML, 'class="katex"');
    assert.include(overlay().textContent!, "$\\theta_Q");
    textarea.value += "$";
    render();
    await frame();
    assert.lengthOf(overlay().querySelectorAll(".katex"), 2);
    assert.equal(textarea.style.display, "none");
  });

  it("keeps plain text, disabled rendering, and hidden text in the original mode", async function () {
    textarea.value = "$Q_t$";
    render();
    await frame();
    textarea.value = "plain translation";
    render();
    assert.isTrue(overlay().hidden);
    assert.equal(textarea.style.display, "");
    textarea.value = "$Q_t$";
    updatePopupMath(popup, textarea, false, () => {});
    assert.equal(frames.size, 0);
    assert.isTrue(overlay().hidden);
    textarea.hidden = true;
    render();
    assert.isTrue(overlay().hidden);
  });

  it("does not recreate the overlay or change its width during streaming", async function () {
    textarea.value = "$Q_t$";
    textarea.style.direction = "rtl";
    render();
    await frame();
    const first = overlay();
    const width = first.style.width;
    textarea.value += " and $K_t$";
    render();
    await frame();
    assert.strictEqual(overlay(), first);
    assert.equal(first.style.width, width);
    assert.equal(first.style.direction, "rtl");
    assert.lengthOf(
      doc.querySelectorAll('link[data-popup-math="katex.min.css"]'),
      1,
    );
  });

  it("cancels a pending render when math is disabled", async function () {
    textarea.value = "$Q_t$";
    render();
    updatePopupMath(popup, textarea, false, () => {});
    await frame();
    assert.isTrue(overlay().hidden);
    assert.notInclude(overlay().innerHTML, "katex");
  });

  it("copies the original LaTeX on double-click", async function () {
    textarea.value = "投影 $\\theta_Q$";
    render();
    await frame();
    const event = doc.createEvent("MouseEvents");
    event.initEvent("dblclick", true, true);
    overlay().dispatchEvent(event);
    assert.equal(copied, textarea.value);
  });

  it("preserves remembered dimensions and reports overlay resizing", async function () {
    textarea.value = "$Q_t$";
    textarea.style.width = "400px";
    textarea.style.height = "180px";
    let resized = false;
    updatePopupMath(popup, textarea, true, () => {}, {
      rememberSize: true,
      onResize: () => {
        resized = true;
      },
    });
    await frame();
    assert.equal(overlay().style.width, "400px");
    assert.equal(overlay().style.height, "180px");
    overlay().style.width = "450px";
    const event = doc.createEvent("MouseEvents");
    event.initEvent("mouseup", true, true);
    overlay().dispatchEvent(event);
    assert.isTrue(resized);
    assert.equal(textarea.style.width, "450px");
  });

  it("copies with the keyboard and exposes source editing without re-enabling a disabled overlay", async function () {
    textarea.value = "$Q_t$";
    render();
    await frame();
    const key = (name: string, meta = false) => {
      const event = doc.createEvent("Events");
      event.initEvent("keydown", true, true);
      Object.defineProperties(event, {
        key: { value: name },
        metaKey: { value: meta },
      });
      overlay().dispatchEvent(event);
    };
    key("c", true);
    assert.equal(copied, textarea.value);
    key("F2");
    assert.isTrue(overlay().hidden);
    assert.equal(textarea.style.display, "");
    updatePopupMath(popup, textarea, false, () => {});
    const blur = doc.createEvent("Events");
    blur.initEvent("blur", false, false);
    textarea.dispatchEvent(blur);
    await frame();
    assert.isTrue(overlay().hidden);
  });
});
