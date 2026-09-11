import {
  SecretValidateResult,
  AllowedSettingsMethods,
  TranslateTaskProcessor,
} from "../../utils";
import type { ChatProcessor } from "../../utils/llmStream";

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
  translate: TranslateTaskProcessor;

  /**
   * Optional configuration UI builder.
   *
   * - Receives an {@link AllowedSettingsMethods}` instance with safe UI-building methods.
   * - Use to add extra settings like endpoint, model selection, checkboxes, etc.
   * - Omit if no extra configuration is needed.
   */
  config?: (settings: AllowedSettingsMethods) => void;

  /**
   * Optional chat processor.
   *
   * Services implementing this can be used for follow-up Q&A ("追问") on top
   * of a translation. Only LLM based services are expected to implement it.
   *
   * - Should resolve with the full reply text.
   * - Should call `request.onDelta` while streaming, if supported.
   */
  chat?: ChatProcessor;

  /**
   * Optional check for whether the service is configured well enough to be
   * used (endpoint / model / secret set).
   *
   * Used to decide whether follow-up Q&A can be offered. Services that do not
   * implement it are assumed to be configured.
   */
  isConfigured?: () => boolean;

  /**
   * Set this to true if the service requires external configuration (e.g. Pull Docker images or install softwares).
   *
   * - The services will be grouped as `Require Config`📍.
   * - The label📍will be automatically added to the service name in `addon/locale/${lang}/addon.ftl`.
   * - Omit if no external configuration is required.
   */
  requireExternalConfig?: boolean;
}
