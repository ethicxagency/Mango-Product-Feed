const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/** Strips characters XML 1.0 forbids outright (control chars other than
 * tab/newline/CR) so a corrupt source field can never produce invalid XML. */
export function stripInvalidXmlChars(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

export function escapeXmlText(value: string): string {
  return stripInvalidXmlChars(value).replace(
    /[&<>]/g,
    (ch) => XML_ESCAPES[ch]!,
  );
}

export function escapeXmlAttribute(value: string): string {
  return stripInvalidXmlChars(value).replace(
    /[&<>"']/g,
    (ch) => XML_ESCAPES[ch]!,
  );
}

export function wrapCdata(value: string): string {
  // "]]>" would prematurely close a CDATA section; split it across two
  // sections so the literal sequence can never appear unescaped.
  const safe = stripInvalidXmlChars(value).replace(/]]>/g, "]]]]><![CDATA[>");
  return `<![CDATA[${safe}]]>`;
}

export interface XmlWriterOptions {
  pretty: boolean;
  cdata: boolean;
}

/**
 * Minimal, dependency-free XML text builder. Deliberately hand-rolled
 * instead of pulling in a DOM-style XML library: feeds are emitted as a
 * flat stream of independent element strings (see render-feed-xml.server.ts)
 * so memory stays flat regardless of catalog size, which off-the-shelf
 * builders that construct a full in-memory document don't support well.
 */
export class XmlWriter {
  constructor(private readonly options: XmlWriterOptions) {}

  private indent(depth: number): string {
    return this.options.pretty ? "  ".repeat(depth) : "";
  }

  private newline(): string {
    return this.options.pretty ? "\n" : "";
  }

  declaration(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>${this.newline()}`;
  }

  openTag(
    name: string,
    attributes: Record<string, string> = {},
    depth = 0,
  ): string {
    const attrs = Object.entries(attributes)
      .map(([key, value]) => ` ${key}="${escapeXmlAttribute(value)}"`)
      .join("");
    return `${this.indent(depth)}<${name}${attrs}>${this.newline()}`;
  }

  closeTag(name: string, depth = 0): string {
    return `${this.indent(depth)}</${name}>${this.newline()}`;
  }

  /** A leaf element: <name>value</name>, CDATA-wrapped when configured and
   * omitted entirely when the value is empty (keeps the feed lean). */
  textElement(name: string, value: string, depth = 0): string {
    if (value === "") return "";
    const content = this.options.cdata
      ? wrapCdata(value)
      : escapeXmlText(value);
    return `${this.indent(depth)}<${name}>${content}</${name}>${this.newline()}`;
  }
}
