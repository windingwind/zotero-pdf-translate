import { ConfigField, SecretValidateResult } from "../../utils";
import { TranslateTask } from "../../utils/task";

export interface TranslateService {
  /**
   * The ID of translation service.
   *
   * Use lowcase letters and `-` only.
   */
  id: string;
  /**
   * The name of translation service.
   *
   * @default getString(`service-${id}`)
   */
  name?: string;
  /**
   * The type of translation service.
   *
   */
  type: "word" | "sentence";
  /**
   * The documentation link of translation service.
   *
   * Will be displayed as a 'Help' button in preference window.
   */
  helpUrl?: string;

  // needSecret: boolean;
  defaultSecret?: string;
  secretValidator?: (secret: string) => SecretValidateResult;

  translate: (task: Required<TranslateTask>) => Promise<void>;

  // needConfig: boolean;
  getConfig: () => ConfigField[];
}
