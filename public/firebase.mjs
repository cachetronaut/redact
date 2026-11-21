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
  const debugToken = globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (!loopback && debugToken) throw new Error('Debug App Check requires loopback');
  const useAppCheck = appCheckSiteKey && (!loopback || (typeof debugToken === 'string' && debugToken));
  const app = initializeApp(firebase);
  const appCheck = useAppCheck ? initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  }) : null;
  const auth = initializeAuth(app, { persistence: indexedDBLocalPersistence });
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  if (!user.isAnonymous) throw new Error('Anonymous session required');
  return { uid: user.uid, attest: appCheck ? () => getToken(appCheck) : null };
}
