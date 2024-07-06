import { TranslatorPanel } from "../elements/panel";

const elements = {
  "translator-plugin-panel": TranslatorPanel,
} as unknown as Record<string, CustomElementConstructor>;

for (const [key, constructor] of Object.entries(elements)) {
  if (!customElements.get(key)) {
    customElements.define(key, constructor);
  }
}
