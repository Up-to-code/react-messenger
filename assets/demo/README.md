# Application walkthrough recordings

Recorded on October 4, 2026 from commit `ffe8d4d`, using the production Next.js server and the scripted demo backend. These are browser recordings of the running application, with no generated scenes or live model requests. Customer details are fictional.

- [Mobile MP4](mobile-commerce.mp4): 390 × 844, 29.48 seconds.
- [Desktop MP4](desktop-commerce.mp4): 1280 × 800, 29.64 seconds.
- [Animated preview](preview.gif): a 12-second mobile excerpt.
- [Mobile chapters](mobile-chapters.json) and [desktop chapters](desktop-chapters.json): measured timestamps from each walkthrough, relative to test start; browser video begins slightly earlier.

The recording scenarios assert the order total, local confirmation, simulated payment, receipt restoration after reload, return to the source message, and mobile overflow behavior. Both scenarios passed. There is no narration or audio.

To make new recordings:

```sh
npm run build
npm run record:demo -- --workers=1
```

Playwright writes WebM videos, screenshots, and chapter JSON under `test-results/demo/`. The checked-in MP4 files use H.264 with `yuv420p` and fast-start metadata for browser playback.
