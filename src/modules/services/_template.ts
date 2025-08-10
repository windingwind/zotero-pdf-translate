/**
 * Example Translation Service Template
 *
 * This file is a template for adding a new translation service.
 * Follow the instructions below to create your own service.
 *
 * === How to use this template ===
 *
 * 1. **Copy this file** to `src/services/<your-service-id>.ts`
 *    - The filename should match your `id` field (e.g. `google-translate.ts` for id `"google-translate"`).
 *
 * 2. **Fill in the required fields:**
 *    - `id` (string, required): A unique identifier for your service.
 *      Use lowercase letters and `-` only (e.g. `"google-translate"`).
 *    - `type` (required): `"word"` or `"sentence"`.
 *      Choose `"word"` for dictionary-like results, `"sentence"` for full-text translations.
 *    - `translate` (required): The function that sends the request to your translation API
 *      and writes the result into `data.result`.
 *
 * 3. **Optional fields:**
 *    - `name` (string): The display name of your service.
 *      Defaults to `getString("service-${id}")` if omitted.
 *    - `helpUrl` (string): A link to your service's documentation.
 *      If provided, a "Help" button will appear in the settings panel to open this URL.
 *    - `defaultSecret` (string): A placeholder API key or credentials format.
 *      Only set if your service requires authentication.
 *    - `secretValidator(secret)`: Function to validate the secret format and provide hints.
 *    - `config(settings)`: Function to add extra user-configurable settings (e.g. endpoint, model).
 *      Omit if no additional settings are required.
 *
 * 4. **If your service requires an API key (secret):**
 *    - Uncomment `defaultSecret` and `secretValidator` in the example below.
 *    - The `secretValidator` should return a `SecretValidateResult` object describing:
 *        - The parsed secret value
 *        - Whether it is valid
 *        - Any hints or errors for the user
 *
 * 5. **If your service has custom settings:**
 *    - Implement `config(settings)` using the methods from `AllowedSettingsMethods`.
 *    - These methods let you add input fields, checkboxes, selects, etc., in the settings dialog.
 *    - Example:
 *      ```ts
 *      config(settings) {
 *        settings
 *          .addTextSetting({ prefKey: "endpoint", nameKey: "service-myapi-endpoint" })
 *          .addSelectSetting({
 *            prefKey: "model",
 *            nameKey: "service-myapi-model",
 *            options: [
 *              { label: "Model A", value: "a" },
 *              { label: "Model B", value: "b" }
 *            ]
 *          });
 *      }
 *      ```
 *
 * 6. **Register your service:**
 *    - Open `services/index.ts` and add your new service object to the `register` array.
 *
 * 7. **Test your service** in the UI to ensure:
 *    - The settings panel works as expected
 *    - Secrets are validated correctly
 *    - Translation requests succeed and results are displayed
 */

import { getPref } from "../../utils";
import { TranslateService } from "./base";

export const ExampleTranslationService: TranslateService = {
  id: "example",
  type: "sentence",
  helpUrl: "https://example.com/",

  // === Optional: API key / secret support ===
  // Uncomment if your service requires a secret
  /*
  defaultSecret: "accessKeyId#accessKeySecret",
  secretValidator(secret) {
    const parts = secret?.split("#");
    const flag = parts.length === 2;
    const partsInfo = `AccessKeyId: ${parts[0]}\nAccessKeySecret: ${parts[1]}`;
    return {
      secret,
      status: flag && secret !== this.defaultSecret,
      info:
        secret === this.defaultSecret
          ? "The secret is not set."
          : flag
            ? partsInfo
            : `The secret must have 2 parts joined by '#', but got ${parts?.length}.\n${partsInfo}`,
    };
  },
  */

  // === REQUIRED: translation function ===
  async translate(data) {
    // Get saved settings
    const option1 = getPref("options1");

    // Send request to translation API
    const xhr = await Zotero.HTTP.request("POST", "https://example.com/api/", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "",
      responseType: "json",
    });

    // Handle HTTP errors
    if (xhr?.status !== 200) {
      throw `Request error: ${xhr?.status}`;
    }

    // Handle API errors
    if (xhr.response.Code !== "200") {
      throw `Service error: ${xhr.response.Code}:${xhr.response.Message}`;
    }

    // Save the translation result
    data.result = xhr.response;
  },

  // === Optional: custom settings in preferences ===
  // Uncomment if your service requires a secret
  /*
  config(settings) {
    settings.addTextSetting({
      prefKey: "example",
      nameKey: "example",
    });
  }, 
  */
};
