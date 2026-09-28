import { useEffect, useRef, useState } from "react";
import { newsletterApi } from "@/lib/api/newsletter";
import type { StationSummary } from "@/types/newsletter";
import type { NewsletterMessageKey } from "@/lib/newsletter/i18n";

export default function StationSearch({ followedIds, onSelect, t }: { followedIds: Set<string>; onSelect: (station: StationSummary) => Promise<void>; t: (key: NewsletterMessageKey) => string }) {
  const [query, setQuery] = useState(""); const [results, setResults] = useState<StationSummary[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState(false); const sequence = useRef(0);
  useEffect(() => { if (query.trim().length < 3) { setResults([]); setLoading(false); return; } const current = ++sequence.current; const timer = window.setTimeout(async () => { setLoading(true); setError(false); try { const rows = await newsletterApi.searchStations(query.trim()); if (current === sequence.current) setResults(rows.filter((row) => !followedIds.has(String(row.id)))); } catch { if (current === sequence.current) setError(true); } finally { if (current === sequence.current) setLoading(false); } }, 350); return () => window.clearTimeout(timer); }, [query, followedIds]);
  return <div className="station-autocomplete"><label><span className="sr-only">{t("searchStation")}</span><input autoFocus type="search" value={query} placeholder={t("searchStation")} onChange={(e) => setQuery(e.target.value)} /></label>{loading && <p role="status">{t("searching")}</p>}{error && <p role="alert" className="newsletter-feedback--error">{t("networkError")}</p>}{!loading && query.trim().length >= 3 && !error && !results.length && <p>{t("noResult")}</p>}{results.length > 0 && <ul role="listbox">{results.map((station) => <li key={station.id}><button type="button" onClick={async () => { await onSelect(station); setQuery(""); setResults([]); }}>{station.name}</button></li>)}</ul>}</div>;
}
