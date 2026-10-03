---
name: messages-ui-unslop
description: Avoid generic AI presentation when maintaining this English/Arabic messaging interface.
---

# Messages UI avoidance profile

Manual profile grounded in the supplied messenger reference and the existing app. The automated unslop sampling run could not proceed because Claude Code is signed out.

- Do not turn a chat into a landing page. Avoid centered capability headlines, gradient orbs, sparkle marks, starter-card grids, and appended “next steps” cards.
- Do not create a separate assistant contact section or repeat AI/demo badges throughout the chat. The automated contact has an ordinary name and avatar treatment. Disclose its automated identity and actual provider/demo state in Settings and conversation information.
- Do not pretend the automated contact is human or that scripted replies are provider-generated. Do not silently replace provider errors with demo output.
- Do not use decorative blue highlights throughout an interface whose reference is monochrome. Read/unread, selection, focus, and voting must remain distinguishable through shape, text, contrast, and accessible state.
- Do not fill conversations with implementation notes or long identical placeholder paragraphs. Use varied, short, everyday exchanges.
- Do not invent voice or video calling functionality just to reproduce a reference icon. Add only controls with meaningful implemented behavior.
- Do not crowd the composer with explanatory slogans. Keep attachment, emoji, poll, send, and stop actions accessible; keep the offline queue status when needed.
- Do not bury polls behind a separate assistant workflow. They belong in the same composer menu as images, with actual option selection, change, and removal behavior.
- Product carousels and selection/review cards are allowed when they serve an explicit customer choice; do not confuse them with decorative capability cards. Keep size/color, delivery radios, extras checkboxes and polls independent.
- Do not prescribe a generic response when a letter needs context. Ask a relevant question about the recipient, purpose, or tone; avoid forced capability lists.
- Do not sacrifice Arabic RTL or native mobile input for visual similarity. Keep 16px composer text, logical layout properties, visible-viewport height/offset, safe-area padding, composition-safe Enter handling, and reduced-motion support.

Check the real app after a change. Review the contact list and a populated conversation at mobile and desktop sizes. Verify Arabic, polling, attachments, offline queues, stream cancellation, and error retry. Record any demo-only or untested behavior clearly in documentation.

Situational choices: keep recommendation and selection surfaces outside speech bubbles. Make product cards tappable and include a compact, labeled action inside each card. Hide comparison checkboxes until comparison is requested. Use a color ball and round swatches; tapping a swatch commits the color directly, while the card action applies the displayed color and variant and disables once applied. Show only the next delivery/extras/save action. Keep navigation compact.

Split product details, storage/size, and color into small independently addressable messages. Keep their option group shared; the agent can send multiple short text messages in the same turn.

Current option style: no panel backgrounds around product details, numbers, colors, or filters; regular weight labels. Remove the large orb. Use small swatches with check overlays and neutral text actions. Split price, color, size, type, and collections into independent messages. Multi-product selection uses checks over images and its own selected list.
