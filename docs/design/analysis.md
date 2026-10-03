# Messages design review

This is a manual review of one implementation and one user-supplied reference, using the unslop skill's avoidance approach. Counts describe source components in the original implementation, not frequencies across model-generated samples.

## Repeated/default patterns in the original app

- One gradient sparkle orb introduced the automated contact, with a centered marketing heading and capability description.
- Three starter cards framed chatting as a capability dashboard. Two more suggestion buttons were appended to every completed demo reply.
- Two separate contact sections put “Your assistant” above “People · demo contacts.” One contact badge repeated “AI.”
- Demo status was repeated in the conversation header and welcome area. People headers added another demo badge.
- Bright blue appeared across outgoing bubbles, icons, poll votes, selected contacts, and dialog actions.
- The initial people conversation had ten messages repeating implementation-oriented bubble-wrapping filler.

## Reference observations

The supplied reference has compact portrait rows, short previews, trailing times and black unread circles. Conversation content sits on a light gray background with white incoming and black outgoing bubbles. New-chat and bottom navigation controls are black. There is no central marketing illustration or starter-card grid.

## Applied changes

The next revision separates ready-made choosing surfaces from speech bubbles. Recommendation cards are tappable, comparison controls are revealed on request, and round swatches apply colors directly through a color-ball chooser. Purple updates the selection indicator and composer caret. The header and bottom navigation are smaller. Each selection shows one next delivery/extras/save action. Provider presentation tools select these validated primitives based on conversation context; demo mode uses scripted routing. Choices restore by source ID, with independent radio groups across multiple choosers.

Remove the sparkle orb, AI badge, special contact sections, starter cards, and repeated suggestion cards. Use short conversation content, restrained monochrome controls, trailing list timestamps, dismissible unread indicators, a floating new-chat action, and a small bottom navigation. Keep polls, replies, reactions, media, connection queues, Arabic RTL, and keyboard viewport handling functional. Identify Noor as automated and disclose scripted demo replies in conversation information and Settings. Keep provider errors explicit and retryable.

## Caveats

The electronics extension uses ordinary incoming message cards with a native horizontal strip. Product details, storage, and color are separate transcript messages. Delivery radios and extras checkboxes use their own dialogs, separate from polls. Comparison and saved choices stay in the transcript with stable IDs. New bubbles use staged motion with three speeds and a reduced-motion fallback. Desktop Chromium, mobile Chromium, and mobile WebKit tests cover the selection flow, forwarding, source navigation, Arabic indexing, and memory restoration. Catalog images and prices are fictional samples.

The unslop repository was cloned, its visual dependencies installed in a virtual environment, and a 20-sample visual run attempted. It stopped in prompt generation: the installed Claude Code CLI is signed out. No model sample set or automatic before/after HTML was generated. before.png and after.png show the actual application. This review is specific to the supplied reference; it is not an empirical measurement of model repetition. Calling and voice recording shown in the reference are not implemented. Mobile keyboard behavior is covered by browser viewport tests, not a physical handset test.

Latest revision removes the choosing panel backgrounds, large color ball, bold labels, and color-tinted action buttons. Colors support multiple checked swatches. Product preferences expose price, size, type, color, and multiple collections as separate transcript parts. Catalog filtering and selected-product lists use independent validated methods, with local persistence and retained provider context.
