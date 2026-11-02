import { PassThrough } from "node:stream";

import type { AppLoadContext, EntryContext } from "@remix-run/node";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";

import { addDocumentResponseHeaders } from "~/shopify.server";

export const streamTimeout = 5_000;

/** Logs every unhandled loader/action/render error server-side (message only
 *  — never request bodies, headers, cookies, or connection strings). */
export function handleError(error: unknown, { request }: { request: Request }) {
  if (request.signal.aborted) return;
  const message =
    error instanceof Error
      ? (error.message.split("\n")[0] ?? "")
      : String(error);
  console.error(
    `[remix] unhandled error on ${request.method} ${new URL(request.url).pathname}:`,
    message.replace(/postgres(ql)?:\/\/\S+/gi, "postgresql://[redacted]"),
  );
}

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  addDocumentResponseHeaders(request, responseHeaders);

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");

    const readyOption =
      (userAgent && isbot(userAgent)) || remixContext.isSpaMode
        ? "onAllReady"
        : "onShellReady";

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, streamTimeout + 1_000);
  });
}
