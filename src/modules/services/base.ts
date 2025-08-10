import { SecretValidateResult } from "../../utils";
import { AllowedSettingsMethods } from "../../utils/settingsDialog";
import { TranslateTask } from "../../utils/task";

export interface TranslateService {
  /**
   * The unique service ID.
   *
   * Use lowercase letters + hyphens only.
   */
  id: string;

  /**
   * The display name of the service.
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
   * Documentation or help page URL.
   *
   * If provided, a "Help" button will appear in the settings dialog.
   */
  helpUrl?: string;

  defaultSecret?: string;
  secretValidator?: (secret: string) => SecretValidateResult;

  /**
   * Main translation function.
   *
   * - Must set `data.result` before returning.
   * - Should throw an error if the request fails.
   */
  translate: (data: Required<TranslateTask>) => Promise<void>;

  /**
   * Optional configuration UI builder.
   *
   * - Receives an {@link AllowedSettingsMethods}` instance with safe UI-building methods.
   * - Use to add extra settings like endpoint, model selection, checkboxes, etc.
   * - Omit if no extra configuration is needed.
   */
  config?: (settings: AllowedSettingsMethods) => void;
}
