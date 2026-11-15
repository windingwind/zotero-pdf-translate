/**
 * Sentinel used by the secondary-service menulist for "disabled".
 *
 * A native menulist treats an empty value/selection specially, which makes
 * `value=""` unreliable across programmatic re-renders. Keep the menu value
 * non-empty and map it to an empty preference at the UI boundary.
 */
export const SECOND_PASS_OFF = "__none__";

export function menuValueToServiceId(value: string) {
  return value === SECOND_PASS_OFF ? "" : value;
}

export function serviceIdToMenuValue(serviceId: string) {
  return serviceId || SECOND_PASS_OFF;
}

/**
 * Select an item by its value. Native menulists do not always update
 * `selectedItem` when `.value` is assigned programmatically.
 */
export function selectMenuValue(
  menu: XUL.MenuList | null | undefined,
  value: string,
) {
  if (!menu) {
    return;
  }
  menu.value = value;
  const items = Array.from(menu.querySelectorAll("menuitem")) as Element[];
  const index = items.findIndex(
    (candidate) => candidate.getAttribute("value") === value,
  );
  if (index >= 0) {
    // Native menulists update their closed-state label through selectedIndex;
    // selectedItem/value alone may leave the button blank.
    menu.selectedIndex = index;
    menu.selectedItem = items[index] as XUL.MenuItem;
    menu.label = (items[index] as Element).getAttribute("label") || value;
  }
}

export function getMenuValue(menu: XUL.MenuList | null | undefined) {
  return menu?.selectedItem?.getAttribute("value") ?? menu?.value ?? "";
}
