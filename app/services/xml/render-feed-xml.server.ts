import type { FeedItem } from "~/services/feed-rules/types";
import type { FeedTemplate, FeedTemplateContext } from "./feed-template";
import { XmlWriter, type XmlWriterOptions } from "./xml-writer";

/**
 * Streams a complete, valid XML document as a sequence of string chunks —
 * never holding more than one item's markup in memory at a time. The route
 * that serves the feed (app/routes/feeds.$feedId[.xml].tsx) pipes these
 * chunks straight into the HTTP response body, so a 100k-product feed costs
 * the same constant memory as a 10-product one.
 */
export async function* renderFeedXml(
  items: AsyncIterable<FeedItem>,
  template: FeedTemplate,
  ctx: FeedTemplateContext,
  options: XmlWriterOptions,
): AsyncGenerator<string> {
  const writer = new XmlWriter(options);

  yield writer.declaration();

  const rootAttributes: Record<string, string> = {};
  if (template.wrapperNode) {
    rootAttributes.version = "2.0";
  }
  for (const [prefix, uri] of Object.entries(template.namespaces)) {
    rootAttributes[`xmlns:${prefix}`] = uri;
  }

  yield writer.openTag(ctx.rootNode, rootAttributes, 0);

  const itemDepth = template.wrapperNode ? 2 : 1;
  if (template.wrapperNode) {
    yield writer.openTag(template.wrapperNode, {}, 1);
    yield template.writeChannelMeta(writer, ctx, 2);
  }

  for await (const item of items) {
    yield template.writeItem(writer, item, ctx, itemDepth);
  }

  if (template.wrapperNode) {
    yield writer.closeTag(template.wrapperNode, 1);
  }
  yield writer.closeTag(ctx.rootNode, 0);
}
