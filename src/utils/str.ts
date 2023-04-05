export function slice(str: string, len: number) {
  return str.length > len ? `${str.slice(0, len - 3)}...` : str;
}

export function fill(
  str: string,
  len: number,
  options: { char: string; position: "start" | "end" } = {
    char: " ",
    position: "end",
  }
) {
  if (str.length >= len) {
    return str;
  }
  return str[options.position === "start" ? "padStart" : "padEnd"](
    len - str.length,
    options.char
  );
}
