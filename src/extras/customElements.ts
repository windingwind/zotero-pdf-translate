import { TranslatorPanel } from "../elements/panel";
import { MathTextboxElement } from "../elements/mathTextbox";
import { ChatPanel } from "../elements/chat";

const elements = {
  "translator-plugin-panel": TranslatorPanel,
  "math-textbox": MathTextboxElement,
  "translator-chat-panel": ChatPanel,
} as unknown as Record<string, CustomElementConstructor>;

for (const [key, constructor] of Object.entries(elements)) {
  if (!customElements.get(key)) {
    customElements.define(key, constructor);
  }
}
