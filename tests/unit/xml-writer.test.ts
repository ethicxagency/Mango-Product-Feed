import { describe, expect, it } from "vitest";

import {
  escapeXmlAttribute,
  escapeXmlText,
  stripInvalidXmlChars,
  wrapCdata,
  XmlWriter,
} from "~/services/xml/xml-writer";

describe("escapeXmlText", () => {
  it("escapes &, <, and > (quotes are legal, unescaped in element text)", () => {
    expect(escapeXmlText(`<a> & "b" 'c'`)).toBe(`&lt;a&gt; &amp; "b" 'c'`);
  });

  it("strips illegal control characters", () => {
    expect(escapeXmlText("a\x00b\x1Fc")).toBe("abc");
  });

  it("keeps tabs and newlines, which are legal in XML", () => {
    expect(escapeXmlText("a\tb\nc")).toBe("a\tb\nc");
  });
});

describe("wrapCdata", () => {
  it("wraps content in a CDATA section", () => {
    expect(wrapCdata("hello & <world>")).toBe("<![CDATA[hello & <world>]]>");
  });

  it("splits an embedded ]]> so it can never break out of the section", () => {
    const result = wrapCdata("a]]>b");
    expect(result).toBe("<![CDATA[a]]]]><![CDATA[>b]]>");
    // Sanity: reconstructing content from adjacent CDATA sections is lossless.
    expect(result.replace(/]]><!\[CDATA\[/g, "")).toBe("<![CDATA[a]]>b]]>");
  });
});

describe("stripInvalidXmlChars", () => {
  it("is idempotent on already-clean text", () => {
    expect(stripInvalidXmlChars("clean text")).toBe("clean text");
  });
});

describe("XmlWriter", () => {
  it("produces compact output with escaped text by default", () => {
    const writer = new XmlWriter({ pretty: false, cdata: false });
    expect(writer.declaration()).toBe('<?xml version="1.0" encoding="UTF-8"?>');
    expect(writer.textElement("title", "A & B", 0)).toBe(
      "<title>A &amp; B</title>",
    );
  });

  it("produces indented, newline-terminated output when pretty", () => {
    const writer = new XmlWriter({ pretty: true, cdata: false });
    expect(writer.openTag("item", {}, 1)).toBe("  <item>\n");
    expect(writer.textElement("title", "Hi", 2)).toBe(
      "    <title>Hi</title>\n",
    );
    expect(writer.closeTag("item", 1)).toBe("  </item>\n");
  });

  it("wraps element text in CDATA when configured", () => {
    const writer = new XmlWriter({ pretty: false, cdata: true });
    expect(writer.textElement("description", "A & B", 0)).toBe(
      "<description><![CDATA[A & B]]></description>",
    );
  });

  it("omits elements entirely for empty string values", () => {
    const writer = new XmlWriter({ pretty: false, cdata: false });
    expect(writer.textElement("gtin", "", 0)).toBe("");
  });

  it("escapes attribute values", () => {
    const writer = new XmlWriter({ pretty: false, cdata: false });
    expect(writer.openTag("rss", { "xmlns:g": 'a "quote"' }, 0)).toBe(
      '<rss xmlns:g="a &quot;quote&quot;">',
    );
  });

  it("escapes attribute values via the standalone helper", () => {
    expect(escapeXmlAttribute(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&apos;");
  });
});
