const COOKIE_NAME = 'snow_explorer_preferences';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;
const DEFAULT_PREFERENCES = { optionalCookies: false };
function readCookiePreferences(cookie, now = Date.now()) {
  try {
    const value = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`));
    if (!value) return null;
    const data = JSON.parse(decodeURIComponent(value.slice(COOKIE_NAME.length + 1)));
    // Partner choices from the old banner no longer apply to any integration.
    if (data.version !== 2 || typeof data.optionalCookies !== 'boolean' ||
        !Number.isFinite(data.savedAt) || data.savedAt > now || now - data.savedAt >= COOKIE_MAX_AGE * 1000) return null;
    return { optionalCookies: data.optionalCookies };
  } catch { return null; }
}
function preferencesCookie(preferences, secure, now = Date.now()) {
  const value = encodeURIComponent(JSON.stringify({ version: 2, optionalCookies: preferences.optionalCookies, savedAt: now }));
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure ? '; Secure' : ''}`;
}
module.exports = { COOKIE_NAME, COOKIE_MAX_AGE, DEFAULT_PREFERENCES, readCookiePreferences, preferencesCookie };
