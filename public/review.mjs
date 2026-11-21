import { deterministicSpans, MAX_SOURCE_LENGTH, redact } from './redaction.mjs';
import { sample, verifySample } from './sample.mjs';
import { persistMapping } from './mapping.mjs';

const byId = id => document.getElementById(id);
const source = byId('source');
const frame = byId('detector');
const detect = byId('detect');
const manual = byId('manual');
const approve = byId('approve');
const payload = byId('payload');
const status = byId('status');
const empty = byId('empty');

const newId = () => crypto.randomUUID();
const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
let uid;
let context;
let approved;
let running = false;
let saving = false;
let draft = newDraft();

function newDraft() {
  return { id: newId(), namespace: newId().replaceAll('-', ''), manual: [], revision: 0 };
}

function updateButtons() {
  detect.disabled = running || !source.value.trim() || !frame.contentWindow?.detectLocally;
  manual.disabled = source.selectionStart === source.selectionEnd;
  approve.disabled = saving || !uid || !context || context === approved
    || (context.mapping.size === 0 && !empty.checked);
}

function clearReview(message) {
  context = null;
  approved = null;
  empty.checked = false;
  byId('empty-label').hidden = true;
  byId('counts').textContent = '';
  payload.textContent = 'Run detection to review the redacted text.';
  status.textContent = message;
  updateButtons();
}

function resetDraft() {
  draft = newDraft();
  clearReview('Ready for on-device detection via Firebase AI Logic.');
}

function renderReview(spans) {
  const revision = redact(source.value, [...spans, ...draft.manual], draft.namespace);
  payload.replaceChildren(...revision.parts.map(part => {
    if (!part.token) return document.createTextNode(part.text);
    const mark = document.createElement('mark');
    mark.textContent = part.text;
    return mark;
  }));
  byId('counts').textContent = [...revision.counts].map(([type, count]) => `${type} ${count}`).join(' · ');
  byId('empty-label').hidden = revision.mapping.size > 0;
  empty.checked = false;
  context = { ...revision, spans, documentId: draft.id, number: ++draft.revision };
  status.textContent = revision.mapping.size ? 'Review the exact redacted text before approving.' : 'No identifiers detected. Review the entire text.';
  updateButtons();
}

byId('sample').addEventListener('click', () => {
  source.value = sample;
  resetDraft();
});
source.addEventListener('input', resetDraft);
source.addEventListener('select', updateButtons);
source.addEventListener('selectionchange', updateButtons);
source.addEventListener('paste', event => {
  const clipboard = event.clipboardData;
  if (clipboard.files.length || ![...clipboard.types].includes('text/plain')) {
    event.preventDefault();
    status.textContent = 'Paste plain text. Files and images are unsupported.';
    return;
  }
  if (source.value.length - (source.selectionEnd - source.selectionStart)
      + clipboard.getData('text/plain').length > MAX_SOURCE_LENGTH) {
    event.preventDefault();
    status.textContent = 'This paste exceeds the 6,000-character limit.';
  }
});
source.addEventListener('drop', event => {
  event.preventDefault();
  status.textContent = 'Paste plain text into the source field.';
});
empty.addEventListener('change', updateButtons);

manual.addEventListener('click', () => {
  const { selectionStart: start, selectionEnd: end, value } = source;
  if (start === end) return;
  draft.manual.push({ type: 'SENSITIVE', value: value.slice(start, end), start, end, origin: 'manual' });
  if (context) renderReview(context.spans);
  else status.textContent = 'Selection marked. Run on-device detection to review the payload.';
});

function detectWithTimeout(text, onProgress) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Detection timed out'));
    }, 90_000);
  });
  return Promise.race([frame.contentWindow.detectLocally(text, onProgress, controller.signal), timeout])
    .finally(() => clearTimeout(timer));
}

function detectionError(error) {
  if (error.message === 'Detection timed out') return 'On-device detection timed out.';
  if (error.message.includes('api-not-enabled') || error.message === 'Chrome on-device model unavailable') {
    return 'The Chrome on-device model is unavailable.';
  }
  if (error.message === 'Contextual detection missed a sample identifier') {
    return 'The on-device model missed an expected sample identifier.';
  }
  if (error.name === 'SyntaxError' || ['Incomplete or invalid detections', 'Invalid detection',
    'Detection differs from the source', 'Local inference did not finish'].includes(error.message)) {
    return 'On-device detection returned incomplete or invalid results.';
  }
  return 'Chrome could not complete on-device detection.';
}

detect.addEventListener('click', async () => {
  const active = draft;
  const text = source.value;
  running = true;
  clearReview('Initializing on-device detection via Firebase AI Logic…');
  try {
    const deterministic = deterministicSpans(text);
    const contextual = await detectWithTimeout(text, progress => {
      if (running && draft === active) {
        status.textContent = progress === null ? "Analyzing on this device…"
          : `Preparing the Chrome on-device model (${Math.round(progress * 100)}%)…`;
      }
    });
    if (draft !== active) return;
    const detected = [...deterministic, ...contextual];
    if (text === sample) verifySample(text, contextual, redact(text, detected, active.namespace).text);
    renderReview(detected);
  } catch (error) {
    const reason = detectionError(error);
    if (draft === active) clearReview(`${reason} Cloud submission is disabled.`);
  } finally {
    running = false;
    updateButtons();
  }
});

approve.addEventListener('click', async () => {
  const revision = context;
  if (!revision || approve.disabled) return;
  saving = true;
  updateButtons();
  try {
    await persistMapping(uid, revision.documentId, revision.number, revision.mapping);
    if (context === revision) {
      approved = revision;
      status.textContent = 'Approved. The mapping was saved to IndexedDB on this device.';
    }
  } catch {
    if (context === revision) status.textContent = 'Could not save the mapping to IndexedDB. Approval failed.';
  } finally {
    saving = false;
    updateButtons();
  }
});

function detectorReady() {
  if (frame.contentWindow?.detectLocally) status.textContent = 'Ready for on-device detection via Firebase AI Logic.';
  else status.textContent = 'The local detector failed to load. Cloud submission is disabled.';
  updateButtons();
}
frame.addEventListener('load', detectorReady);
if (frame.contentWindow?.detectLocally) detectorReady();

async function connectFirebase() {
  const label = byId('firebase-status');
  try {
    const config = await fetch('./firebase-config.json', { cache: 'no-store' });
    if (loopback && config.status === 404) {
      uid = `local-${newId()}`;
      label.textContent = 'Local development session. Firebase project configuration is absent.';
      return;
    }
    if (!config.ok) throw new Error('Firebase configuration unavailable');
    const { connect } = await import('./firebase.mjs');
    const session = await connect(await config.json(), loopback);
    uid = session.uid;
    if (loopback) {
      label.textContent = 'Anonymous Firebase session active. This run does not verify production App Check.';
    } else {
      label.textContent = 'Anonymous Firebase session active. Verifying App Check…';
      try {
        await session.attest();
        label.textContent = 'Anonymous Firebase session and App Check attestation active.';
      } catch {
        label.textContent = 'Anonymous Firebase session active. App Check attestation failed.';
      }
    }
  } catch {
    label.textContent = 'Firebase session unavailable. Approval is disabled.';
  } finally {
    updateButtons();
  }
}
void connectFirebase();
