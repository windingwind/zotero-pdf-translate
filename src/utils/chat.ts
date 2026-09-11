import { getPref } from "./prefs";
import type { ChatAbortRef, ChatMessage } from "./llmStream";

/**
 * Snapshot of what the user was reading when the conversation started.
 */
export interface ChatContext {
  /**
   * The selected source text.
   */
  raw: string;
  /**
   * The translation result shown in the popup / item pane.
   */
  result: string;
  /**
   * Zotero item id of the attachment the text was selected from.
   */
  itemId?: number;
  /**
   * Title of the top level item.
   */
  title?: string;
  /**
   * Abstract of the top level item.
   */
  abstractNote?: string;
  /**
   * Extra passage the user quoted into the conversation.
   */
  extra?: string;
}

export type ChatTurnStatus = "success" | "fail" | "streaming";

/**
 * Identifies a single turn inside a thread.
 */
export interface TurnRef {
  threadId: string;
  index: number;
}

/**
 * The turn that is currently being streamed.
 *
 * The abort state lives on the streaming turn instead of on the thread: a
 * request that has been stopped (or superseded by a newer question) can then
 * never abort or overwrite the next turn.
 */
export interface StreamRef extends TurnRef {
  abortFlag: ChatAbortRef;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  status: ChatTurnStatus;
}

export interface ChatThread {
  id: string;
  itemId?: number;
  service: string;
  context: ChatContext | null;
  turns: ChatTurn[];
  createdAt: number;
}

/**
 * Key a conversation is stored under.
 *
 * The reader hands over the id of the *attachment* while the item pane may be
 * showing the *parent* item of the same paper, so both are normalised to the
 * top level item: everything the user reads from one paper shares one
 * conversation, no matter which of its ids either side reports.
 */
export function getConversationKey(itemId?: number): number | undefined {
  if (!itemId) {
    return undefined;
  }
  try {
    const item = Zotero.Items.get(itemId);
    if (!item) {
      return itemId;
    }
    const topItem = Zotero.Items.getTopLevel([item])[0];
    return topItem?.id ?? itemId;
  } catch (e) {
    return itemId;
  }
}

/**
 * Build the context block prepended to the first question of a thread.
 */
export function formatContextBlock(context: ChatContext): string {
  const sections: string[] = [];
  if (context.raw) {
    sections.push(`Selected text:\n${context.raw}`);
  }
  if (context.result) {
    sections.push(`Existing translation:\n${context.result}`);
  }
  if (context.title || context.abstractNote) {
    const meta: string[] = [];
    if (context.title) {
      meta.push(`Title: ${context.title}`);
    }
    if (context.abstractNote) {
      meta.push(`Abstract: ${context.abstractNote}`);
    }
    sections.push(`Paper context:\n${meta.join("\n")}`);
  }
  if (!sections.length) {
    return "";
  }
  return `Context of this conversation:\n\n${sections.join("\n\n")}`;
}

/**
 * Build the message list sent to a chat service.
 *
 * The context block is merged into the first user message so that every
 * provider only ever sees a well-formed user/assistant alternation.
 */
export function buildChatMessages(
  thread: ChatThread,
  maxTurns: number,
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const system = String(getPref("chatPrompt") || "").trim();
  if (system) {
    messages.push({ role: "system", content: system });
  }

  let turns = thread.turns;
  if (maxTurns > 0 && turns.length > maxTurns) {
    // Always keep the first turn: it carries the context block
    turns = [turns[0], ...turns.slice(turns.length - (maxTurns - 1))];
  }

  turns.forEach((turn, index) => {
    if (turn.role === "assistant" && !turn.content) {
      // Skip the placeholder of an unfinished turn
      return;
    }
    let content = turn.content;
    if (index === 0 && turn.role === "user" && thread.context) {
      const block = formatContextBlock(thread.context);
      if (block) {
        content = `${block}\n\n---\n\n${content}`;
      }
    }
    messages.push({ role: turn.role, content });
  });

  return messages;
}

/**
 * In-memory store of follow-up conversations.
 *
 * The store is deliberately independent from the UI: the reader popup is
 * re-created on every reader render, so anything that must survive (threads,
 * the draft, the pending context) lives here instead of in the DOM.
 */
export class ChatStore {
  threads: ChatThread[] = [];

  /**
   * Selection that the next question will be asked about.
   */
  pending: ChatContext | null = null;

  draft = "";

  /**
   * Turn currently being streamed, if any.
   */
  streaming: StreamRef | null = null;

  #listeners = new Set<() => void>();

  subscribe(listener: () => void) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  notify() {
    this.#listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        ztoolkit.log("chat listener error", e);
      }
    });
  }

  getThreads(itemId?: number) {
    if (!itemId) {
      return [...this.threads];
    }
    const key = getConversationKey(itemId);
    return this.threads.filter(
      (thread) => getConversationKey(thread.itemId) === key,
    );
  }

  getThread(threadId: string) {
    return this.threads.find((thread) => thread.id === threadId);
  }

  getStreamingThread() {
    if (!this.streaming) {
      return undefined;
    }
    return this.getThread(this.streaming.threadId);
  }

  setDraft(draft: string) {
    this.draft = draft;
  }

  /**
   * Queue the context of a new selection for the next question.
   *
   * Replaces any pending selection: what is selected now is what the next
   * question is about.
   */
  setPending(context: ChatContext) {
    this.pending = context;
    this.notify();
    return this.pending;
  }

  clearPending() {
    if (!this.pending) {
      return;
    }
    this.pending = null;
    this.notify();
  }

  /**
   * Start a new turn.
   *
   * A new thread is created when there is no conversation for the current
   * item yet, or when the user asked about a new selection: previous threads
   * are kept so the history is not lost.
   */
  beginTurn(
    service: string,
    question: string,
    itemId?: number,
  ): StreamRef | null {
    const pending = this.pending;
    let thread = this.getThreads(itemId).pop();

    if (!thread || (pending && thread.turns.length > 0)) {
      thread = {
        id: `${Zotero.Utilities.randomString()}-${Date.now()}`,
        itemId,
        service,
        context: null,
        turns: [],
        createdAt: Date.now(),
      };
      this.threads.push(thread);
    }

    if (pending) {
      thread.context = pending;
      if (pending.itemId) {
        thread.itemId = pending.itemId;
      }
    }

    thread.turns.push({ role: "user", content: question, status: "success" });
    thread.turns.push({ role: "assistant", content: "", status: "streaming" });
    const ref: StreamRef = {
      threadId: thread.id,
      index: thread.turns.length - 1,
      abortFlag: { aborted: false },
    };
    this.streaming = ref;
    this.pending = null;
    this.draft = "";
    this.notify();

    return ref;
  }

  /**
   * Whether `ref` still points at the turn that is being streamed.
   *
   * A turn that is not the current one has been finished already (by the user
   * pressing stop, or by starting over), so late updates of its request must
   * be ignored instead of overwriting the answer the user has seen.
   */
  isStreaming(ref: TurnRef | null | undefined) {
    return (
      !!ref &&
      !!this.streaming &&
      this.streaming.threadId === ref.threadId &&
      this.streaming.index === ref.index
    );
  }

  /**
   * Update the streaming reply text.
   *
   * `ref` defaults to the current streaming turn. Pass the ref returned by
   * {@link beginTurn} when the caller may be a stale request, so that a reply
   * of an aborted turn cannot overwrite a newer one.
   */
  appendDelta(fullText: string, ref: TurnRef | null = this.streaming) {
    if (!this.isStreaming(ref)) {
      return;
    }
    const turn = this.#getTurn(ref);
    if (!turn) {
      return;
    }
    turn.content = fullText;
    this.notify();
  }

  /**
   * Finish the current turn.
   *
   * A stale `ref` (its request finished after the turn was already stopped or
   * replaced) is ignored, so the answer that is already on screen is kept.
   */
  endTurn(
    content: string,
    status: ChatTurnStatus,
    ref: TurnRef | null = this.streaming,
  ) {
    if (!this.isStreaming(ref)) {
      return;
    }
    const turn = this.#getTurn(ref);
    if (turn) {
      turn.content = content;
      turn.status = status;
    }
    this.streaming = null;
    this.notify();
  }

  #getTurn(ref: TurnRef | null) {
    if (!ref) {
      return undefined;
    }
    return this.getThread(ref.threadId)?.turns[ref.index];
  }

  /**
   * Abort the streaming request.
   */
  abort() {
    const streaming = this.streaming;
    if (!streaming) {
      return false;
    }
    streaming.abortFlag.aborted = true;
    // Abort the HTTP request right away instead of waiting for the next
    // stream chunk, so that "Stop" takes effect while the model is thinking.
    streaming.abortFlag.abort?.();
    return true;
  }

  /**
   * Append an error to the conversation, so that a failed request is visible
   * in the panel instead of silently doing nothing.
   */
  pushError(text: string, itemId?: number) {
    let thread = this.getThreads(itemId).pop();
    if (!thread) {
      thread = {
        id: `${Zotero.Utilities.randomString()}-${Date.now()}`,
        itemId,
        service: "",
        context: null,
        turns: [],
        createdAt: Date.now(),
      };
      this.threads.push(thread);
    }
    thread.turns.push({ role: "assistant", content: text, status: "fail" });
    this.notify();
    return thread;
  }

  clear(itemId?: number) {
    if (typeof itemId === "undefined") {
      this.threads = [];
      this.pending = null;
    } else {
      const key = getConversationKey(itemId);
      this.threads = this.threads.filter(
        (thread) => getConversationKey(thread.itemId) !== key,
      );
      if (getConversationKey(this.pending?.itemId) === key) {
        this.pending = null;
      }
    }
    this.streaming = null;
    this.notify();
  }
}

/**
 * Paper metadata used by the context block, read from a Zotero item.
 */
export function getPaperMeta(itemId?: number) {
  if (!itemId) {
    return {};
  }
  try {
    const item = Zotero.Items.get(itemId);
    const topItem = item ? Zotero.Items.getTopLevel([item])[0] : null;
    if (!topItem) {
      return {};
    }
    return {
      title: (topItem.getField("title") as string) || "",
      abstractNote: (topItem.getField("abstractNote") as string) || "",
    };
  } catch (e) {
    ztoolkit.log("failed to read paper meta", e);
    return {};
  }
}

export const chatStore = new ChatStore();
