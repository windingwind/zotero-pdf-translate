import {
  ChatStore,
  buildChatMessages,
  formatContextBlock,
} from "../src/utils/chat";
import type { ChatContext, ChatThread } from "../src/utils/chat";
import { createLlmStreamParser, extractFullText } from "../src/utils/llmStream";
import type { ChatMessage } from "../src/utils/llmStream";
import type { TranslateService } from "../src/modules/services/base";
import type { TranslateTask } from "../src/utils/task";
import { setPref } from "../src/utils/prefs";

const context: ChatContext = {
  raw: "The writing is on the wall.",
  result: "不祥之兆已经出现。",
  title: "Idioms in Corpus Linguistics",
  abstractNote: "A study of idiomatic expressions.",
  itemId: 42,
};

function makeThread(
  turns: ChatThread["turns"],
  overrides: Partial<ChatThread> = {},
): ChatThread {
  return {
    id: "thread-1",
    itemId: 42,
    service: "chatgpt",
    context,
    turns,
    createdAt: 0,
    ...overrides,
  };
}

describe("chat context block", function () {
  it("always sends the selection, its translation and the paper metadata", function () {
    const block = formatContextBlock(context);
    assert.include(block, "The writing is on the wall.");
    assert.include(block, "不祥之兆已经出现。");
    assert.include(block, "Idioms in Corpus Linguistics");
  });

  it("omits the sections it has no content for", function () {
    const block = formatContextBlock({
      raw: "The writing is on the wall.",
      result: "",
    });
    assert.include(block, "The writing is on the wall.");
    assert.notInclude(block, "不祥之兆已经出现。");
    assert.notInclude(block, "Idioms in Corpus Linguistics");
  });

  it("returns an empty string when there is no context at all", function () {
    const block = formatContextBlock({ raw: "", result: "" });
    assert.strictEqual(block, "");
  });
});

describe("chat message building", function () {
  const turns: ChatThread["turns"] = [
    { role: "user", content: "What does this idiom mean?", status: "success" },
    { role: "assistant", content: "It means a warning.", status: "success" },
    { role: "user", content: "And in this paper?", status: "success" },
    { role: "assistant", content: "It is used ironically.", status: "success" },
  ];

  it("grounds the first question in the context of the selection", function () {
    const messages = buildChatMessages(makeThread(turns), 10);
    const firstUser = messages.find((message) => message.role === "user");
    assert.include(firstUser?.content, "The writing is on the wall.");
    assert.include(firstUser?.content, "What does this idiom mean?");
  });

  it("does not repeat the context in later questions", function () {
    const messages = buildChatMessages(makeThread(turns), 10);
    const users = messages.filter((message) => message.role === "user");
    assert.lengthOf(users, 2);
    assert.notInclude(users[1].content, "The writing is on the wall.");
    assert.strictEqual(users[1].content, "And in this paper?");
  });

  it("keeps the alternation and drops the oldest turns first", function () {
    const many: ChatThread["turns"] = [];
    for (let i = 0; i < 10; i++) {
      many.push({ role: "user", content: `question ${i}`, status: "success" });
      many.push({
        role: "assistant",
        content: `answer ${i}`,
        status: "success",
      });
    }
    const messages = buildChatMessages(makeThread(many), 4);
    const users = messages.filter((message) => message.role === "user");
    const assistants = messages.filter(
      (message) => message.role === "assistant",
    );
    // The first turn carries the context and the last turns are the newest
    assert.lengthOf(users, 2);
    assert.lengthOf(assistants, 2);
    assert.include(users[0].content, "question 0");
    assert.strictEqual(users[1].content, "question 9");
  });

  it("skips the placeholder of an unfinished reply", function () {
    const messages = buildChatMessages(
      makeThread([
        { role: "user", content: "hello", status: "success" },
        { role: "assistant", content: "", status: "streaming" },
      ]),
      10,
    );
    const conversational = messages.filter(
      (message) => message.role !== "system",
    );
    assert.lengthOf(conversational, 1);
    assert.strictEqual(conversational[0].role, "user");
  });
});

describe("LLM stream parsing", function () {
  it("parses OpenAI chat completion chunks split across reads", function () {
    const parser = createLlmStreamParser("openai");
    parser.push('data: {"choices":[{"delta":{"content":"Hel');
    parser.push(
      'lo"}}]}\ndata: {"choices":[{"delta":{"content":" world"}}]}\n',
    );
    parser.push("data: [DONE]\n");
    assert.strictEqual(parser.text, "Hello world");
  });

  it("parses the Ollama native format", function () {
    const parser = createLlmStreamParser("openai");
    parser.push('{"message":{"content":"Hi"},"done":false}\n');
    parser.push('{"message":{"content":" there"},"done":true}\n');
    assert.strictEqual(parser.text, "Hi there");
  });

  it("parses OpenAI Responses API events", function () {
    const parser = createLlmStreamParser("openai-responses");
    parser.push("event: response.output_text.delta\n");
    parser.push('data: {"type":"response.output_text.delta","delta":"A"}\n');
    parser.push('data: {"type":"response.completed"}\n');
    assert.strictEqual(parser.text, "A");
  });

  it("parses Claude content block deltas", function () {
    const parser = createLlmStreamParser("claude");
    parser.push(
      'data: {"type":"content_block_delta","delta":{"text":"Bon"}}\n',
    );
    parser.push(
      'data: {"type":"content_block_delta","delta":{"text":"jour"}}\n',
    );
    assert.strictEqual(parser.text, "Bonjour");
  });

  it("parses Gemini candidates", function () {
    const parser = createLlmStreamParser("gemini");
    parser.push(
      'data: {"candidates":[{"content":{"parts":[{"text":"He"}]}}]}\n',
    );
    parser.push(
      'data: {"candidates":[{"content":{"parts":[{"text":"y"}]}}]}\n',
    );
    assert.strictEqual(parser.text, "Hey");
  });

  it("ignores lines that are not JSON", function () {
    const parser = createLlmStreamParser("openai");
    parser.push(": keep-alive\n\n");
    parser.push('data: {"choices":[{"delta":{"content":"ok"}}]}\n');
    assert.strictEqual(parser.text, "ok");
  });
});

describe("LLM non-streaming responses", function () {
  it("reads an OpenAI chat completion", function () {
    assert.strictEqual(
      extractFullText("openai", {
        choices: [{ message: { content: "Hello" } }],
      }),
      "Hello",
    );
  });

  it("reads an OpenAI Responses API body", function () {
    assert.strictEqual(
      extractFullText("openai-responses", {
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "Hello" }],
          },
        ],
      }),
      "Hello",
    );
  });

  it("reads a Claude message", function () {
    assert.strictEqual(
      extractFullText("claude", {
        content: [
          { type: "text", text: "Hel" },
          { type: "text", text: "lo" },
        ],
      }),
      "Hello",
    );
  });

  it("reads a Gemini response", function () {
    assert.strictEqual(
      extractFullText("gemini", {
        candidates: [{ content: { parts: [{ text: "Hello" }] } }],
      }),
      "Hello",
    );
  });
});

describe("chat store", function () {
  let store: ChatStore;

  beforeEach(function () {
    store = new ChatStore();
  });

  it("turns a pending selection into the context of a new thread", function () {
    store.setPending(context);
    const ref = store.beginTurn("chatgpt", "What does that mean?", 42);
    const thread = ref && store.getThread(ref.threadId);
    assert.ok(thread);
    assert.strictEqual(thread!.context?.raw, context.raw);
    assert.strictEqual(store.pending, null);
    assert.lengthOf(thread!.turns, 2);
    assert.strictEqual(thread!.turns[1].status, "streaming");
  });

  it("continues the conversation when no new selection is pending", function () {
    store.setPending(context);
    const first = store.beginTurn("chatgpt", "Q1", 42);
    store.endTurn("A1", "success", first);
    const second = store.beginTurn("chatgpt", "Q2", 42);
    assert.strictEqual(second!.threadId, first!.threadId);
    assert.lengthOf(store.getThreads(42), 1);
    assert.lengthOf(store.getThread(first!.threadId)!.turns, 4);
  });

  it("keeps the history when a new selection starts another thread", function () {
    store.setPending(context);
    const first = store.beginTurn("chatgpt", "Q1", 42);
    store.endTurn("A1", "success", first);
    store.setPending({ ...context, raw: "Another sentence." });
    const second = store.beginTurn("chatgpt", "Q2", 42);
    assert.notStrictEqual(second!.threadId, first!.threadId);
    assert.lengthOf(store.getThreads(42), 2);
    assert.strictEqual(
      store.getThread(second!.threadId)!.context?.raw,
      "Another sentence.",
    );
  });

  it("ignores a reply that arrives after the turn was finished", function () {
    const stale = store.beginTurn("chatgpt", "Q1", 42);
    store.endTurn("partial", "success", stale);
    const current = store.beginTurn("chatgpt", "Q2", 42);
    store.appendDelta("stale text", stale);
    store.endTurn("stale text", "success", stale);
    assert.deepStrictEqual(store.streaming, current);
    assert.strictEqual(
      store.getThread(current!.threadId)!.turns[current!.index].content,
      "",
    );
    // The answer the user already saw is not overwritten by the late reply
    assert.strictEqual(
      store.getThread(stale!.threadId)!.turns[stale!.index].content,
      "partial",
    );
  });

  it("only aborts the turn that is streaming", function () {
    const ref = store.beginTurn("chatgpt", "Q1", 42);
    assert.ok(ref);
    store.endTurn("", "success", ref);
    assert.isNull(store.streaming);
    // Nothing is streaming any more, so stop is a no-op
    assert.isFalse(store.abort());
    assert.isFalse(ref!.abortFlag.aborted);
  });

  it("marks the streaming turn and interrupts the transport on abort", function () {
    const ref = store.beginTurn("chatgpt", "Q1", 42);
    assert.ok(ref);
    let interrupted = false;
    ref!.abortFlag.abort = () => {
      interrupted = true;
    };
    assert.isTrue(store.abort());
    assert.isTrue(ref!.abortFlag.aborted);
    assert.isTrue(interrupted);
  });

  it("does not let a stale request abort a newer turn", function () {
    const stale = store.beginTurn("chatgpt", "Q1", 42);
    assert.ok(stale);
    const current = store.beginTurn("chatgpt", "Q2", 42);
    assert.ok(current);
    // The store only knows about the live turn
    assert.strictEqual(store.streaming, current);
    store.abort();
    assert.isFalse(stale!.abortFlag.aborted);
    assert.isTrue(current!.abortFlag.aborted);
  });

  it("clears the threads of one item only", function () {
    store.setPending(context);
    store.beginTurn("chatgpt", "Q1", 42);
    store.setPending({ ...context, itemId: 43 });
    store.beginTurn("chatgpt", "Q2", 43);
    store.clear(42);
    assert.lengthOf(store.getThreads(), 1);
    assert.strictEqual(store.getThreads()[0].itemId, 43);
  });
});

/**
 * The reader reports the id of the attachment while the item pane may report
 * the id of the parent item of the same paper: both must end up in the same
 * conversation, otherwise the answer is written into a thread the panel does
 * not display.
 */
describe("conversation identity", function () {
  let store: ChatStore;

  beforeEach(function () {
    store = new ChatStore();
  });

  it("joins the ids of an attachment and its paper into one conversation", async function () {
    if (!(Zotero as any)?.Items) {
      return;
    }
    const parent = new Zotero.Item("book");
    parent.libraryID = Zotero.Libraries.userLibraryID;
    parent.setField("title", "Conversation key test");
    await parent.saveTx();
    const child = new Zotero.Item("note");
    child.libraryID = parent.libraryID;
    child.parentID = parent.id;
    child.setNote("child of the paper");
    await child.saveTx();

    try {
      // The popup reports the child item …
      store.setPending({
        raw: "Selected text",
        result: "译文",
        itemId: child.id,
      });
      const ref = store.beginTurn("chatgpt", "What does it mean?", child.id);
      assert.ok(ref);

      // … and the item pane reports the parent item
      const fromPane = store.getThreads(parent.id);
      assert.lengthOf(fromPane, 1, "the panel finds the conversation");
      assert.strictEqual(fromPane[0].id, ref!.threadId);
      assert.lengthOf(store.getThreads(child.id), 1, "the reader does too");
    } finally {
      store.clear();
      await child.eraseTx();
      await parent.eraseTx();
    }
  });

  it("shows a failed request instead of staying silent", function () {
    const thread = store.pushError("Service is not configured", 7);
    assert.lengthOf(store.getThreads(7), 1);
    assert.strictEqual(thread.turns[0].status, "fail");
    assert.include(thread.turns[0].content, "not configured");
  });
});

describe("follow-up Q&A in Zotero", function () {
  it("paints itself as soon as it is connected", function () {
    const plugin = (Zotero as any).PDFTranslate;
    if (!plugin) {
      return;
    }
    const win = Zotero.getMainWindow() as any;
    const fragment = win.MozXULElement.parseXULToFragment(
      '<html:div xmlns:html="http://www.w3.org/1999/xhtml"><translator-chat-panel /></html:div>',
    );
    const container = win.document.importNode(fragment, true)
      .firstElementChild as HTMLElement;
    win.document.documentElement.append(container);
    const panel = container.firstElementChild as any;
    try {
      assert.ok(panel.querySelector(".chat-root"), "the panel markup is there");
      assert.ok(
        panel.querySelector(".chat-empty"),
        "the panel renders itself on connect, without an explicit render()",
      );
    } finally {
      plugin.data.chat.store.clear();
      container.remove();
    }
  });

  it("is wired up when the plugin is running in Zotero", function () {
    // This suite also runs in a plain Node harness, where the plugin is not
    // loaded; keep the assertions meaningful but not failing there.
    const plugin = (Zotero as any).PDFTranslate;
    if (!plugin) {
      return;
    }

    assert.ok(plugin.data.chat.store, "the chat store is exposed");
    assert.isFunction(plugin.hooks.onChatAsk, "onChatAsk hook");
    assert.isFunction(plugin.hooks.onChatSend, "onChatSend hook");
    assert.isFunction(plugin.hooks.onChatStop, "onChatStop hook");
    assert.isFunction(plugin.hooks.onChatClear, "onChatClear hook");
    assert.isFunction(plugin.hooks.onChatAskLastTask, "shortcut hook");
  });

  it("registers the AI Q&A section in the item pane", function () {
    const plugin = (Zotero as any).PDFTranslate;
    if (!plugin) {
      return;
    }
    assert.isString(plugin.data.chat.paneKey);
    assert.isAbove(plugin.data.chat.paneKey.length, 0);
  });

  it("queues the selection as the context of the next question", function () {
    const plugin = (Zotero as any).PDFTranslate;
    if (!plugin) {
      return;
    }
    try {
      plugin.hooks.onChatAsk({
        raw: "The writing is on the wall.",
        result: "不祥之兆已经出现。",
        itemId: 1,
      });
      const pending = plugin.data.chat.store.pending;
      assert.ok(pending, "the selection is queued as pending context");
      assert.strictEqual(pending.raw, "The writing is on the wall.");
      assert.strictEqual(pending.result, "不祥之兆已经出现。");
    } finally {
      plugin.data.chat.store.clear();
    }
  });

  it("renders the section body", function () {
    const plugin = (Zotero as any).PDFTranslate;
    if (!plugin) {
      return;
    }

    // Build the section body the way Zotero does: the body XHTML is parsed
    // inside an <html:div>, which is what makes the custom element upgrade.
    const win = Zotero.getMainWindow() as any;
    assert.ok(win?.MozXULElement, "the main Zotero window is available");
    try {
      // Start from a clean conversation: a leftover pending selection of a
      // previous test would make the context row visible.
      plugin.data.chat.store.clear();
      const fragment = win.MozXULElement.parseXULToFragment(
        '<html:div xmlns:html="http://www.w3.org/1999/xhtml"><translator-chat-panel /></html:div>',
      );
      const container = win.document.importNode(fragment, true)
        .firstElementChild as HTMLElement;
      win.document.documentElement.append(container);
      const panel = container.firstElementChild as any;
      try {
        assert.isFunction(panel.render, "the element is upgraded");
        panel._itemID = 1;
        panel.render();
        assert.ok(panel.querySelector(".chat-root"), "the panel root element");
        assert.ok(
          panel.querySelector(".chat-composer"),
          "the message composer",
        );
        assert.ok(
          panel.querySelector(".chat-empty"),
          "the empty state is shown",
        );
        assert.strictEqual(
          (
            panel.querySelector(
              "#zoteropdftranslate-chat-pending",
            ) as HTMLElement
          )?.hidden,
          true,
          "the pending context row is hidden without a selection",
        );

        // A pending selection updates the panel through the store, not through
        // the caller: this is what keeps the popup and the item pane in sync.
        plugin.data.chat.store.setPending({
          raw: "The writing is on the wall.",
          result: "不祥之兆已经出现。",
        });
        assert.strictEqual(
          panel.querySelectorAll(".chat-chip").length,
          0,
          "the context has no options to toggle any more",
        );
        // The context is shown as it is, so the user sees what is sent
        assert.include(
          panel.querySelector("#zoteropdftranslate-chat-quote").textContent,
          "The writing is on the wall.",
          "the quoted selection is shown",
        );
        // The labels come from the addon locale, not from the raw l10n ids
        assert.notInclude(
          panel.querySelector(".chat-pending").textContent,
          "zoteropdftranslate-",
          "the context labels are translated",
        );
        assert.strictEqual(
          (
            panel.querySelector(
              "#zoteropdftranslate-chat-pending",
            ) as HTMLElement
          )?.hidden,
          false,
          "the pending context row is shown after a selection",
        );
      } finally {
        plugin.data.chat.store.clear();
        container.remove();
      }
    } catch (error) {
      const detail =
        (error as any)?.message ||
        (error as any)?.name ||
        String(error) ||
        "unknown error";
      assert.fail(`rendering the section body failed: ${detail}`);
    }
  });

  it("releases its store subscription when the section is removed", function () {
    const plugin = (Zotero as any).PDFTranslate;
    if (!plugin) {
      return;
    }
    const win = Zotero.getMainWindow() as any;
    const fragment = win.MozXULElement.parseXULToFragment(
      '<html:div xmlns:html="http://www.w3.org/1999/xhtml"><translator-chat-panel /></html:div>',
    );
    const container = win.document.importNode(fragment, true)
      .firstElementChild as HTMLElement;
    win.document.documentElement.append(container);
    const panel = container.firstElementChild as any;

    let destroyed = false;
    const originalDestroy = panel.destroy.bind(panel);
    panel.destroy = () => {
      destroyed = true;
      originalDestroy();
    };

    try {
      container.remove();
      assert.isTrue(
        destroyed,
        "the panel unsubscribes from the store when it is disconnected",
      );
      // A further update must not touch the removed tree
      plugin.data.chat.store.setPending({ raw: "after removal" });
    } finally {
      plugin.data.chat.store.clear();
    }
  });
});

/**
 * End-to-end run of the follow-up flow with a stubbed LLM service: the reader
 * popup hands a selection over, the panel streams a reply into its DOM, and
 * the answer can be stopped and turned into a note.
 */
describe("follow-up Q&A end to end", function () {
  const plugin = () => (Zotero as any).PDFTranslate;

  function mountPanel(): { panel: any; container: HTMLElement } | undefined {
    const win = Zotero.getMainWindow() as any;
    if (!win?.MozXULElement) {
      return undefined;
    }
    const fragment = win.MozXULElement.parseXULToFragment(
      '<html:div xmlns:html="http://www.w3.org/1999/xhtml"><translator-chat-panel /></html:div>',
    );
    const container = win.document.importNode(fragment, true)
      .firstElementChild as HTMLElement;
    win.document.documentElement.append(container);
    return { panel: container.firstElementChild, container };
  }

  function stubChatService(chat: TranslateService["chat"]) {
    const services = plugin().data.translate.services;
    const service = services
      .getAllServicesWithType("sentence")
      .find((candidate: TranslateService) => !!candidate.chat);
    assert.ok(service, "a chat capable service is registered");
    const originals = {
      service,
      chat: service.chat,
      isConfigured: service.isConfigured,
      chatService: plugin().data.chat.service,
    };
    service.chat = chat;
    service.isConfigured = () => true;
    setPref("chatService", service.id);
    return originals;
  }

  function restoreChatService(originals: {
    service: TranslateService;
    chat: TranslateService["chat"];
    isConfigured: TranslateService["isConfigured"];
    chatService: string;
  }) {
    originals.service.chat = originals.chat;
    originals.service.isConfigured = originals.isConfigured;
    setPref("chatService", originals.chatService);
    plugin().data.chat.service = originals.chatService;
    plugin().data.chat.store.clear();
  }

  it("answers a queued selection, streams it into the panel and saves it", async function () {
    const addonInstance = plugin();
    if (!addonInstance) {
      return;
    }
    plugin().data.translate.selectedText = "The writing is on the wall.";

    const requests: { messages: ChatMessage[] }[] = [];
    const originals = stubChatService(async (request) => {
      requests.push({ messages: request.messages });
      request.onDelta?.("It means ");
      request.onDelta?.("a warning is coming.");
      return "It means a warning is coming.";
    });

    const mounted = mountPanel();
    try {
      addonInstance.hooks.onChatAsk({
        raw: "The writing is on the wall.",
        result: "不祥之兆已经出现。",
        itemId: 1,
      });
      const store = addonInstance.data.chat.store;
      assert.ok(store.pending, "the selection became the pending context");

      // The panel is the only place the draft is typed, and the store is the
      // source of truth for it
      store.setDraft("What does this idiom mean?");
      await addonInstance.hooks.onChatSend(1);

      assert.lengthOf(requests, 1, "the request reached the service");
      const firstUser = requests[0].messages.find(
        (message) => message.role === "user",
      );
      assert.include(
        firstUser?.content,
        "The writing is on the wall.",
        "the selection is part of the prompt",
      );
      assert.include(
        firstUser?.content,
        "不祥之兆已经出现。",
        "the existing translation is part of the prompt",
      );
      assert.include(
        firstUser?.content,
        "What does this idiom mean?",
        "the question is sent",
      );

      const thread = store.getThreads(1)[0];
      assert.strictEqual(thread.turns.length, 2);
      assert.strictEqual(thread.turns[0].role, "user");
      assert.strictEqual(thread.turns[1].role, "assistant");
      assert.strictEqual(thread.turns[1].status, "success");
      assert.strictEqual(
        thread.turns[1].content,
        "It means a warning is coming.",
      );
      assert.isNull(store.streaming, "streaming is finished");

      if (mounted) {
        mounted.panel._itemID = 1;
        mounted.panel.render();
        const bubbles = mounted.panel.querySelectorAll(".chat-bubble");
        assert.isAtLeast(bubbles.length, 2, "the replies are rendered");
        assert.include(
          mounted.panel.querySelector(".chat-messages").textContent,
          "It means a warning is coming.",
        );
        assert.strictEqual(
          mounted.panel.querySelectorAll(".chat-actions button").length,
          3,
          "copy / insert / save actions of the answer",
        );
      }

      // "Insert into note" copies the answer when no note editor is open
      await addonInstance.hooks.onChatMessageAction(
        "copy",
        thread.id,
        thread.turns.length - 1,
      );
    } finally {
      restoreChatService(originals);
      mounted?.container.remove();
      plugin().data.translate.selectedText = "";
    }
  });

  it("stops a streaming reply and keeps the partial answer", async function () {
    const addonInstance = plugin();
    if (!addonInstance) {
      return;
    }
    const originals = stubChatService(async (request) => {
      request.onDelta?.("Everything up to ");
      // The UI stops the reply while the service is still working
      addonInstance.hooks.onChatStop();
      request.onDelta?.("the stop button should be ignored");
      return "Everything up to the stop button should be ignored";
    });

    try {
      addonInstance.data.chat.store.setPending({
        raw: "The writing is on the wall.",
        result: "",
        itemId: 1,
      });
      addonInstance.data.chat.store.setDraft("Keep going");
      await addonInstance.hooks.onChatSend(1);

      const store = addonInstance.data.chat.store;
      const thread = store.getThreads(1)[0];
      const answer = thread.turns[thread.turns.length - 1];
      assert.strictEqual(answer.status, "success");
      assert.strictEqual(
        answer.content,
        "Everything up to ",
        "the text received before the stop is kept",
      );
      assert.isNull(store.streaming);
    } finally {
      restoreChatService(originals);
    }
  });

  it("saves an answer as a child note of the paper", async function () {
    const addonInstance = plugin();
    if (!addonInstance) {
      return;
    }

    let paper: Zotero.Item | undefined;
    const store = addonInstance.data.chat.store;
    try {
      paper = new Zotero.Item("book");
      paper.libraryID = Zotero.Libraries.userLibraryID;
      paper.setField("title", "Note target");
      await paper.saveTx();

      store.setPending({
        raw: "The writing is on the wall.",
        result: "不祥之兆已出现。",
        itemId: paper.id,
      });
      const ref = store.beginTurn("chatgpt", "What does it mean?", paper.id);
      assert.ok(ref, "beginTurn returned a ref");
      store.endTurn("It means a warning is coming.", "success", ref);

      await addonInstance.hooks.onChatMessageAction(
        "save-note",
        ref!.threadId,
        ref!.index,
      );

      // Query the library instead of the item's cached children: the cache is
      // updated by the (async) notifier.
      const allItems = await Zotero.Items.getAll(paper.libraryID);
      const stored = allItems.filter(
        (item) => item.isNote() && item.parentID === paper!.id,
      );
      // `getNotes()` returns ids, the library query returns items: both can
      // report the same note, so compare by id.
      const noteIDs = new Set([
        ...stored.map((item) => item.id),
        ...paper.getNotes(),
      ]);
      if (noteIDs.size !== 1) {
        assert.fail(`expected exactly one child note, got ${noteIDs.size}`);
      }
      assert.include(
        Zotero.Items.get([...noteIDs][0]).getNote(),
        "It means a warning is coming.",
        "the answer is in the note",
      );
    } finally {
      store.clear();
      if (paper?.id) {
        for (const noteID of paper.getNotes()) {
          await Zotero.Items.get(noteID).eraseTx();
        }
        await paper.eraseTx();
      }
    }
  });

  it("saves a note for a standalone attachment without a paper", async function () {
    const addonInstance = plugin();
    if (!addonInstance) {
      return;
    }
    const store = addonInstance.data.chat.store;
    const libraryID = Zotero.Libraries.userLibraryID;

    // A PDF that is not attached to a paper: its top level item is itself,
    // which Zotero refuses as the parent of a note.
    const attachment = new Zotero.Item("attachment");
    attachment.libraryID = libraryID;
    attachment.attachmentLinkMode = Zotero.Attachments.LINK_MODE_LINKED_URL;
    attachment.attachmentContentType = "application/pdf";
    attachment.setField("title", "Standalone PDF");
    await attachment.saveTx();

    try {
      store.setPending({ raw: "Text", result: "译文", itemId: attachment.id });
      const ref = store.beginTurn("chatgpt", "Q", attachment.id);
      assert.ok(ref);
      store.endTurn("Answer for a standalone attachment", "success", ref);
      await addonInstance.hooks.onChatMessageAction(
        "save-note",
        ref!.threadId,
        ref!.index,
      );

      const notes = (await Zotero.Items.getAll(libraryID)).filter(
        (item) =>
          item.isNote() &&
          !item.parentID &&
          item.getNote().includes("Answer for a standalone attachment"),
      );
      assert.lengthOf(notes, 1, "the answer is saved as a standalone note");
      await notes[0].eraseTx();
    } finally {
      store.clear();
      await attachment.eraseTx();
    }
  });

  it("saves a standalone note when the conversation has no item", async function () {
    const addonInstance = plugin();
    if (!addonInstance) {
      return;
    }
    const store = addonInstance.data.chat.store;
    const libraryID = Zotero.Libraries.userLibraryID;
    const before = (await Zotero.Items.getAll(libraryID)).map(
      (item) => item.id,
    );
    try {
      // No item id at all: without the fallback there is no library to save to
      store.setPending({ raw: "Text", result: "译文" });
      const ref = store.beginTurn("chatgpt", "Q", undefined);
      assert.ok(ref);
      store.endTurn("Standalone answer", "success", ref);
      await addonInstance.hooks.onChatMessageAction(
        "save-note",
        ref!.threadId,
        ref!.index,
      );
      const created = (await Zotero.Items.getAll(libraryID)).filter(
        (item) => item.isNote() && !before.includes(item.id),
      );
      assert.lengthOf(created, 1, "a standalone note is created");
      assert.include(created[0].getNote(), "Standalone answer");
      await created[0].eraseTx();
    } finally {
      store.clear();
    }
  });

  it("renders a finished answer as markdown, and the streamed text as plain", async function () {
    const addonInstance = plugin();
    if (!addonInstance) {
      return;
    }
    const store = addonInstance.data.chat.store;
    const mounted = mountPanel();
    if (!mounted) {
      return;
    }
    const bubble = () =>
      mounted.panel.querySelector(
        ".chat-bubble-assistant .chat-content",
      ) as HTMLElement | null;
    try {
      const ref = store.beginTurn("chatgpt", "What is $x^2$?", 1);
      assert.ok(ref);
      store.appendDelta("**Bold** answer with $E = mc^2$", ref);
      mounted.panel.render();

      // While streaming, half written markdown is shown as it arrives
      const streaming = bubble();
      assert.ok(streaming, "the streaming bubble is rendered");
      assert.notInclude(streaming!.innerHTML, "<strong>");
      assert.include(streaming!.textContent, "**Bold**");

      store.endTurn("**Bold** answer with $E = mc^2$", "success", ref);
      mounted.panel.render();

      const done = bubble();
      assert.ok(done, "the finished bubble is rendered");
      assert.include(done!.innerHTML, "<strong>Bold</strong>");
      assert.include(done!.innerHTML, "katex", "the LaTeX is rendered");
    } finally {
      store.clear();
      mounted.container.remove();
    }
  });

  it("renders a multi-line markdown answer", async function () {
    const addonInstance = plugin();
    if (!addonInstance) {
      return;
    }
    const store = addonInstance.data.chat.store;
    const mounted = mountPanel();
    if (!mounted) {
      return;
    }
    try {
      store.setPending({ raw: "Text", result: "译文", itemId: 1 });
      const ref = store.beginTurn("chatgpt", "Explain", 1);
      assert.ok(ref);
      // A realistic answer: headings, a list and soft line breaks
      store.endTurn(
        "## Title\n\nFirst line\nsecond line\n\n- one\n- two",
        "success",
        ref,
      );
      mounted.panel.render();

      const content = mounted.panel.querySelector(
        ".chat-bubble-assistant .chat-content",
      ) as HTMLElement | null;
      assert.ok(content, "the answer is rendered");
      // Query instead of matching the serialized html: elements carry an
      // xmlns attribute inside Zotero's XUL document.
      assert.strictEqual(content!.querySelector("h2")?.textContent, "Title");
      assert.isNotNull(content!.querySelector("br"), "line breaks are kept");
      assert.strictEqual(content!.querySelectorAll("li").length, 2);
    } finally {
      store.clear();
      mounted.container.remove();
    }
  });

  it("copes with there being no open note to insert into", async function () {
    const addonInstance = plugin();
    if (!addonInstance) {
      return;
    }
    const paper = new Zotero.Item("book");
    paper.libraryID = Zotero.Libraries.userLibraryID;
    paper.setField("title", "Insert target");
    await paper.saveTx();
    const store = addonInstance.data.chat.store;
    try {
      store.setPending({ raw: "Text", result: "译文", itemId: paper.id });
      const ref = store.beginTurn("chatgpt", "Q", paper.id);
      assert.ok(ref);
      store.endTurn("A", "success", ref);
      // With no note editor open the answer goes to the clipboard instead of
      // being inserted: nothing may be created behind the user's back.
      await addonInstance.hooks.onChatMessageAction(
        "insert-note",
        ref!.threadId,
        ref!.index,
      );
      assert.lengthOf(paper.getNotes(), 0);
    } finally {
      store.clear();
      for (const note of paper.getNotes()) {
        await note.eraseTx();
      }
      await paper.eraseTx();
    }
  });

  it("uses the current selection when the shortcut is pressed", function () {
    const addonInstance = plugin();
    if (!addonInstance) {
      return;
    }
    const queue = addonInstance.data.translate.queue;
    const backups = queue.splice(0, queue.length);
    try {
      addonInstance.data.translate.selectedText = "A brand new selection.";
      queue.push({
        id: "task-1",
        type: "text",
        raw: "An older selection.",
        result: "一段较早的译文。",
        audio: [],
        service: "chatgpt",
        candidateServices: [],
        itemId: 7,
        status: "success",
        extraTasks: [],
      } as TranslateTask);

      assert.isTrue(addonInstance.hooks.onChatAskLastTask());
      const pending = addonInstance.data.chat.store.pending;
      assert.ok(pending, "the shortcut queues a context");
      assert.strictEqual(pending.raw, "A brand new selection.");
      assert.strictEqual(pending.result, "");
      assert.strictEqual(pending.itemId, 7);
    } finally {
      addonInstance.data.chat.store.clear();
      addonInstance.data.translate.selectedText = "";
      queue.splice(0, queue.length, ...backups);
    }
  });
});
