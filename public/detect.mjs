import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import {
  FinishReason, getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-ai.js';
import { detectionPrompt, detectionSchema, parseDetections } from './redaction.mjs';

let detector;

window.detectLocally = async (source, onProgress, signal) => {
  // Some SDK versions construct no Chrome adapter when the Prompt API is absent.
  if (typeof window.LanguageModel?.availability !== 'function') {
    throw new Error('Chrome on-device model unavailable');
  }

  // The SDK requires these fields even for a network-disabled local call.
  // These values identify no Firebase project and carry no access.
  const app = detector ? null : initializeApp({
    projectId: 'redact-local-only', apiKey: 'local-only', appId: 'local-only',
  }, { name: 'redact-local-detector' });

  detector ??= getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: { promptOptions: { responseConstraint: detectionSchema } },
  });
  await detector.initializeDeviceModel(onProgress);
  onProgress(null);
  signal.throwIfAborted();
  const { response } = await detector.generateContent(detectionPrompt(source));
  signal.throwIfAborted();
  const finish = response.candidates?.[0]?.finishReason;
  if (response.inferenceSource !== InferenceSource.ON_DEVICE || (finish && finish !== FinishReason.STOP)) {
    throw new Error('Local inference did not finish');
  }
  return parseDetections(source, response.text());
};
