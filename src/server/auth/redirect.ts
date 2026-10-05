export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) return "/";
  try {
    const decoded = decodeURIComponent(value);
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      /[\u0000-\u0020\\]/.test(decoded)
    )
      return "/";
    const url = new URL(value, "https://ctc.invalid");
    if (url.origin !== "https://ctc.invalid" || url.pathname.startsWith("//"))
      return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
