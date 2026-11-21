import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import {
  getToken, initializeAppCheck, ReCaptchaEnterpriseProvider,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app-check.js';
import {
  initializeAuth, indexedDBLocalPersistence, signInAnonymously,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';

export async function connect({ firebase, appCheckSiteKey }, loopback) {
  if (!firebase?.appId || !firebase.projectId || !firebase.apiKey || (!loopback && !appCheckSiteKey)) {
    throw new Error('Firebase configuration incomplete');
  }
  const app = initializeApp(firebase);
  const appCheck = appCheckSiteKey ? initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  }) : null;
  const auth = initializeAuth(app, { persistence: indexedDBLocalPersistence });
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  if (!user.isAnonymous) throw new Error('Anonymous session required');
  return { uid: user.uid, attest: appCheck ? () => getToken(appCheck) : null };
}
