import type * as T from "../../../lib/types";
import {
  ownerFor,
  threadStore,
  listThreads,
  saveThread,
  readThread,
  threadSummary,
  retrieveThread,
  findThreadMessage,
} from "../../../lib/thread-store.ts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function response(
  data: unknown,
  identity: T.OwnerIdentity,
  status: number = 200,
) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(identity.cookie ? { "Set-Cookie": identity.cookie } : {}),
    },
  });
}
export async function GET(request: Request) {
  const identity = ownerFor(request);
  const query = new URL(request.url).searchParams;
  try {
    const db = threadStore();
    const id = query.get("id");
    return response(
      id
        ? {
            messages: query.get("message")
              ? [
                  findThreadMessage(
                    db,
                    identity.owner,
                    id,
                    query.get("message")!,
                  ),
                ].filter((value): value is NonNullable<typeof value> =>
                  Boolean(value),
                )
              : query.get("q")
                ? retrieveThread(db, identity.owner, id, query.get("q")!, 50)
                : readThread(db, identity.owner, id, {
                    before:
                      Number(query.get("before")) || Number.MAX_SAFE_INTEGER,
                  }),
            summary: threadSummary(db, identity.owner, id),
          }
        : { threads: listThreads(db, identity.owner) },
      identity,
    );
  } catch {
    return response({ error: "Thread archive unavailable" }, identity, 503);
  }
}
export async function POST(request: Request) {
  const identity = ownerFor(request);
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || new URL(request.url).host;
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    new URL(request.url).protocol.slice(0, -1);
  if (origin && origin !== `${protocol}://${host}`)
    return response({ error: "Origin not allowed" }, identity, 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return response({ error: "JSON required" }, identity, 415);
  let size = 0;
  let raw = "";
  const decoder = new TextDecoder();
  try {
    if (!request.body) throw new Error("Missing body");
    const reader = request.body.getReader();
    try {
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        size += chunk.length;
        if (size > 5 * 1024 * 1024)
          return response({ error: "Request too large" }, identity, 413);
        raw += decoder.decode(chunk, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }
    raw += decoder.decode();
    const value = JSON.parse(raw);
    saveThread(threadStore(), identity.owner, value);
    return response({ saved: true }, identity);
  } catch {
    return response(
      { error: "Invalid thread or archive unavailable" },
      identity,
      400,
    );
  }
}
