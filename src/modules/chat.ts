import { config } from "../../package.json";
import { getPref, setPref } from "../utils/prefs";
import { getString, getLocaleID } from "../utils/locale";
import { buildChatMessages, chatStore, getPaperMeta } from "../utils/chat";
import type { ChatContext } from "../utils/chat";
import { getLastTranslateTask } from "../utils/task";
import { renderMarkdownToHTML } from "../utils/markdown";
import type { ChatPanel } from "../elements/chat";

export const CHAT_PANE_ID = "translate-chat";

/**
 * Body of the chat section that is currently rendered, if any.
 *
 * Kept so that the popup / shortcut can move the focus into the composer even
 * when they are not the ones rendering the section.
 */
let chatPaneBody: HTMLElement | undefined;

/**
 * Set when the composer should be focused on the next render.
 */
let focusRequested = false;

/**
 * Register the follow-up Q&A section in the item pane.
 */
export function registerChatPane() {
  const key = Zotero.ItemPaneManager.registerSection({
    paneID: CHAT_PANE_ID,
    pluginID: config.addonID,
    header: {
      l10nID: getLocaleID("chat-header"),
      icon: `chrome://${config.addonRef}/content/icons/chat-section-16.svg`,
    },
    sidenav: {
      l10nID: getLocaleID("chat-sidenav"),
      icon: `chrome://${config.addonRef}/content/icons/chat-section-20.svg`,
      // @ts-ignore 'orderable' is supported but missing in the typings
      orderable: false,
    },
    bodyXHTML: "<translator-chat-panel />",
    onInit,
    onRender: ({ body, item }) => {
      renderChatPane(body, item?.id);
    },
    onAsyncRender: async ({ body, item }) => {
      // The section may be rendered before the custom element has been
      // upgraded: render once more, after the pane settled.
      renderChatPane(body, item?.id);
    },
    onItemChange: ({ tabType, item, body, setEnabled }) => {
      if (tabType !== "reader") {
        setEnabled(false);
      }
      body.dataset.itemID = String(item?.id);
      return true;
    },
  });
  if (key) {
    addon.data.chat.paneKey = key;
  }
  return key;
}

function onInit({ body }: { body: HTMLElement }) {
  body.dataset.paneUid = Zotero.Utilities.randomString(8);
}

function getPanel(body: HTMLElement) {
  return body.querySelector("translator-chat-panel") as ChatPanel | null;
}

/**
 * Paint the panel of a section body.
 *
 * Never throws: a failing hook would leave the section blank.
 */
function renderChatPane(body: HTMLElement, itemId?: number) {
  try {
    const panel = getPanel(body);
    if (!panel || typeof panel.render !== "function") {
      return;
    }
    chatPaneBody = body;
    // A draft belongs to the paper it was typed on: switching items must not
    // carry a half-written question over to another paper.
    if (panel._itemID !== itemId) {
      chatStore.setDraft("");
    }
    panel._itemID = itemId;
    panel.render();
    if (focusRequested) {
      focusRequested = false;
      panel.focusComposer();
    }
  } catch (e) {
    ztoolkit.log("failed to render the chat pane", e);
  }
}

/**
 * Resolve the LLM service used for follow-up Q&A.
 *
 * Falls back to the current translation service when it supports chat, and
 * otherwise to the first configured chat-capable service.
 */
export function getChatServiceId(): string {
  const services = addon.data.translate.services;
  const readyServices = services
    .getAllServicesWithType("sentence")
    .filter((service) => isServiceChatReady(service.id));

  // Prefer the service the user picked for Q&A, then the one used for
  // translation, and finally any configured LLM service. Falling back to
  // *configured* services only keeps the popup entry (and the shortcut) out of
  // the way of users who never set up an LLM.
  for (const id of [
    getPref("chatService") as string,
    getPref("translateSource") as string,
  ]) {
    if (id && readyServices.some((service) => service.id === id)) {
      return id;
    }
  }
  return readyServices[0]?.id || "";
}

/**
 * Whether a service can be used for follow-up Q&A.
 *
 * A service is ready when it implements `chat` and, if it knows how to tell,
 * is configured (endpoint / model / secret).
 */
export function isServiceChatReady(serviceId: string | undefined) {
  if (!serviceId) {
    return false;
  }
  const service = addon.data.translate.services.getServiceById(serviceId);
  if (!service?.chat) {
    return false;
  }
  if (!service.isConfigured) {
    return true;
  }
  try {
    return !!service.isConfigured();
  } catch (e) {
    // A service must never break the popup / startup just because its
    // settings are malformed (e.g. an endpoint that is not a URL).
    ztoolkit.log(`failed to check the configuration of ${serviceId}`, e);
    return false;
  }
}

/**
 * Keep the service cached on the addon data, so that the panel (which runs in
 * another bundle) can read it without importing the service registry.
 */
export function syncChatService() {
  addon.data.chat.service = getChatServiceId();
  return addon.data.chat.service;
}

function notify(text: string) {
  new ztoolkit.ProgressWindow(config.addonName)
    .createLine({ text, type: "default", progress: 100 })
    .show();
}

/**
 * Called from the reader popup / shortcut: queue a selection as the context
 * of the next question and reveal the chat section.
 */
export function askFollowUp(context: ChatContext) {
  if (!context.raw && !context.result) {
    return;
  }
  const meta = getPaperMeta(context.itemId);
  chatStore.setPending({ ...meta, ...context });
  syncChatService();
  openChatPane();
  requestChatFocus();
  if (!getChatServiceId()) {
    notify(getString("chat-error-no-service"));
  }
}

/**
 * Show the chat section in the context pane.
 */
export function openChatPane() {
  const win = Zotero.getMainWindow() as any;
  const contextPane = win?.ZoteroContextPane;
  if (!contextPane) {
    return false;
  }
  const selector = `.btn[data-pane="${cssEscape(win, CHAT_PANE_ID)}"]`;
  const clickButton = () => {
    const button = contextPane.sidenav?.querySelector(selector) as
      | HTMLElement
      | undefined;
    if (!button) {
      return false;
    }
    // Clicking an already active section only scrolls to it, so this is safe
    // to call when the section is open already.
    button.click();
    return true;
  };

  if (clickButton()) {
    return true;
  }

  // The context pane is collapsed: expand it (instead of toggling, which
  // would close it when it is open but has not rendered its sidenav yet) and
  // retry, since the sidenav is created asynchronously.
  try {
    if (contextPane.collapsed) {
      contextPane.collapsed = false;
    }
  } catch (e) {
    ztoolkit.log("failed to expand the context pane", e);
  }

  let retries = 10;
  const retry = () => {
    if (clickButton() || retries-- <= 0) {
      return;
    }
    win.setTimeout(retry, 50);
  };
  retry();
  return false;
}

/**
 * Queue the selection the user is looking at for a follow-up question.
 *
 * The shortcut is used right after selecting a passage: prefer the text that
 * is selected *now* over the last translated task, which may be older.
 */
export function askFollowUpFromLastTask() {
  const task = getLastTranslateTask({ type: "text" });
  const selection = (addon.data.translate.selectedText || "").trim();
  if (selection && selection !== task?.raw) {
    askFollowUp({
      raw: selection,
      result: "",
      itemId: task?.itemId ?? getActiveReaderItemId(),
    });
    return true;
  }
  if (!task?.raw) {
    return false;
  }
  askFollowUp({
    raw: task.raw,
    result: task.result,
    itemId: task.itemId,
  });
  return true;
}

/**
 * Item id of the attachment open in the selected reader tab, if any.
 */
function getActiveReaderItemId() {
  try {
    const win = Zotero.getMainWindow() as any;
    const selectedID = win?.Zotero_Tabs?.selectedID;
    const reader = selectedID
      ? Zotero.Reader?.getByTabID?.(selectedID)
      : undefined;
    return reader?.itemID;
  } catch (e) {
    ztoolkit.log("failed to resolve the active reader", e);
    return undefined;
  }
}

/**
 * Move the keyboard focus into the composer of the chat section.
 *
 * Called when the user asked a follow-up from the popup / the shortcut: the
 * whole point of the entry point is that the user can start typing right away.
 */
export function requestChatFocus() {
  focusRequested = true;
  focusChatComposer();
  // Switching the section may not have happened yet: retry once, and let a
  // render that is still on its way consume the flag as well.
  setTimeout(() => {
    if (focusRequested) {
      focusRequested = false;
      focusChatComposer();
    }
  }, 150);
}

function focusChatComposer() {
  const panel = chatPaneBody ? getPanel(chatPaneBody) : null;
  if (!panel) {
    return false;
  }
  panel.focusComposer();
  return true;
}

function cssEscape(win: any, value: string) {
  try {
    return win.CSS?.escape ? win.CSS.escape(value) : value;
  } catch (e) {
    return value;
  }
}

/**
 * Send the draft as a new turn.
 */
export async function sendChatMessage(itemId?: number) {
  try {
    const question = chatStore.draft.trim();
    if (!question || chatStore.streaming) {
      return;
    }

    const serviceId = syncChatService();
    const service = addon.data.translate.services.getServiceById(serviceId);
    if (!service?.chat) {
      // Keep the draft: the user can configure an engine and send it again.
      notify(getString("chat-error-no-service"));
      chatStore.pushError(getString("chat-error-no-service"), itemId);
      return;
    }

    const threadRef = chatStore.beginTurn(serviceId, question, itemId);
    if (!threadRef) {
      return;
    }
    const thread = chatStore.getThread(threadRef.threadId);
    if (!thread) {
      return;
    }
    const maxTurns = Number(getPref("chatMaxTurns")) || 10;
    const messages = buildChatMessages(thread, maxTurns);

    try {
      const result = await service.chat({
        messages,
        onDelta: (fullText) => chatStore.appendDelta(fullText, threadRef),
        isAborted: () => threadRef.abortFlag.aborted,
        abortRef: threadRef.abortFlag,
      });
      chatStore.endTurn(result, "success", threadRef);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      chatStore.endTurn(
        `${getString("service-errorPrefix")} ${addon.data.translate.services.getServiceNameByID(serviceId)}\n\n${detail}`,
        "fail",
        threadRef,
      );
    }
  } catch (e) {
    // Anything that goes wrong before the request is started must be visible:
    // a silent failure looks like "the button does nothing".
    ztoolkit.log("failed to send the chat message", e);
    notify(getString("chat-error-no-service"));
    chatStore.pushError(
      `${getString("service-errorPrefix")}\n\n${
        e instanceof Error ? e.message : String(e)
      }`,
      itemId,
    );
  }
}

export function stopChatMessage() {
  const thread = chatStore.getStreamingThread();
  const ref = chatStore.streaming;
  if (!thread || !ref) {
    return;
  }
  chatStore.abort();
  // Finish the turn right away with the text received so far: the request is
  // only aborted on the next stream chunk.
  const turn = thread.turns[ref.index];
  chatStore.endTurn(turn?.content || "", "success", ref);
}

export function clearChat(itemId?: number) {
  chatStore.clear(itemId);
}

export function changeChatService(serviceId: string) {
  setPref("chatService", serviceId);
  addon.data.chat.service = serviceId;
  chatStore.notify();
}

/**
 * Copy / insert / save an answer.
 */
export async function handleChatMessageAction(
  action: string,
  threadId: string,
  turnIndex: number,
) {
  const thread = chatStore.getThread(threadId);
  const turn = thread?.turns[turnIndex];
  if (!turn) {
    return;
  }

  if (action === "copy") {
    new ztoolkit.Clipboard().addText(turn.content, "text/plain").copy();
    notify(getString("chat-copied"));
    return;
  }

  const html = buildAnswerHTML(threadId, turnIndex, turn.content);

  if (action === "insert-note") {
    if (insertIntoActiveNote(html)) {
      notify(getString("chat-inserted"));
    } else {
      new ztoolkit.Clipboard().addText(turn.content, "text/plain").copy();
      notify(getString("chat-no-note"));
    }
    return;
  }

  if (action === "save-note") {
    try {
      await saveAsNote(thread?.itemId, html);
      notify(getString("chat-note-saved"));
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      ztoolkit.log("failed to save note", e);
      // Show the reason in the conversation: a bare "failed" toast is not
      // actionable for the user (or for a bug report).
      chatStore.pushError(
        `${getString("chat-note-save-failed")}\n\n${detail}`,
        thread?.itemId,
      );
      notify(getString("chat-note-save-failed"));
    }
  }
}

function buildAnswerHTML(threadId: string, turnIndex: number, answer: string) {
  const thread = chatStore.getThread(threadId);
  const question = thread?.turns
    .slice(0, turnIndex)
    .reverse()
    .find((turn) => turn.role === "user")?.content;
  const quote = thread?.context?.raw;
  const paragraphs: string[] = [];
  if (quote) {
    paragraphs.push(`<blockquote>${escapeHtml(quote)}</blockquote>`);
  }
  if (question) {
    paragraphs.push(`<p><strong>${escapeHtml(question)}</strong></p>`);
  }
  // The answer is markdown: render it instead of writing literal asterisks
  // into the note. LaTeX is left as-is, a note does not load the KaTeX CSS.
  paragraphs.push(renderMarkdownToHTML(getDoc(), answer, { math: false }));
  return paragraphs.join("");
}

function getDoc() {
  return (Zotero.getMainWindow() as any).document;
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/**
 * Insert HTML into the note editor that is open in the context pane.
 */
function insertIntoActiveNote(html: string) {
  const noteEditor = getActiveNoteEditor();
  if (!noteEditor) {
    return false;
  }
  try {
    const instance =
      noteEditor.getCurrentInstance?.() || noteEditor._editorInstance;
    if (!instance) {
      return false;
    }
    if (typeof instance.insertHTML === "function") {
      instance.insertHTML(html);
      return true;
    }
    if (typeof instance._postMessage === "function") {
      // Same internal call Zotero uses for "Add to Note"
      instance._postMessage({ action: "insertHTML", pos: null, html });
      return true;
    }
  } catch (e) {
    ztoolkit.log("failed to insert into note", e);
  }
  return false;
}

/**
 * Note editor that is open in a context pane, if any.
 *
 * A reader can live in its own window (with its own context pane), so every
 * Zotero window is checked instead of only the main one.
 */
function getActiveNoteEditor() {
  const windows = new Set<any>();
  try {
    windows.add(Zotero.getMainWindow());
  } catch (e) {
    // ignore
  }
  try {
    (Zotero.getMainWindows() || []).forEach((win) => windows.add(win));
  } catch (e) {
    // ignore
  }
  try {
    const selectedID = (Zotero.getMainWindow() as any)?.Zotero_Tabs?.selectedID;
    const reader = selectedID
      ? (Zotero.Reader as any)?.getByTabID?.(selectedID)
      : undefined;
    if (reader?._window) {
      windows.add(reader._window);
    }
  } catch (e) {
    // ignore
  }
  for (const win of windows) {
    const editor = win?.ZoteroContextPane?.activeEditor;
    if (editor) {
      return editor;
    }
  }
  return undefined;
}

/**
 * Save the answer as a child note of the paper.
 */
async function saveAsNote(itemId: number | undefined, html: string) {
  const item = itemId ? Zotero.Items.get(itemId) : null;
  const topItem = item ? Zotero.Items.getTopLevel([item])[0] : null;
  // A note can only be a child of a *regular* item. The top level item of a
  // standalone attachment (a PDF or EPUB that is not attached to a paper) is
  // the attachment itself, and Zotero rejects that as a parent with
  // "Parent item ... must be a regular item".
  const parent = topItem?.isRegularItem?.() ? topItem : null;
  const note = new Zotero.Item("note");
  note.libraryID =
    parent?.libraryID ?? item?.libraryID ?? Zotero.Libraries.userLibraryID;
  if (parent) {
    note.parentID = parent.id;
  }
  note.setNote(html);
  await note.saveTx();
  return note;
}
