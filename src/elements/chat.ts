import { config } from "../../package.json";
import { PluginCEBase } from "./base";
import { getLocaleID } from "../utils/locale";
import { renderMarkdownToHTML } from "../utils/markdown";
import type { FluentMessageId } from "../../typings/i10n";
import type { ChatStore, ChatThread } from "../utils/chat";
import type { TranslateService } from "../modules/services/base";

const XHTML_NS = "http://www.w3.org/1999/xhtml";

/**
 * Create a real HTML element.
 *
 * `document.createElement("div")` inside Zotero's XUL document produces an
 * element whose `innerHTML` is parsed as XML, where a plain `<br>` is a syntax
 * error. The documents the panel renders come from a model, so they are parsed
 * as HTML.
 */
function createHtmlElement<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tagName: K,
) {
  return doc.createElementNS(XHTML_NS, tagName) as HTMLElementTagNameMap[K];
}

/**
 * Whether a service is ready to answer questions.
 *
 * Malformed settings (e.g. an endpoint that is not a URL) must not break the
 * panel: such a service is simply not offered.
 */
function isConfigured(service: TranslateService) {
  try {
    return !!service.isConfigured?.();
  } catch (e) {
    return false;
  }
}

/**
 * Locale string of this panel.
 *
 * `getString` cannot be used here: the bundle that registers the custom
 * elements is evaluated in the Zotero window, where the `addon` global it
 * relies on does not exist. The strings are read from the addon instance
 * instead, which is why `PluginCEBase` keeps a reference to it.
 */
function panelString(addonInstance: typeof addon, key: FluentMessageId) {
  const l10n = (addonInstance as any)?.data?.locale?.current;
  const message = l10n?.formatMessagesSync?.([{ id: getLocaleID(key) }])?.[0];
  return message?.value || getLocaleID(key);
}

/**
 * Item pane section body of the follow-up Q&A panel.
 *
 * The panel itself is stateless: everything it shows comes from the shared
 * {@link ChatStore}, so it survives the popup / section being re-created.
 */
export class ChatPanel extends PluginCEBase {
  _itemID: number | undefined;

  _unsubscribe?: () => void;

  _streamRef?: { threadId: string; index: number };

  _streamContentEl?: HTMLElement;

  get store(): ChatStore {
    return this._addon.data.chat.store;
  }

  get content() {
    return this._parseContentID(
      MozXULElement.parseXULToFragment(`
<linkset>
  <html:link rel="localization" href="${config.addonRef}-addon.ftl" />
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/katex.min.css"
  ></html:link>
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/chat.css"
  ></html:link>
</linkset>
<html:div id="chat-root" class="chat-root">
  <html:div id="chat-toolbar" class="chat-toolbar">
    <menulist id="chat-service" native="true">
      <menupopup id="chat-service-popup"></menupopup>
    </menulist>
    <html:span class="chat-grow"></html:span>
    <button id="chat-clear" data-l10n-id="chat-clear" />
  </html:div>
  <html:div id="chat-messages" class="chat-messages"></html:div>
  <html:div id="chat-pending" class="chat-pending" hidden="true">
    <html:div class="chat-pending-head">
      <html:span data-l10n-id="chat-context" />
    </html:div>
    <html:div id="chat-quote" class="chat-quote"></html:div>
  </html:div>
  <html:div id="chat-composer" class="chat-composer">
    <html:textarea
      id="chat-draft"
      class="chat-draft"
      rows="1"
      data-l10n-id="chat-draft"
    ></html:textarea>
    <button id="chat-stop" class="chat-stop" data-l10n-id="chat-stop" hidden="true" />
    <button id="chat-send" class="chat-send" data-l10n-id="chat-send" />
  </html:div>
  <html:div class="chat-composer-hint" data-l10n-id="chat-hint" />
</html:div>
`),
    );
  }

  init(): void {
    this._queryID("chat-service")?.addEventListener("command", (e) => {
      const service = (e.target as XUL.MenuList).value;
      this._addon.hooks.onChatServiceChange(service);
    });

    this._queryID("chat-clear")?.addEventListener("command", () => {
      this._addon.hooks.onChatClear(this._itemID);
    });

    this._queryID("chat-send")?.addEventListener("command", () => {
      this._addon.hooks.onChatSend(this._itemID);
    });

    this._queryID("chat-stop")?.addEventListener("command", () => {
      this._addon.hooks.onChatStop();
    });

    const draft = this._queryID("chat-draft") as HTMLTextAreaElement;
    draft?.addEventListener("input", () => {
      this.store.setDraft(draft.value);
      this._autoGrow(draft);
    });
    draft?.addEventListener("keydown", (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this._addon.hooks.onChatSend(this._itemID);
      }
    });
    draft?.addEventListener("keyup", (e: KeyboardEvent) => {
      e.stopPropagation();
    });

    this._queryID("chat-messages")?.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement)?.closest?.(
        "[data-action]",
      ) as HTMLElement | null;
      if (!target) {
        return;
      }
      const { action, threadId, turnIndex } = target.dataset;
      if (action === "toggle-quote") {
        const card = target.closest(".chat-context-card") as HTMLElement | null;
        if (!card) {
          return;
        }
        card.classList.toggle("chat-context-expanded");
        target.textContent = card.classList.contains("chat-context-expanded")
          ? panelString(this._addon, "chat-context-collapse")
          : panelString(this._addon, "chat-context-expand");
        return;
      }
      this._addon.hooks.onChatMessageAction(
        action!,
        threadId!,
        Number(turnIndex),
      );
    });

    this._unsubscribe = this.store.subscribe(() => this._onStoreChange());

    // Zotero wipes the children of a custom element when it is disconnected
    // and re-appends `content` when it is connected again, so paint here as
    // well: the panel must never come back empty.
    this.render();
  }

  destroy(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
  }

  /**
   * Called by the item pane when the section is (re-)rendered.
   */
  render(): void {
    try {
      this._renderServices();
      this._renderMessages();
      this._renderPending();
      this._renderComposer();
    } catch (e) {
      ztoolkit.log("failed to render the chat panel", e);
    }
  }

  /**
   * Item the panel is bound to.
   *
   * `_itemID` is set by the item pane section; the fallback covers the case
   * where the panel renders before the section told it which item it is.
   */
  get currentItemID(): number | undefined {
    if (typeof this._itemID === "number") {
      return this._itemID;
    }
    const body = this.closest?.("[data-itemid]") as HTMLElement | null;
    const raw = Number(body?.dataset?.itemid);
    return Number.isFinite(raw) && raw > 0 ? raw : undefined;
  }

  /**
   * Throttle full re-renders while a reply is streaming: patch the streaming
   * bubble instead, so the draft and text selection are not disturbed.
   */
  _onStoreChange() {
    const streaming = this.store.streaming;
    if (
      streaming &&
      this._streamRef &&
      this._streamRef.threadId === streaming.threadId &&
      this._streamRef.index === streaming.index &&
      this._streamContentEl?.isConnected
    ) {
      const thread = this.store.getThread(streaming.threadId);
      const turn = thread?.turns[streaming.index];
      if (turn) {
        this._setContent(this._streamContentEl, turn.content);
        if (!this._streamContentEl.querySelector(".chat-caret")) {
          this._streamContentEl.append(
            this._buildCaret(this._streamContentEl.ownerDocument),
          );
        }
        this._scrollToBottom();
        return;
      }
    }
    this.render();
  }

  _renderServices() {
    const menulist = this._queryID("chat-service") as XUL.MenuList;
    const popup = this._queryID("chat-service-popup");
    if (!menulist || !popup) {
      return;
    }
    const services = this._addon.data.translate.services;
    const chatServices = services
      .getAllServicesWithType("sentence")
      // Only services that are usable right now: an unconfigured LLM would
      // only fail with "not configured" when the first question is sent.
      .filter(
        (service) =>
          !!service.chat && (!service.isConfigured || isConfigured(service)),
      );
    const selected = this._addon.data.chat.service;
    const current = chatServices.some((service) => service.id === selected)
      ? selected
      : chatServices[0]?.id || "";

    const doc = this.ownerDocument;
    popup.replaceChildren(
      ...chatServices.map((service) => {
        const item = doc.createXULElement("menuitem");
        item.setAttribute("label", services.getServiceNameByID(service.id));
        item.setAttribute("value", service.id);
        return item;
      }),
    );
    menulist.value = current;
    (this._queryID("chat-toolbar") as HTMLElement)?.toggleAttribute(
      "hidden",
      chatServices.length === 0,
    );
  }

  _renderMessages() {
    const container = this._queryID("chat-messages") as HTMLElement;
    if (!container) {
      return;
    }
    const doc = this.ownerDocument;
    const threads = this.store.getThreads(this.currentItemID);
    const children: Node[] = [];

    this._streamRef = undefined;
    this._streamContentEl = undefined;

    if (!threads.length) {
      const empty = doc.createElement("div");
      empty.className = "chat-empty";
      empty.textContent = panelString(this._addon, "chat-empty");
      container.replaceChildren(empty);
      return;
    }

    for (const thread of threads) {
      children.push(this._buildThread(doc, thread));
    }
    container.replaceChildren(...children);
    this._scrollToBottom();
  }

  _buildThread(doc: Document, thread: ChatThread) {
    const wrapper = doc.createElement("div");
    wrapper.className = "chat-thread";

    if (thread.context) {
      wrapper.append(this._buildContextCard(doc, thread));
    }

    thread.turns.forEach((turn, index) => {
      const bubble = doc.createElement("div");
      bubble.className = `chat-bubble chat-bubble-${turn.role}`;
      if (turn.status === "fail") {
        bubble.classList.add("chat-bubble-error");
      }

      const content = createHtmlElement(doc, "div");
      content.className = "chat-content";
      // Markdown and LaTeX are rendered once the reply is complete: rendering
      // it on every stream chunk would flicker on half-written constructs.
      this._setContent(content, turn.content, turn.status !== "streaming");
      bubble.append(content);

      if (
        turn.role === "assistant" &&
        this.store.streaming?.threadId === thread.id &&
        this.store.streaming.index === index
      ) {
        content.append(this._buildCaret(doc));
        this._streamRef = { threadId: thread.id, index };
        this._streamContentEl = content;
      }

      if (turn.role === "assistant" && turn.status !== "streaming") {
        bubble.append(this._buildActions(doc, thread, index));
      }

      wrapper.append(bubble);
    });

    return wrapper;
  }

  _buildContextCard(doc: Document, thread: ChatThread) {
    const context = thread.context!;
    const card = doc.createElement("div");
    card.className = "chat-context-card";

    const title = doc.createElement("div");
    title.className = "chat-context-title";
    title.textContent = panelString(this._addon, "chat-context");
    card.append(title);

    const quote = doc.createElement("div");
    quote.className = "chat-context-quote";
    quote.textContent = context.raw || context.result;
    card.append(quote);

    const toggle = doc.createElement("button");
    toggle.className = "chat-link-button";
    toggle.dataset.action = "toggle-quote";
    toggle.dataset.threadId = thread.id;
    toggle.textContent = panelString(this._addon, "chat-context-expand");
    card.append(toggle);

    return card;
  }

  _buildActions(doc: Document, thread: ChatThread, index: number) {
    const actions = doc.createElement("div");
    actions.className = "chat-actions";
    (
      [
        ["copy", "chat-copy"],
        ["insert-note", "chat-insert-note"],
        ["save-note", "chat-save-note"],
      ] as const
    ).forEach(([action, l10n]) => {
      const button = doc.createElement("button");
      button.className = "chat-link-button";
      button.dataset.action = action;
      button.dataset.threadId = thread.id;
      button.dataset.turnIndex = String(index);
      button.textContent = panelString(this._addon, l10n);
      actions.append(button);
    });
    return actions;
  }

  _buildCaret(doc: Document) {
    const caret = doc.createElement("span");
    caret.className = "chat-caret";
    return caret;
  }

  _renderPending() {
    const container = this._queryID("chat-pending") as HTMLElement;
    const quote = this._queryID("chat-quote") as HTMLElement;
    if (!container || !quote) {
      return;
    }
    const pending = this.store.pending;
    container.hidden = !pending;
    if (!pending) {
      quote.textContent = "";
      return;
    }
    quote.textContent = pending.raw || pending.result || "";
  }

  _renderComposer() {
    const draft = this._queryID("chat-draft") as HTMLTextAreaElement;
    const send = this._queryID("chat-send") as XUL.Button;
    const stop = this._queryID("chat-stop") as XUL.Button;
    if (!draft || !send || !stop) {
      return;
    }
    if (draft.value !== this.store.draft) {
      draft.value = this.store.draft;
    }
    this._autoGrow(draft);
    const streaming = !!this.store.streaming;
    send.disabled = streaming;
    stop.hidden = !streaming;
  }

  /**
   * Focus the composer, so that a follow-up started from the popup or from the
   * shortcut can be typed right away.
   */
  focusComposer() {
    const draft = this._queryID("chat-draft") as HTMLTextAreaElement;
    if (!draft) {
      return;
    }
    draft.focus();
    const end = draft.value.length;
    try {
      draft.setSelectionRange(end, end);
    } catch (e) {
      // Non-text inputs do not support selection ranges
    }
    this._scrollToBottom();
  }

  /**
   * Fill a bubble.
   *
   * While a reply streams it is shown as plain text (cheap, and no half
   * written markdown); a finished reply is rendered as markdown with KaTeX.
   * Both paths escape the model output first.
   */
  _setContent(container: HTMLElement, text: string, markdown = false) {
    container.classList.toggle("chat-content-md", markdown);
    if (!markdown) {
      container.textContent = text;
      return;
    }
    try {
      container.innerHTML = renderMarkdownToHTML(this.ownerDocument, text);
    } catch (e) {
      // Never let a rendering failure freeze the panel: it would keep the
      // streaming look and block the next question until the threads are
      // cleared. Show the raw text instead.
      ztoolkit.log("failed to render an answer as markdown", e);
      container.classList.remove("chat-content-md");
      container.textContent = text;
    }
  }

  _autoGrow(draft: HTMLTextAreaElement) {
    draft.style.height = "auto";
    draft.style.height = `${Math.min(160, draft.scrollHeight || 0)}px`;
  }

  _scrollToBottom() {
    const container = this._queryID("chat-messages") as HTMLElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
}
