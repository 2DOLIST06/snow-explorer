import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { DEFAULT_PREFERENCES, preferencesCookie, readCookiePreferences, type CookiePreferences } from "@/lib/cookiePreferences";
import CookieBanner from "@/components/cookies/CookieBanner";
import PartnerAnalytics from "@/components/cookies/PartnerAnalytics";

type Context = { ready: boolean; preferences: CookiePreferences; openSettings: () => void };
const CookiePreferencesContext = createContext<Context>({ ready: false, preferences: DEFAULT_PREFERENCES, openSettings: () => {} });
export const useCookiePreferences = () => useContext(CookiePreferencesContext);

export function CookiePreferencesProvider({ children, publicPage }: { children: ReactNode; publicPage: boolean }) {
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const [panel, setPanel] = useState<"banner" | "settings" | null>(null);
  const [hasChoice, setHasChoice] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const analyticsStarted = useRef(false);
  useEffect(() => {
    let saved: CookiePreferences | null = null;
    try { saved = readCookiePreferences(document.cookie); } catch { /* Cookie access can be disabled by the browser. */ }
    setPreferences(saved || DEFAULT_PREFERENCES);
    setHasChoice(Boolean(saved));
    if (!saved) setPanel("banner");
    setReady(true);
  }, []);
  const openSettings = useCallback(() => setPanel("settings"), []);
  const save = (next: CookiePreferences) => {
    let persisted = false;
    try {
      document.cookie = preferencesCookie(next, window.location.protocol === "https:");
      persisted = Boolean(readCookiePreferences(document.cookie));
    } catch { /* Apply the choice in memory even if cookie storage is unavailable. */ }
    setStorageError(!persisted);
    setPreferences(next); setHasChoice(true); setPanel(null);
    // Removing an analytics tag cannot undo listeners installed by its SDK.
    // A reload after withdrawal stops that runtime, using the saved refusal.
    if (analyticsStarted.current && !next.analytics) window.location.reload();
  };
  return <CookiePreferencesContext.Provider value={{ ready, preferences, openSettings }}>
    {children}
    <PartnerAnalytics enabled={ready && publicPage && preferences.analytics} onStart={() => { analyticsStarted.current = true; }} />
    {ready && panel && (publicPage || panel === "settings") && <CookieBanner key={panel} settings={panel === "settings"} preferences={preferences} onSave={save} onCustomize={openSettings} onClose={() => setPanel(hasChoice ? null : "banner")} />}
    {storageError && publicPage && <p className="cookie-storage-error" role="status">Votre navigateur n’a pas conservé vos préférences cookies. Votre choix reste appliqué sur cette page.</p>}
  </CookiePreferencesContext.Provider>;
}
