import type { GetServerSideProps } from "next";
import { useMemo, useState } from "react";
import { fetchActiveResortsServer, type Resort } from "@/lib/api/resorts";
import { fetchRegionsServer } from "@/lib/api/regions";
import { getAdminCsrfToken, refreshAdminSession } from "@/lib/adminApi";
import { getSitemapEntries } from "@/lib/sitemap";
import type { RegionSummary } from "@/lib/regions";

type Row = { url: string; lastModified: string | null };
type Props = { rows: Row[]; loadWarning: boolean };
type SortDirection = "newest" | "oldest";

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const [resortsResult, regionsResult] = await Promise.allSettled([
    fetchActiveResortsServer(),
    fetchRegionsServer(),
  ]);
  const resorts: Resort[] = resortsResult.status === "fulfilled" ? resortsResult.value : [];
  const regions: RegionSummary[] = regionsResult.status === "fulfilled" ? regionsResult.value : [];
  return {
    props: {
      rows: getSitemapEntries(resorts, regions).map(({ url, lastModified }) => ({
        url,
        lastModified: lastModified?.toISOString() || null,
      })),
      loadWarning: resortsResult.status === "rejected" || regionsResult.status === "rejected",
    },
  };
};

function dateValue(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function AdminIndexNow({ rows, loadWarning }: Props) {
  const [selected, setSelected] = useState(() => new Set(rows.map((row) => row.url)));
  const [sortDirection, setSortDirection] = useState<SortDirection>("newest");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    const emptyDate = sortDirection === "newest" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
    const difference = dateValue(a.lastModified, emptyDate) - dateValue(b.lastModified, emptyDate);
    return sortDirection === "newest" ? -difference : difference;
  }), [rows, sortDirection]);

  function setAll(checked: boolean) {
    setSelected(checked ? new Set(rows.map((row) => row.url)) : new Set());
  }

  function toggle(url: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) return;
    setSending(true); setError(""); setMessage("Envoi à IndexNow en cours…");
    try {
      const csrf = getAdminCsrfToken() || await refreshAdminSession();
      if (!csrf) throw new Error("Votre session administrateur a expiré.");
      const response = await fetch(["", "api", "admin", "indexnow"].join("/"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ urls: [...selected] }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error === "indexnow_rejected" ? `IndexNow a refusé la demande (HTTP ${result.status}).` : "L’envoi a échoué.");
      setMessage(`${result.submitted} URL${result.submitted > 1 ? "s" : ""} transmise${result.submitted > 1 ? "s" : ""} à IndexNow.`);
    } catch (caught) {
      setMessage(""); setError(caught instanceof Error ? caught.message : "L’envoi a échoué.");
    } finally {
      setSending(false);
    }
  }

  return <main className="indexnow-admin">
    <header className="indexnow-admin__hero"><div><p className="eyebrow">Référencement</p><h1>Envoyer des URLs à IndexNow</h1><p>Sélectionnez les pages modifiées que Bing et les moteurs compatibles doivent explorer.</p></div><div className="indexnow-admin__count"><strong>{selected.size}</strong><span>sur {rows.length} sélectionnées</span></div></header>
    {loadWarning && <p className="indexnow-alert indexnow-alert--warning">Certaines URLs n’ont pas pu être chargées. Rechargez la page avant l’envoi.</p>}
    <section className="indexnow-panel" aria-labelledby="indexnow-list-title">
      <div className="indexnow-toolbar"><div><h2 id="indexnow-list-title">URLs disponibles</h2><p>Les URLs sont issues du sitemap public.</p></div><div className="indexnow-toolbar__actions"><button className="btn btn--secondary" type="button" onClick={() => setAll(true)}>Tout cocher</button><button className="btn btn--secondary" type="button" onClick={() => setAll(false)}>Tout décocher</button><button className="btn btn--secondary" type="button" onClick={() => setSortDirection((value) => value === "newest" ? "oldest" : "newest")} aria-label={`Trier par date, ${sortDirection === "newest" ? "plus anciennes d’abord" : "plus récentes d’abord"}`}>Date {sortDirection === "newest" ? "↓" : "↑"}</button></div></div>
      <div className="indexnow-table-wrap"><table className="indexnow-table"><thead><tr><th scope="col"><span className="sr-only">Sélection</span></th><th scope="col">URL</th><th scope="col">Dernière modification</th></tr></thead><tbody>{sortedRows.map((row) => <tr key={row.url}><td><input type="checkbox" checked={selected.has(row.url)} onChange={() => toggle(row.url)} aria-label={`Sélectionner ${row.url}`} /></td><td><a href={row.url} target="_blank" rel="noreferrer">{row.url}</a></td><td>{row.lastModified ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.lastModified)) : <span className="indexnow-muted">Non renseignée</span>}</td></tr>)}</tbody></table></div>
      {rows.length === 0 && <p className="indexnow-empty">Aucune URL disponible.</p>}
      <footer className="indexnow-submit"><div aria-live="polite">{message && <p className="indexnow-alert indexnow-alert--success">{message}</p>}{error && <p className="indexnow-alert indexnow-alert--error">{error}</p>}</div><button className="btn btn--primary" type="button" disabled={sending || selected.size === 0 || loadWarning} onClick={() => void submit()}>{sending ? "Envoi en cours…" : `Envoyer ${selected.size} URL${selected.size > 1 ? "s" : ""}`}</button></footer>
    </section>
  </main>;
}
