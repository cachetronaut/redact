# Redact

Redact by Cachetronaut. Paste plain text, find sensitive spans on-device via Firebase AI Logic, and review the redacted payload. This Day 1 build ends at local approval. The mapping is saved in browser IndexedDB under the session UID, document ID, and revision.

Identified and user-selected spans are replaced locally. The mapping stays on this device. Detection can miss identifiers. In the planned cloud flow, only the document content you approve is sent.

## Run locally

Run `node scripts/serve.mjs` and open `http://127.0.0.1:64904/` in desktop Chrome with the built-in Prompt API available. Load the synthetic 1040, run detection, and review the highlighted payload. The sample's contextual name and address and its patterned SSN must all be replaced before approval is available. The seeded line 9 is $53,400. The corrected total is $51,000.

For a Firebase-backed session, copy `firebase-config.example.json` to `public/firebase-config.json` and fill in the Firebase web app configuration and production reCAPTCHA Enterprise site key. The web app configuration is public client metadata. Use a private `FIREBASE_APPCHECK_DEBUG_TOKEN` runtime override only on loopback. Keep debug credentials out of the repository and Hosting files. A loopback run with no Firebase configuration uses a local development UID.

The detector uses the JS SDK in `ONLY_ON_DEVICE` mode in a frame with `connect-src 'none'`. The approved cloud model for the next build stage is `gemini-3.8-flash` through the Gemini Developer API. The sample is synthetic and is for a demonstration of line relationships.

[Day 1 build notes](docs/day-1.md)
