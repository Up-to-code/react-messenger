# React Messenger contributor guide

This is a Next.js App Router chat UI with a local people-chat demo and an optional server-side OpenAI Responses transport. Preserve the original MIT attribution.

## Main seams

- `src/lib/chat-state.ts`: pure, immutable conversation reducer. Delivery, stream updates, reactions, and single-vote polls are explicit actions.
- `src/hooks/useMessenger.ts`: orchestration of delivery simulation, reconnect queues, streaming, cancellation, and retry. Keep each message scoped to its conversation ID.
- `src/hooks/useKeyboardViewport.ts`: visible mobile viewport height and top offset. Do not replace it with a hard-coded keyboard height. Preserve browser pinch zoom and clean up listeners.
- `src/lib/i18n.ts`: all English/Arabic labels. Use logical CSS properties, `dir="auto"` for user text, and deterministic localized timestamps.
- `src/components/Compose`: text/emoji/attachment/reply composer; media and poll UIs live in separate components.
- `src/components/Message`: renderer for text, media, quoted replies, polls, products, references, and delivery states.
- `src/lib/agent-server.ts` and `src/app/api/agent/route.ts`: provider transport. `OPENAI_API_KEY` and `OPENAI_MODEL` are server-only. No live API requests are needed for routine tests.

- `src/lib/products.ts`: validated catalog and separate browse/compare/select/delivery/extras/confirm methods. Product choices must not share poll state.
- `src/lib/agent-tools.ts`: provider presentation schemas and whitelist validation. Reference only IDs in the supplied conversation.
- `src/hooks/useChatMemory.ts` and `src/lib/chat-storage.ts`: browser persistence and restoration, including interrupted-stream handling.
- `src/components/Products`, `ChoiceDialog`, and `ForwardDialog`: product roles, choice popups, forwarding and source navigation.
- `src/components/Products/ColorOptions`: independent multi-color check chooser. Product details and variants live in `OptionParts`, each as a separate message. Each instance has its own radio group. Use transparent choosing surfaces and neutral actions. Applied choices restore by their source message and option group IDs; keep these surfaces outside speech bubbles.

## Checks

Run `npm run check` and `npm run test:e2e` after behavior changes. Browser tests cover desktop, mobile keyboard viewport shrinking, Arabic, reconnect queues, polls, media, cancellation, and retry. Live provider tests use injected mock fetch responses; never print or expose secrets. Use `npm ci` for reproducible installs.

## Product boundaries

People presence, typing, delivery receipts, and replies are simulations, disclosed in Settings and conversation information. Noor is an automated contact with a normal chat presentation, disclosed in conversation information. Conversations are persisted locally using IndexedDB; restoration keeps the most recent 500 messages per conversation. Storage failures are surfaced in Settings. SQLite now archives sanitized agent transcripts; no calling or accounts are implemented. Live assistant mode requires both server environment variables and uses the configured OpenAI, OpenRouter or CrewAI backend. Before public live deployment, add application authentication and rate limiting. Keep demo mode explicit; do not silently switch to demo after a provider failure.

- `src/lib/agent-parts.ts`: splits ready UI into ordered transcript messages; preserve root IDs during migration and cancel pending parts on Stop. `message_start` supports multiple text messages per turn.

- Product preferences use validated price ranges and per-field multi-select options. Within a field use OR; across fields use AND. Product multi-selection creates a separate list, distinct from comparison and polls.

- `src/lib/commerce.ts`: validates customer data, recomputes demo quotes from catalog prices, and stores local demo orders. Do not trust persisted totals. New appointments require a current/future date; restoration allows past appointments.
- `OrderCards` and `/orders/[id]`: delivery/extras/customer cards and explicit local confirmation. Keep customer name, phone and address out of provider context. `collect_order_details` must resolve a valid selection by its source message ID.
- Arabic is the default; `useLanguage` persists the optional English preference. Seed translation keys must not rewrite user-authored messages.

- `thread-store.ts`: SQLite archive, owner isolation, source IDs and extractive/lexical context. Never delete full history when reducing model context. Never send local customer-form PII to a provider.
- `business-policy.ts` / `DeliveryCalendar`: automatic sample arrival and optional custom calendar; actual availability must come from merchant fulfillment rules.
- `agent-config.ts` / `agent-providers.ts`: server-only OpenRouter and authenticated CrewAI adapters. Keep missing configuration and provider errors explicit.
- `services/commerce-crew`: actual request-scoped Python Crew, advisor/reviewer tasks, strict final output, cancellation and mock tests. No implicit embedding memory or telemetry.
- `/orders/[id]/payment`: demo-only local receipt; never collect real payment credentials or imply funds were charged.
