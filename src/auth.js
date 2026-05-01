const AUTH_STORAGE_KEY = 'finance_tracker_auth';

// Google OAuth Client ID — public by design, not a secret.
// Get yours from: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID
const GOOGLE_CLIENT_ID = '467177457234-c15ohotl50daqs1il8std2tmo2rnefaj.apps.googleusercontent.com';

let currentIdToken = null;
let tokenExpiry = 0;
let onAuthChangeCallback = null;

// Decode JWT payload without a library (ID tokens are not encrypted)
function decodeJwtPayload(jwt) {
  try {
    const base64Url = jwt.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function getIdToken() {
  // Check if in-memory token is still valid (5-minute buffer)
  if (currentIdToken && Date.now() / 1000 < tokenExpiry - 300) {
    return currentIdToken;
  }
  // Fall back to localStorage
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    const payload = decodeJwtPayload(stored);
    if (payload && Date.now() / 1000 < payload.exp - 300) {
      currentIdToken = stored;
      tokenExpiry = payload.exp;
      return stored;
    }
    // Expired — clean up
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  currentIdToken = null;
  tokenExpiry = 0;
  return null;
}

export function getUserEmail() {
  const token = getIdToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return payload?.email || null;
}

export function getUserName() {
  const token = getIdToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return payload?.name || null;
}

export function isAuthenticated() {
  return !!getIdToken();
}

function handleCredentialResponse(response) {
  const idToken = response.credential;
  const payload = decodeJwtPayload(idToken);
  if (payload) {
    currentIdToken = idToken;
    tokenExpiry = payload.exp;
    localStorage.setItem(AUTH_STORAGE_KEY, idToken);
    if (onAuthChangeCallback) onAuthChangeCallback(true);
  }
}

export function initAuth(callback) {
  onAuthChangeCallback = callback;

  // If we already have a valid token, notify immediately
  if (getIdToken()) {
    callback(true);
  }

  // Wait for GIS library to load, then initialize
  const interval = setInterval(() => {
    if (window.google?.accounts?.id) {
      clearInterval(interval);
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: true,
      });
    }
  }, 100);

  // Stop waiting after 10 seconds
  setTimeout(() => clearInterval(interval), 10000);
}

export function promptSignIn() {
  if (!window.google?.accounts?.id) return;
  window.google.accounts.id.prompt();
}

export function renderSignInButton(element) {
  if (!window.google?.accounts?.id || !element) return;
  window.google.accounts.id.renderButton(element, {
    theme: 'filled_black',
    size: 'large',
    width: 300,
    text: 'signin_with',
    shape: 'pill',
  });
}

export function signOut() {
  currentIdToken = null;
  tokenExpiry = 0;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }
  if (onAuthChangeCallback) onAuthChangeCallback(false);
}
