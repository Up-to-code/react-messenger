import { openRouterEvents, crewAIEvents } from "./agent-providers.js";
import { readSSE } from "./stream.js";
import {
  presentationTools,
  catalogInstructions,
  resolvePresentationTool,
  demoPresentation,
} from "./agent-tools.js";

export function demoAnswer(text, locale, hasImage = false, history = []) {
  text = text.split("\n\n[Message ID:")[0];
  const ar = locale === "ar" || /[\u0600-\u06ff]/.test(text);
  const lower = text.toLowerCase();
  const previous =
    history.filter((item) => item.role === "assistant").at(-1)?.text || "";
  if (/what.*(choose|select)|my (choice|selection)|اخترت|اختياري/.test(lower)) {
    const choice = [...history]
      .reverse()
      .find((item) => /Product choice:/.test(item.text));
    const detail = choice?.text.match(/Product choice: (.+?); confirmed:/)?.[1];
    return detail
      ? ar
        ? `اختيارك كان: ${detail}. تقدر ترجع للرسالة وتعدل الاختيارات.`
        : `You chose ${detail}. You can return to that message to change the options.`
      : ar
        ? "لسه مفيش اختيار محفوظ. تحب تشوف المنتجات؟"
        : "There isn’t a saved choice yet. Want to see the products?";
  }
  if (/compare|قارن|مقارنة/.test(lower))
    return ar
      ? "خلينا نشوف الاختيارات جنب بعض."
      : "Let’s look at these side by side.";
  if (
    /product|electronics|shopping|browse|phone|tablet|headphone|منتجات|إلكترونيات|هاتف|تابلت|سماعات/.test(
      lower,
    )
  )
    return ar
      ? "دي ٣ اختيارات. اختار منتج أو قارن بينهم."
      : "Here are three options. Pick one, or compare a couple.";
  if (hasImage)
    return ar
      ? "وصلت الصورة. تقدر تفتحها وتكبرها هنا. في الوضع التجريبي لا أقدر أحلل محتواها؛ قل لي إيه اللي محتاج مساعدة فيه."
      : "Got your photo. You can open it here to zoom in. I do not analyze images in demo mode; tell me what you’d like help with.";
  if (/coffee|tea|قهوة|شاي/.test(lower))
    return ar
      ? "أنا أميل للقهوة ☕ إيه اختيارك؟"
      : "I’d pick coffee ☕ What would you choose?";
  if (/Who’s it for|لمين الرسالة/.test(previous))
    return ar
      ? "تمام. إيه اللي عايز تقوله في الرسالة؟ وعايزها رسمية ولا بسيطة؟"
      : "Got it. What do you want the message to say? Should it sound formal or casual?";
  if (/What do you want the message to say|إيه اللي عايز تقوله/.test(previous))
    return ar
      ? `ممكن تبدأ كده:\n\n«مرحبًا، حابب أكلمك بخصوص ${text.replace(/[\n\r]/g, " ").slice(0, 500)}. ياريت نتكلم لما يكون عندك وقت مناسب. شكرًا لك.»\n\nتحب نغير حاجة في الصياغة؟`
      : `You could start with:\n\n“Hi, I wanted to talk with you about ${text.replace(/[\n\r]/g, " ").slice(0, 500)}. Let me know when you have a moment to discuss it. Thanks.”\n\nWant to change the tone?`;
  if (/letter|draft|message|email|رسالة|كتابة|خطاب/.test(lower))
    return ar
      ? "أكيد. لمين الرسالة؟ وإيه الموضوع اللي عايز تتكلم فيه؟"
      : "Sure. Who’s it for, and what would you like to say?";
  if (/plan|tomorrow|خطة|الغد|بكرة/.test(lower))
    return ar
      ? "إيه أهم حاجة محتاج تخلصها؟ وعندك وقت قد إيه؟"
      : "What’s the main thing you need to get done, and how much time do you have?";
  if (/weekend|عطلة|ويكند/.test(lower))
    return ar
      ? "حابب تخرج ولا تقضي وقت هادي في البيت؟"
      : "Are you thinking of going out or having a quiet weekend at home?";
  if (/^(hi|hey|hello|مرحبا|مرحبًا|أهلا|أهلًا|اهلا)[!.؟\s]*$/.test(lower))
    return ar ? "أهلًا! عامل إيه النهارده؟" : "Hey! How’s your day going?";
  return ar
    ? "احكي لي أكتر. إيه بالتحديد اللي حابب نناقشه؟"
    : "Tell me a little more. What would you like to figure out?";
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted)
      return reject(new DOMException("Aborted", "AbortError"));
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function createAgentResponse(
  input,
  {
    apiKey,
    model,
    backend = "openai",
    serviceURL,
    serviceToken,
    configurationError,
    requestSignal,
    fetchImpl = fetch,
  } = {},
) {
  const abort = new AbortController();
  const signal = AbortSignal.any([
    abort.signal,
    ...(requestSignal ? [requestSignal] : []),
    AbortSignal.timeout(backend === "crewai" ? 120000 : 60000),
  ]);
  const live =
    backend === "crewai"
      ? Boolean(serviceURL && serviceToken)
      : Boolean(apiKey && model);
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const emit = (event) => {
        if (!signal.aborted)
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        emit({
          type: "mode",
          mode: live || configurationError ? "live" : "demo",
        });
        if (configurationError)
          throw new Error("Provider configuration incomplete");
        if (!live) {
          await delay(700, signal);
          const last = input.messages.at(-1);
          const presentation = demoPresentation(
            last.text,
            input.messages.slice(0, -1),
          );
          const answer =
            presentation?.card?.type === "order-request"
              ? input.locale === "ar"
                ? "أكمل بيانات الاستلام هنا، ثم راجع الطلب."
                : "Add your delivery details here, then review the order."
              : presentation?.card?.type === "filters"
                ? input.locale === "ar"
                  ? "اختار التفضيلات المناسبة لك."
                  : "Choose the options that matter to you."
                : presentation?.card?.type === "products" &&
                    /under|below|less than|أقل من/.test(last.text)
                  ? input.locale === "ar"
                    ? "دي المنتجات المناسبة للسعر ده."
                    : "These products fit that budget."
                  : presentation?.card?.type === "options"
                    ? input.locale === "ar"
                      ? "أي لون يعجبك؟"
                      : "Which color do you like?"
                    : demoAnswer(
                        last.text,
                        input.locale,
                        !!last.image,
                        input.messages.slice(0, -1),
                      );
          for (const [index, part] of answer.split(/\n\n+/).entries()) {
            if (index) {
              await delay(320, signal);
              emit({ type: "message_start" });
            }
            for (const chunk of part.match(/\S+\s*/g) || []) {
              emit({ type: "delta", text: chunk });
              await delay(55, signal);
            }
          }
          if (presentation) emit(presentation);
          emit({ type: "done" });
        } else if (["openrouter", "crewai"].includes(backend)) {
          const events = backend === "crewai" ? crewAIEvents : openRouterEvents;
          for await (const event of events(input, {
            apiKey,
            model,
            serviceURL,
            serviceToken,
            signal,
            fetchImpl,
          }))
            emit(event);
        } else {
          const upstream = await fetchImpl(
            "https://api.openai.com/v1/responses",
            {
              method: "POST",
              signal,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model,
                stream: true,
                store: false,
                max_output_tokens: 1800,
                tools: presentationTools(
                  input.messages.map((item) => item.id).filter(Boolean),
                  input.actionMessageIds || input.messages.map((item) => item.id).filter(Boolean),
                ),
                parallel_tool_calls: false,
                instructions: `Your name is Noor, an automated conversational contact. Write natural chat messages without introductions, sparkle emoji, capability menus, or AI branding. Ask one relevant clarification when details are missing, especially the recipient, purpose, and tone of a letter. Never pretend to be human; explain your automated nature honestly if asked. Reply in ${input.locale === "ar" ? "Arabic" : "the user’s language"}. Be concise, warm, and honest. Do not claim to contact people or perform actions you cannot perform. ${catalogInstructions}`,
                input: input.messages.map((item) => ({
                  role: item.role,
                  content:
                    item.role === "assistant"
                      ? item.text
                      : [
                          ...(item.text
                            ? [{ type: "input_text", text: item.text }]
                            : []),
                          ...(item.image
                            ? [
                                {
                                  type: "input_image",
                                  image_url: item.image,
                                  detail: "auto",
                                },
                              ]
                            : []),
                        ],
                })),
              }),
            },
          );
          if (!upstream.ok || !upstream.body)
            throw new Error("Provider request failed");
          let complete = false;
          let textSeen = false;
          let textItemId;
          const handledTools = new Set();
          for await (const event of readSSE(upstream.body)) {
            if (signal.aborted) throw new DOMException("Aborted", "AbortError");
            if (
              event.type === "response.output_text.delta" ||
              event.type === "response.refusal.delta"
            ) {
              if (event.item_id && textItemId && event.item_id !== textItemId)
                emit({ type: "message_start" });
              textItemId = event.item_id || textItemId;
              emit({ type: "delta", text: event.delta });
              textSeen = true;
            }
            if (
              event.type === "response.output_item.done" &&
              event.item?.type === "function_call"
            ) {
              const presentation = resolvePresentationTool(
                event.item,
                input.messages.map((item) => item.id).filter(Boolean),
                input.locale,
                input.actionMessageIds || input.messages.map((item) => item.id).filter(Boolean),
              );
              if (!handledTools.has(event.item.call_id)) {
                handledTools.add(event.item.call_id);
                if (presentation.type === "messages") {
                  for (const part of presentation.messages) {
                    if (textSeen) {
                      await delay(320, signal);
                      emit({ type: "message_start" });
                    }
                    emit({ type: "delta", text: part });
                    textSeen = true;
                  }
                } else {
                  if (!textSeen && presentation.text) {
                    emit({ type: "delta", text: presentation.text });
                    textSeen = true;
                  }
                  emit(presentation);
                }
              }
            }
            if (event.type === "response.completed") {
              complete = true;
              emit({ type: "done" });
              break;
            }
            if (
              ["error", "response.failed", "response.incomplete"].includes(
                event.type,
              )
            )
              throw new Error("Provider stream failed");
          }
          if (!complete) throw new Error("Incomplete stream");
        }
      } catch {
        if (!signal.aborted) emit({ type: "error", code: "provider_failed" });
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      abort.abort();
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
