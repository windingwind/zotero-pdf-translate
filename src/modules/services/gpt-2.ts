import { ConfigField } from "../../utils";
import { TranslationService } from "./base";

type Prefix =
  | "chatGPT"
  | "customGPT1"
  | "customGPT2"
  | "customGPT3"
  | "azureGPT";

function createGPTService(prefix: Prefix): TranslationService {
  return {
    id: prefix,
    name: `${prefix}-GPT`,
    type: "sentence",
    helpUrl: "https://platform.openai.com/docs/api-reference",

    async translate(task) {
      // todo
    },

    getConfig(): ConfigField[] {
      const servicePrefix = prefix === "azureGPT" ? "azuregpt" : "chatgpt";

      return [
        {
          type: "input",
          prefKey: `${prefix}.endPoint`,
          nameKey: `service-${servicePrefix}-dialog-endPoint`,
        },
        {
          type: "input",
          prefKey: `${prefix}.model`,
          nameKey: `service-${servicePrefix}-dialog-model`,
        },
        {
          type: "input",
          prefKey: `${prefix}.temperature`,
          nameKey: `service-${servicePrefix}-dialog-temperature`,
        },
        {
          type: "input",
          prefKey: `${prefix}.apiVersion`,
          nameKey: `service-${servicePrefix}-dialog-apiVersion`,
          hidden: prefix !== "azureGPT",
        },
        {
          type: "textarea",
          prefKey: `${prefix}.prompt`,
          nameKey: `service-${servicePrefix}-dialog-prompt`,
          placeholder: `service-${servicePrefix}-dialog-prompt`,
        },
        {
          type: "checkbox",
          prefKey: `${prefix}.stream`,
          nameKey: `service-${servicePrefix}-dialog-stream`,
        },
        {
          // @ts-expect-error not implemented: migrate openCustomRequestDialog to utils/serviceDialog.ts
          type: "customRow",
          prefKey: `${prefix}.customParams`,
          nameKey: `service-${servicePrefix}-dialog-customParams`,
        },
      ];
    },
  };
}

export const gpt = createGPTService("chatgpt");
export const customGPT1 = createGPTService("customGPT1");
export const customGPT2 = createGPTService("customGPT2");
export const customGPT3 = createGPTService("customGPT3");
export const azureGPT = createGPTService("azureGPT");
