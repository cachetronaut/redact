# Day 1 build notes

2026-11-21 · Cachetronaut

- Firebase project `redact-67602`, Spark plan, web app `Redact Web`. Google Analytics is disabled. Anonymous Auth is enabled and a sign-in succeeded in Chrome on loopback.
- The review screen runs deterministic detectors first, then on-device detection via Firebase AI Logic JS SDK 13.4.0 in `ONLY_ON_DEVICE` mode. The detection frame blocks outbound connections. There is no cloud submit control in this build.
- Chrome 158.0.8127.37 opened `v3Nano` weights during a Day 1 detection attempt. The installed model manifest reports base `2025.06.30.1229`, component `2025.8.8.1141`. A later attempt returned Firebase AI Logic's `AI/api-not-enabled` because Chrome reported the local model unavailable. The profile volume had 7.1–7.3 GiB free. Chrome documents a 10 GB threshold for keeping the model and 22 GB for the initial download. The live gate remains open. [Chrome Prompt API requirements](https://developer.chrome.com/docs/ai/prompt-api#review_the_hardware_requirements)
- A browser test with a controlled model result rendered all three placeholders, saved the mapping to IndexedDB, and invalidated approval after a source edit. An independent IndexedDB read verified the stored mapping. These checks cover the app flow and storage. A successful live model run remains required.
- Static verification covered fixture arithmetic, exact UTF-16 spans, partial overlaps, duplicate values, literal token escaping, suspicious checksum failures, malformed or truncated output, and valid empty output.
- The seeded gate requires a live model result containing both the synthetic taxpayer name and street address. A deterministic-only result fails the sample check.

## Day 2–3

Freeze the exact request at approval and use it to render the request preview and call the reasoning model. Add exact local rehydration, unknown-token handling, output validation, and Firestore ownership tests before saving a cloud response. The cloud model is pinned to `gemini-3.8-flash` with the Gemini Developer API and `ONLY_IN_CLOUD`.
