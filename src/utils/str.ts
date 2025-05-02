export function slice(str: string, len: number) {
  return str.length > len ? `${str.slice(0, len - 3)}...` : str;
}

export function fill(
  str: string,
  len: number,
  options: { char: string; position: "start" | "end" } = {
    char: " ",
    position: "end",
  },
) {
  if (str.length >= len) {
    return str;
  }
  return str[options.position === "start" ? "padStart" : "padEnd"](
    len - str.length,
    options.char,
  );
}

/**
 * Strip empty lines from text
 * @param text Text to process
 * @param enabled Whether stripping is enabled
 * @returns Processed text
 */
export function stripEmptyLines(text: string, enabled: boolean): string {
  if (!text || !enabled) return text;

  // Normalize line endings to \n
  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Replace multiple consecutive line breaks with a single one
  return normalizedText.replace(/\n{2,}/g, "\n");
}
