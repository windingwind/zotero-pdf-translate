export function hasSourceTextPlaceholder(prompt: string): boolean {
  return prompt.includes("${sourceText}");
}
