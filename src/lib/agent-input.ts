import type * as T from "./types";
const IMAGE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
export function normalizeAgentInput(input: unknown): T.AgentInput {
  if (!input || typeof input !== "object")
    throw new Error("Invalid conversation");
  const body = input as T.AgentInput;
  if (
    !body ||
    !["en", "ar"].includes(body.locale) ||
    !Array.isArray(body.messages) ||
    !body.messages.length ||
    body.messages.length > 40
  )
    throw new Error("Invalid conversation");
  let totalText = 0;
  let images = 0;
  const messages = body.messages.map((item) => {
    if (
      !item ||
      !["user", "assistant"].includes(item.role) ||
      typeof item.text !== "string" ||
      item.text.length > 10000
    )
      throw new Error("Invalid message");
    totalText += item.text.length;
    let image;
    if (item.image) {
      if (
        item.role !== "user" ||
        typeof item.image !== "string" ||
        item.image.length > 7000000 ||
        !IMAGE.test(item.image) ||
        ++images > 2
      )
        throw new Error("Invalid image");
      image = item.image;
    }
    if (!item.text.trim() && !image) throw new Error("Empty message");
    if (
      item.id &&
      (typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id))
    )
      throw new Error("Invalid message ID");
    return {
      ...(item.id ? { id: item.id } : {}),
      role: item.role,
      text: item.text,
      ...(image ? { image } : {}),
    };
  });
  if (totalText > 40000 || messages.at(-1)!.role !== "user")
    throw new Error("Invalid conversation");
  if (
    body.threadId &&
    (typeof body.threadId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(body.threadId))
  )
    throw new Error("Invalid thread ID");
  return {
    locale: body.locale,
    messages,
    ...(body.threadId ? { threadId: body.threadId } : {}),
  };
}
