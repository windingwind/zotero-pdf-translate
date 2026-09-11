import { escapeHtml, renderMarkdownToHTML } from "../src/utils/markdown";

/**
 * The chat panel renders model answers, which are markdown with LaTeX. These
 * tests run inside Zotero, where the `document` used for escaping exists.
 */
describe("markdown rendering", function () {
  const render = (text: string, math = true) =>
    renderMarkdownToHTML(Zotero.getMainWindow().document, text, { math });

  it("renders headings, emphasis and inline code", function () {
    assert.strictEqual(render("## Title"), "<h2>Title</h2>");
    assert.include(render("a **bold** word"), "<strong>bold</strong>");
    assert.include(render("an *italic* word"), "<em>italic</em>");
    assert.include(render("a `code` span"), "<code>code</code>");
    assert.include(render("~~gone~~"), "<del>gone</del>");
  });

  it("renders lists and block quotes", function () {
    assert.strictEqual(
      render("- one\n- two"),
      "<ul><li>one</li><li>two</li></ul>",
    );
    assert.strictEqual(
      render("1. one\n2. two"),
      "<ol><li>one</li><li>two</li></ol>",
    );
    assert.include(
      render("> quoted"),
      "<blockquote><p>quoted</p></blockquote>",
    );
  });

  it("keeps paragraphs and their line breaks", function () {
    assert.strictEqual(render("first\nsecond"), "<p>first<br/>second</p>");
    assert.strictEqual(render("one\n\ntwo"), "<p>one</p><p>two</p>");
  });

  it("does not interpret markup inside a fenced code block", function () {
    const html = render("```js\nconst a = **not bold**; $x^2$\n```");
    assert.include(html, '<code class="language-js">');
    assert.include(html, "**not bold**");
    assert.include(html, "$x^2$");
    assert.notInclude(html, "<strong>");
    assert.notInclude(html, "katex");
  });

  it("renders inline and display math with KaTeX", function () {
    const inline = render("energy $E = mc^2$ here");
    assert.include(inline, 'class="katex"');
    assert.notInclude(inline, "$E = mc^2$");

    const display = render("$$\\int_0^1 x dx$$");
    assert.include(display, "katex-display");
  });

  it("leaves math alone when the target has no KaTeX stylesheet", function () {
    const html = render("energy $E = mc^2$", false);
    assert.include(html, "$E = mc^2$");
    assert.notInclude(html, "katex");
  });

  it("escapes html instead of injecting it", function () {
    const html = render('<img src=x onerror="alert(1)"> <script>x</script>');
    assert.notInclude(html, "<img");
    assert.notInclude(html, "<script>");
    assert.include(html, "&lt;img");
  });

  it("escapes html inside code spans and fences", function () {
    assert.include(render("`<b>x</b>`"), "&lt;b&gt;x&lt;/b&gt;");
    assert.include(render("```\n<b>x</b>\n```"), "&lt;b&gt;x&lt;/b&gt;");
  });

  it("only turns http(s) urls into links", function () {
    const link = render("[docs](https://www.zotero.org)");
    assert.include(link, '<a href="https://www.zotero.org"');
    assert.include(link, ">docs</a>");

    const evil = render("[x](javascript:alert(1))");
    assert.notInclude(evil, "<a ");
  });

  it("escapes text for callers that build their own html", function () {
    assert.strictEqual(
      escapeHtml('<a href="x">&\'</a>'),
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;",
    );
  });

  /**
   * Answers from a real session: every one of these has to render quickly.
   * A case that hangs here is what the user sees as "the panel got stuck".
   */
  it("renders the formulas of real answers without hanging", function () {
    const cases: string[] = [
      "Inline $E = mc^2$ and $\\frac{a}{b}$.",
      "$$\n\\begin{aligned}\na &= b \\\\\nc &= d\n\\end{aligned}\n$$",
      "$$P(Y=1|X)=\\frac{1}{1+e^{-\\beta X}}$$",
      "价格在 $5 到 $10 之间，涨了 20%",
      "- $x^2$\n- $y^2$\n- $\\alpha_i$",
      "\\text{效应} = \\hat{\\beta}_1 \\times \\text{暴露程度}",
      "$$\\mathbb{E}[Y_i(1) - Y_i(0) \\mid D_i = 1] = \\mathbb{E}[Y_i \\mid D_i=1] - \\mathbb{E}[Y_i \\mid D_i=0]$$",
      "```\n$x$ inside a fence\n```",
    ];
    const doc = Zotero.getMainWindow().document;
    for (const text of cases) {
      const started = Date.now();
      const html = renderMarkdownToHTML(doc, text);
      const elapsed = Date.now() - started;
      assert.isString(html);
      assert.isBelow(
        elapsed,
        2000,
        `rendering took ${elapsed}ms for: ${text.slice(0, 40)}`,
      );
    }
  });

  it("renders a long answer (many formulas, term notes) quickly", function () {
    // Shaped like the answers this feature actually produces: a translated
    // block, then a list of term notes, with inline math everywhere.
    const block = [
      "## 逐层解释",
      "",
      "作者的核心主张是：用暴露程度的差异来识别驱动因素（$D_i \\in \\{0,1\\}$）。",
      "其中 $\\hat{\\beta} = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sum (x_i - \\bar{x})^2}$。",
      "",
      "- **drivers**：驱动因素，常见搭配 key drivers",
      "- **subpopulations**：亚群，$N_k$ 表示第 $k$ 个子群体",
      "- **tax effectiveness**：税收有效性，约 $25\\%$–$30\\%$",
      "",
      "> 用 $\\mathbb{E}[Y_i(1) - Y_i(0) \\mid D_i = 1]$ 表示处理组上的平均处理效应。",
      "",
    ].join("\n");
    const text = block.repeat(40); // ~28KB, ~200 formulas

    const doc = Zotero.getMainWindow().document;
    const started = Date.now();
    const html = renderMarkdownToHTML(doc, text);
    const elapsed = Date.now() - started;
    assert.include(html, "katex");
    assert.isBelow(
      elapsed,
      1500,
      `a ${text.length} char answer took ${elapsed}ms`,
    );
  });
});
