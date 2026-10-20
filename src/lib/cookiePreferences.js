const COOKIE_NAME = 'snow_explorer_preferences';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;
// Requested behavior: partner widgets load immediately unless refused.
// Site-wide conversion analytics waits for an explicit opt-in.
const DEFAULT_PREFERENCES = { externalContent: true, analytics: false };
function readCookiePreferences(cookie, now = Date.now()) {
  try {
    const value = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`));
    if (!value) return null;
    const data = JSON.parse(decodeURIComponent(value.slice(COOKIE_NAME.length + 1)));
    if (data.version !== 1 || typeof data.externalContent !== 'boolean' || typeof data.analytics !== 'boolean' ||
        !Number.isFinite(data.savedAt) || data.savedAt > now || now - data.savedAt >= COOKIE_MAX_AGE * 1000) return null;
    return { externalContent: data.externalContent, analytics: data.analytics };
  } catch { return null; }
}
function preferencesCookie(preferences, secure, now = Date.now()) {
  const value = encodeURIComponent(JSON.stringify({ version: 1, externalContent: preferences.externalContent, analytics: preferences.analytics, savedAt: now }));
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure ? '; Secure' : ''}`;
}
module.exports = { COOKIE_NAME, COOKIE_MAX_AGE, DEFAULT_PREFERENCES, readCookiePreferences, preferencesCookie };
