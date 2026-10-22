import { useEffect, useMemo, useState } from "react";
import { newsletterApi } from "@/lib/api/newsletter";
import { filterStations } from "@/lib/searchNormalization";
import type { StationSummary } from "@/types/newsletter";
import type { NewsletterMessageKey } from "@/lib/newsletter/i18n";
import styles from "./StationNewsletterEditor.module.css";

type Props = {
  followedIds: Set<string>;
  selected: StationSummary[];
  onChange: (stations: StationSummary[]) => void;
  disabled?: boolean;
  t: (key: NewsletterMessageKey) => string;
};

export default function StationSearch({ followedIds, selected, onChange, disabled, t }: Props) {
  const [query, setQuery] = useState("");
  const [stations, setStations] = useState<StationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true); setError(false);
    newsletterApi.listStations().then(rows => { if (live) setStations(rows); })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [attempt]);
  const results = useMemo(() => filterStations(stations, query)
    .filter(station => !followedIds.has(String(station.id))), [stations, query, followedIds]);
  return <div className={styles.picker}>
    <label className="newsletter-field"><span>{t("searchStation")}</span>
      <input type="search" value={query} placeholder={t("searchStation")} disabled={disabled}
        onChange={event => setQuery(event.target.value)} />
    </label>
    {loading ? <p role="status">{t("loading")}</p> : error ? <div role="alert">
      <p>{t("networkError")}</p><button type="button" onClick={() => setAttempt(old => old + 1)}>{t("retry")}</button>
    </div> : <div className={styles.stationList} role="group" aria-label={t("stations")}>
      {!results.length && <p>{t("noResult")}</p>}
      {results.map(station => <label key={String(station.id)} className={styles.stationOption}>
        <input type="checkbox" checked={selected.some(item => String(item.id) === String(station.id))} disabled={disabled}
          onChange={event => onChange(event.target.checked ? [...selected, station] : selected.filter(item => String(item.id) !== String(station.id)))} />
        <span>{station.name}</span>
      </label>)}
    </div>}
  </div>;
}
