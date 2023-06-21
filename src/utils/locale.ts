import { config } from "../../package.json";

export { initLocale, getString };

/**
 * Initialize locale data
 */
function initLocale() {
  const l10n = new (
    typeof Localization === "undefined"
      ? ztoolkit.getGlobal("Localization")
      : Localization
  )([`${config.addonRef}-addon.ftl`], true);
  addon.data.locale = {
    current: l10n,
  };
}

/**
 * Get locale string, see https://firefox-source-docs.mozilla.org/l10n/fluent/tutorial.html#fluent-translation-list-ftl
 * @param localString ftl key
 * @param options.branch branch name
 * @param options.args args
 * @example
 * ```ftl
 * # addon.ftl
 * addon-static-example = This is default branch!
 *     .branch-example = This is a branch under addon-static-example!
 * addon-dynamic-example =
    { $count ->
        [one] I have { $count } apple
       *[other] I have { $count } apples
    }
 * ```
 * ```js
 * getString("addon-static-example"); // This is default branch!
 * getString("addon-static-example", { branch: "branch-example" }); // This is a branch under addon-static-example!
 * getString("addon-dynamic-example", { args: { count: 1 } }); // I have 1 apple
 * getString("addon-dynamic-example", { args: { count: 2 } }); // I have 2 apples
 * ```
 */
function getString(localeString: string): string;
function getString(localeString: string, branch: string): string;
function getString(
  localeString: string,
  options: { branch?: string | undefined; args?: Record<string, unknown> }
): string;
function getString(...inputs: any[]) {
  // Old .properties uses . while .ftl uses -
  const localeString = (inputs[0] as string).replace(/\./g, "-");
  if (inputs.length === 1) {
    return _getString(localeString);
  } else if (inputs.length === 2) {
    if (typeof inputs[1] === "string") {
      return _getString(localeString, { branch: inputs[1] });
    } else {
      return _getString(localeString, inputs[1]);
    }
  } else {
    throw new Error("Invalid arguments");
  }
}

function _getString(
  localeString: string,
  options: { branch?: string | undefined; args?: Record<string, unknown> } = {}
): string {
  const { branch, args } = options;
  const pattern = addon.data.locale?.current.formatMessagesSync([
    { id: localeString, args },
  ])[0];
  if (!pattern) {
    return localeString;
  }
  if (branch && pattern.attributes) {
    return pattern.attributes[branch] || localeString;
  } else {
    return pattern.value || localeString;
  }
}
