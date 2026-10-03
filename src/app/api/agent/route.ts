import type * as T from "../../../lib/types";
import {
  ownerFor,
  threadStore,
  archivedContext,
  saveThread,
} from "../../../lib/thread-store.ts";
import { agentConfig } from "../../../lib/agent-config.ts";
import { normalizeAgentInput } from "../../../lib/agent-input.ts";
import { createAgentResponse } from "../../../lib/agent-server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY = 14 * 1024 * 1024;

export async function GET() {
  return Response.json(
    {
      mode: agentConfig().mode,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || new URL(request.url).host;
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    new URL(request.url).protocol.slice(0, -1);
  if (origin && origin !== `${protocol}://${host}`)
    return Response.json({ error: "Origin not allowed" }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json"))
    return Response.json({ error: "JSON required" }, { status: 415 });
  if (Number(request.headers.get("content-length")) > MAX_BODY || !request.body)
    return Response.json({ error: "Request too large" }, { status: 413 });
  let input: T.AgentInput;
  const reader = request.body.getReader();
  try {
    let bytes = 0;
    let json = "";
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY) {
        await reader.cancel();
        return Response.json({ error: "Request too large" }, { status: 413 });
      }
      json += decoder.decode(value, { stream: true });
    }
    json += decoder.decode();
    input = normalizeAgentInput(JSON.parse(json));
  } catch {
    return Response.json({ error: "Invalid conversation" }, { status: 400 });
  } finally {
    reader.releaseLock();
  }
  const identity = ownerFor(request);
  if (input.threadId) {
    try {
      const db = threadStore();
      saveThread(db, identity.owner, {
        id: input.threadId,
        title: String(
          db
            .prepare("SELECT title FROM threads WHERE owner=? AND id=?")
            .get(identity.owner, input.threadId)?.title || "Noor",
        ),
        messages: input.messages
          .filter((m) => m.id)
          .map((m) => ({ ...m, id: m.id!, timestamp: Date.now() })),
      });
      input = {
        ...input,
        actionMessageIds: input.messages
          .map((m) => m.id)
          .filter((value): value is NonNullable<typeof value> =>
            Boolean(value),
          ),
        messages: archivedContext(
          db,
          identity.owner,
          input.threadId,
          input.messages,
        ),
      };
    } catch {
      return Response.json(
        { error: "Thread archive unavailable" },
        { status: 503 },
      );
    }
  }
  const response = createAgentResponse(input, {
    ...agentConfig(),
    requestSignal: request.signal,
  });
  if (identity.cookie) response.headers.set("Set-Cookie", identity.cookie);
  return response;
}
