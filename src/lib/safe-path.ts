const BASE = "http://internal.invalid";

/**
 * Returns `path` only if it stays on this site, else `fallback`. Guards redirect
 * targets taken from the URL (e.g. ?callbackUrl=) against open redirects:
 * "//evil.com", "/\evil.com" or "/\t/evil.com" all start with "/" but browsers
 * treat them as another host. Parsing with the WHATWG URL parser (the same rules
 * browsers use) and checking the origin catches those. Dot segments need a second
 * look: "/.//evil.com" normalises to "//evil.com" while still parsing as local,
 * so the normalised result must not be protocol-relative either.
 */
export function safeInternalPath(path: unknown, fallback = "/") {
  if (typeof path !== "string" || !path.startsWith("/")) return fallback;
  try {
    const url = new URL(path, BASE);
    if (url.origin !== BASE) return fallback;
    const normalised = `${url.pathname}${url.search}${url.hash}`;
    if (normalised.startsWith("//") || new URL(normalised, BASE).origin !== BASE) return fallback;
    return normalised;
  } catch {
    return fallback;
  }
}
