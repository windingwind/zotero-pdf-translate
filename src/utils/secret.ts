import { getPrefJSON, setPref } from "./prefs";

export interface SecretValidateResult {
  secret: string;
  status: boolean;
  info: string;
}

export function getServiceSecret(serviceId: string) {
  try {
    return getPrefJSON("secretObj")[serviceId] || "";
  } catch (e) {
    setPref("secretObj", "{}");
    return "";
  }
}

export function setServiceSecret(serviceId: string, secret: string) {
  let secrets;
  try {
    secrets = getPrefJSON("secretObj");
  } catch (e) {
    secrets = {};
  }
  secrets[serviceId] = secret;
  setPref("secretObj", JSON.stringify(secrets));
}

export function validateServiceSecret(
  serviceId: string,
  validateCallback?: (result: SecretValidateResult) => void,
): SecretValidateResult {
  const secret = getServiceSecret(serviceId);
  // We should get service from addon.data.translate.services here,
  // Otherwise, `services` will be bundled into customElement.js.
  const service = addon.data.translate.services.getServiceById(serviceId);
  const validator = service?.secretValidator;
  if (!validator) {
    return { secret, status: true, info: "" };
  }
  const validateResult = validator(secret);
  if (validateCallback) {
    validateCallback(validateResult);
  }
  return validateResult;
}
