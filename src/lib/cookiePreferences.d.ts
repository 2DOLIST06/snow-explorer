export type CookiePreferences = { optionalCookies: boolean };
export const COOKIE_NAME: string;
export const COOKIE_MAX_AGE: number;
export const DEFAULT_PREFERENCES: CookiePreferences;
export function readCookiePreferences(cookie: string, now?: number): CookiePreferences | null;
export function preferencesCookie(preferences: CookiePreferences, secure: boolean, now?: number): string;
