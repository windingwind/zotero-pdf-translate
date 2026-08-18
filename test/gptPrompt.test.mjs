import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import ts from "typescript";

const sourceUrl = new URL(
  "../src/modules/services/gptPrompt.ts",
  import.meta.url,
);
const source = await readFile(sourceUrl, "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const { hasSourceTextPlaceholder } = await import(moduleUrl);

test("rejects a prompt that omits the selected text placeholder", () => {
  assert.equal(hasSourceTextPlaceholder("Translate this text."), false);
});

test("accepts a prompt that includes the selected text placeholder", () => {
  assert.equal(hasSourceTextPlaceholder("Translate this: ${sourceText}"), true);
});
