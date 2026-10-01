import { buildThinkingParams } from "../src/utils/thinkingParams";

describe("Thinking params dialect mapping", function () {
  it("sends nothing for the default level", function () {
    assert.deepEqual(
      buildThinkingParams(
        "https://open.bigmodel.cn/api/coding/paas/v4/chat/completions",
        "glm-5.3",
        "default",
      ),
      {},
    );
  });

  it("sends nothing for unknown or invalid endpoints", function () {
    assert.deepEqual(
      buildThinkingParams(
        "https://relay.example.com/v1/chat/completions",
        "some-model",
        "off",
      ),
      {},
    );
    assert.deepEqual(buildThinkingParams("not a url", "some-model", "off"), {});
  });

  it("sends nothing for unknown levels", function () {
    assert.deepEqual(
      buildThinkingParams(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        "glm-5.3",
        "extreme",
      ),
      {},
    );
  });

  it("maps OpenAI chat completions to reasoning_effort", function () {
    assert.deepEqual(
      buildThinkingParams(
        "https://api.openai.com/v1/chat/completions",
        "gpt-5.1",
        "off",
      ),
      { reasoning_effort: "none" },
    );
    assert.deepEqual(
      buildThinkingParams(
        "https://api.openai.com/v1/chat/completions",
        "gpt-5",
        "off",
      ),
      { reasoning_effort: "minimal" },
    );
    assert.deepEqual(
      buildThinkingParams(
        "https://api.openai.com/v1/chat/completions",
        "gpt-5.0",
        "off",
      ),
      { reasoning_effort: "minimal" },
    );
    assert.deepEqual(
      buildThinkingParams(
        "https://api.openai.com/v1/chat/completions",
        "gpt-4o",
        "high",
      ),
      { reasoning_effort: "high" },
    );
  });

  it("maps Azure endpoints to reasoning_effort", function () {
    assert.deepEqual(
      buildThinkingParams(
        "https://my-resource.openai.azure.com/openai/deployments/gpt-5/chat/completions?api-version=2025-04-01-preview",
        "gpt-5",
        "off",
      ),
      { reasoning_effort: "minimal" },
    );
  });

  it("maps OpenAI Responses API endpoints to nested reasoning", function () {
    assert.deepEqual(
      buildThinkingParams(
        "https://api.openai.com/v1/responses",
        "gpt-5.1",
        "off",
      ),
      { reasoning: { effort: "none" } },
    );
    assert.deepEqual(
      buildThinkingParams(
        "https://api.openai.com/v1/responses",
        "gpt-5.1",
        "medium",
      ),
      { reasoning: { effort: "medium" } },
    );
  });

  it("maps OpenRouter to the unified reasoning object", function () {
    assert.deepEqual(
      buildThinkingParams(
        "https://openrouter.ai/api/v1/chat/completions",
        "any-model",
        "off",
      ),
      { reasoning: { enabled: false } },
    );
    assert.deepEqual(
      buildThinkingParams(
        "https://openrouter.ai/api/v1/chat/completions",
        "any-model",
        "medium",
      ),
      { reasoning: { effort: "medium" } },
    );
  });

  it("maps DeepSeek to thinking.type plus reasoning_effort levels", function () {
    assert.deepEqual(
      buildThinkingParams(
        "https://api.deepseek.com/v1/chat/completions",
        "deepseek-v4-flash",
        "off",
      ),
      { thinking: { type: "disabled" } },
    );
    assert.deepEqual(
      buildThinkingParams(
        "https://api.deepseek.com/v1/chat/completions",
        "deepseek-v4-flash",
        "low",
      ),
      { thinking: { type: "enabled" }, reasoning_effort: "low" },
    );
    assert.deepEqual(
      buildThinkingParams(
        "https://api.deepseek.com/v1/chat/completions",
        "deepseek-v4-flash",
        "medium",
      ),
      { thinking: { type: "enabled" }, reasoning_effort: "high" },
    );
    assert.deepEqual(
      buildThinkingParams(
        "https://api.deepseek.com/v1/chat/completions",
        "deepseek-v4-flash",
        "high",
      ),
      { thinking: { type: "enabled" }, reasoning_effort: "max" },
    );
  });

  it("maps GLM, Kimi and Doubao endpoints to thinking.type", function () {
    const hosts = [
      "https://open.bigmodel.cn/api/coding/paas/v4/chat/completions",
      "https://api.z.ai/api/coding/paas/v4/chat/completions",
      "https://api.moonshot.cn/v1/chat/completions",
      "https://api.kimi.com/coding/v1/chat/completions",
      "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    ];
    for (const url of hosts) {
      assert.deepEqual(
        buildThinkingParams(url, "any-model", "off"),
        { thinking: { type: "disabled" } },
        url,
      );
      for (const level of ["low", "medium", "high"]) {
        assert.deepEqual(
          buildThinkingParams(url, "any-model", level),
          { thinking: { type: "enabled" } },
          `${url} ${level}`,
        );
      }
    }
  });

  it("maps DashScope endpoints to enable_thinking plus budget", function () {
    assert.deepEqual(
      buildThinkingParams(
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        "qwen3-max",
        "off",
      ),
      { enable_thinking: false },
    );
    assert.deepEqual(
      buildThinkingParams(
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        "qwen3-max",
        "high",
      ),
      { enable_thinking: true, thinking_budget: 16384 },
    );
  });
});
