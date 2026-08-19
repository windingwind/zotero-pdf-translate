import { assert } from "chai";

import { hasSourceTextPlaceholder } from "../src/modules/services/gptPrompt";

describe("GPT prompt validation", function () {
  it("rejects a prompt without the source text placeholder", function () {
    assert.isFalse(hasSourceTextPlaceholder("Translate this text."));
  });

  it("accepts a prompt with the source text placeholder", function () {
    assert.isTrue(hasSourceTextPlaceholder("Translate this: ${sourceText}"));
  });
});
