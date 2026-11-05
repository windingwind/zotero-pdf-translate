/**
 * SenseNova（商汤日日新）—— 结构化翻译引擎。
 *
 * 区别于普通翻译服务（text→text 黑盒），本引擎做「障碍判断 → 障碍拆解 → 最终翻译」
 * 三步结构化翻译，强制 JSON 输出；并把翻译产出的术语映射写回自成长术语库，
 * 后续翻译读取术语库修正（术语优先、不另造）。
 *
 * - OpenAI 兼容接口：POST {endpoint}/chat/completions
 * - 密钥走界面（getServiceSecret/setServiceSecret），不写源码
 * - 术语库：src/modules/glossary（自成长，存 Zotero.DataDirectory/glossary.json）
 */
import { getPref, getString } from "../../utils";
import { getServiceSecret } from "../../utils";
import { TranslateService } from "./base";
import {
  buildStructuredPrompt,
  parseStructuredResult,
} from "../structuredPrompt";
import {
  readGlossary,
  lookupGlossary,
  buildGlossaryText,
  appendGlossary,
} from "../glossary";

const DEFAULT_ENDPOINT =
  "https://api.sensenova.cn/compatible-mode/v1/chat/completions";
const DEFAULT_MODEL = "Sensenova-6.8-Flash-Lite";

async function sensenovaTranslate(
  data: Parameters<TranslateService["translate"]>[0],
): Promise<void> {
  const secret = getServiceSecret("sensenova");
  const endpoint =
    (getPref("sensenova.endpoint") as string) || DEFAULT_ENDPOINT;
  const model = (getPref("sensenova.model") as string) || DEFAULT_MODEL;
  const temperature = parseFloat(
    (getPref("sensenova.temperature") as string) ?? "0.3",
  );
  const useGlossary = (getPref("sensenova.useGlossary") as boolean) !== false;

  // 自成长术语库：读取 → 命中源文本的术语 → 注入 prompt
  let glossaryText = "";
  if (useGlossary) {
    const terms = await readGlossary();
    const matched = lookupGlossary(data.raw, terms);
    glossaryText = buildGlossaryText(matched);
  }

  const { system, user } = buildStructuredPrompt({
    langFrom: data.langfrom,
    langTo: data.langto,
    sourceText: data.raw,
    glossaryText,
  });

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    // 强制 JSON 输出，结构化结果可靠解析
    response_format: { type: "json_object" },
  };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = (await resp.text()).slice(0, 200);
    throw new Error(`SenseNova HTTP ${resp.status}: ${errText}`);
  }

  const json = await resp.json();
  const j = json as any;
  const content: string =
    j?.choices?.[0]?.message?.content ??
    j?.output?.text ??
    "";
  const result = parseStructuredResult(content);

  if (result && result.translation) {
    data.result = result.translation;
    // 自成长：翻译产出的术语映射写回术语库
    if (useGlossary && Array.isArray(result.gloss) && result.gloss.length) {
      await appendGlossary(result.gloss);
    }
  } else {
    // 解析失败降级：用原始 content 兜底
    data.result = content || String(j?.choices?.[0]?.message?.content ?? "");
  }
}

export const SenseNova: TranslateService = {
  id: "sensenova",
  type: "sentence",
  name: getString("service-sensenova"),
  helpUrl: "https://platform.sensenova.cn/",
  defaultSecret: "",
  secretValidator(secret: string) {
    const status = /^sk-[A-Za-z0-9_-]{20,}$/.test(secret);
    const empty = secret.length === 0;
    return {
      secret,
      status,
      info: empty
        ? "The secret is not set."
        : status
          ? "Click the button to check connectivity."
          : "The secret key format is invalid.",
    };
  },
  async translate(data) {
    await sensenovaTranslate(data);
  },
  config(settings) {
    settings
      .addTextSetting({
        prefKey: "sensenova.endpoint",
        nameKey: "service-sensenova-dialog-endpoint",
      })
      .addTextSetting({
        prefKey: "sensenova.model",
        nameKey: "service-sensenova-dialog-model",
      })
      .addNumberSetting({
        prefKey: "sensenova.temperature",
        nameKey: "service-sensenova-dialog-temperature",
        min: 0,
        max: 2,
        step: 0.1,
      })
      .addCheckboxSetting({
        prefKey: "sensenova.useGlossary",
        nameKey: "service-sensenova-dialog-useGlossary",
      })
      .addStaticRow("", {
        tag: "div",
        namespace: "html",
        styles: {
          color: "var(--fill-secondary)",
          fontSize: "0.9em",
          maxWidth: "400px",
        },
        properties: {
          textContent: getString("service-sensenova-dialog-hint"),
        },
      });
  },
};
