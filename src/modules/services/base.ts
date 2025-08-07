import { ConfigField, SecretValidateResult } from "../../utils";
import { TranslateTask } from "../../utils/task";

export interface TranslationService {
  id: string;
  name: string;
  type: "word" | "sentence";
  helpUrl: string;

  // needSecret: boolean;
  defaultSecret?: string;
  secretValidator?: (secret: string) => SecretValidateResult;

  translate: (task: Required<TranslateTask>) => Promise<void>;

  // needConfig: boolean;
  getConfig: () => ConfigField[];
}
