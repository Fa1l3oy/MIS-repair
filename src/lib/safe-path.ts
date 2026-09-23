const BASE = "http://internal.invalid";

/**
 * Returns `path` only if it stays on this site, else `fallback`. Guards redirect
 * targets taken from the URL (e.g. ?callbackUrl=) against open redirects:
 * "//evil.com", "/\evil.com" or "/\t/evil.com" all start with "/" but browsers
 * treat them as another host. Parsing with the WHATWG URL parser (the same rules
 * browsers use) and checking the origin catches every such variant.
 */
export function safeInternalPath(path: unknown, fallback = "/") {
  if (typeof path !== "string" || !path.startsWith("/")) return fallback;
  try {
    const url = new URL(path, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
