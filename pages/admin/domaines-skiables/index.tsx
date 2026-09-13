import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listCatalogExpectations } from "@/lib/adminSkiAreaCatalogApi";
import { getAdminSkiArea, listAdminSkiAreas, setAdminSkiAreaPublication } from "@/lib/adminSkiAreasApi";
import type { Pagination, SkiAreaAdmin } from "@/types/skiArea";
import type { CatalogExpectation } from "@/types/skiAreaCatalog";

const initialPagination: Pagination = { page: 1, per_page: 20, total: 0, pages: 0 };
type StationReadiness = { attached: number; valid: number; expected: number; ready: boolean };

export default function AdminSkiAreas() {
  const [items, setItems] = useState<SkiAreaAdmin[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [readiness, setReadiness] = useState<Record<number, StationReadiness>>({});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listAdminSkiAreas({ page, q, status });
      setItems(data.items);
      setPagination(data.pagination);
      const detailsPromise = Promise.allSettled(data.items.map(item => getAdminSkiArea(item.id)));
      const expectationsPromise = (async () => {
        let expectationPage = 1;
        let pages = 1;
        const expectations: CatalogExpectation[] = [];
        do {
          const result = await listCatalogExpectations({ page: expectationPage, per_page: 100 });
          expectations.push(...result.items);
          pages = result.pagination.pages;
          expectationPage += 1;
        } while (expectationPage <= pages);
        return expectations;
      })();
      const [details, expectationsResult] = await Promise.all([detailsPromise, Promise.allSettled([expectationsPromise])]);
      const expectations = expectationsResult[0].status === "fulfilled" ? expectationsResult[0].value : [];
      const next: Record<number, StationReadiness> = {};

      data.items.forEach((item, index) => {
        const detail = details[index];
        const stations = detail.status === "fulfilled" ? detail.value.ski_area.stations || [] : [];
        const expected = expectations.filter(expectation => expectation.expected_memberships.some(membership => membership.ski_area_id === item.id));
        const attachedIds = new Set(stations.map(station => station.id));
        const validStations = expected.filter(expectation =>
          expectation.resolution_state === "linked"
          && Boolean(expectation.resort_id)
          && attachedIds.has(expectation.resort_id as string)
          && stations.find(station => station.id === expectation.resort_id)?.is_active === true,
        );
        next[item.id] = {
          attached: stations.length,
          valid: validStations.length,
          expected: expected.length,
          ready: detail.status === "fulfilled"
            && expectationsResult[0].status === "fulfilled"
            && expected.length > 0
            && validStations.length === expected.length,
        };
      });
      setReadiness(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, q, status]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const publish = async (item: SkiAreaAdmin) => {
    setError("");
    setNotice("");
    try {
      await setAdminSkiAreaPublication(item.id, item.status !== "published");
      setNotice(item.status === "published" ? "Domaine dépublié." : "Domaine publié.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return <main className="admin-page">
    <header className="admin-page-heading"><div><p className="eyebrow">Administration</p><h1>Domaines skiables</h1><p>{pagination.total} domaine(s)</p></div><div className="admin-heading-actions"><Link className="btn btn--secondary" href="/admin/domaines-skiables/attentes">Stations à rattacher</Link><Link className="btn btn--secondary" href="/admin/domaines-skiables/import">Importer les domaines</Link><Link className="btn btn--primary" href="/admin/domaines-skiables/new">Créer un domaine</Link></div></header>
    <section className="admin-list-filters"><label>Rechercher<input value={q} onChange={event => { setQ(event.target.value); setPage(1); }} placeholder="Nom ou slug" /></label><label>Statut<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Tous</option><option value="draft">Brouillons</option><option value="published">Publiés</option></select></label></section>
    {error && <p className="admin-form-error" role="alert">{error}</p>}{notice && <p className="admin-form-success" role="status">{notice}</p>}
    {loading ? <p>Chargement des domaines…</p> : <div className="admin-table-wrap"><table className="admin-data-table"><thead><tr><th>Nom</th><th>Statut</th><th>Stations</th><th>Actions</th></tr></thead><tbody>{items.map(item => {
      const stationState = readiness[item.id];
      return <tr key={item.id}><td><strong>{item.name}</strong><small>{item.slug}</small></td><td><span className={`admin-status admin-status--${item.status}`}>{item.status === "published" ? "Publié" : "Brouillon"}</span></td><td><span className={stationState?.ready ? "admin-station-count--ready" : undefined}>{stationState ? (stationState.expected > 0 ? `${stationState.valid} sur ${stationState.expected}` : stationState.attached) : "…"}</span>{stationState?.ready && <span className="admin-readiness" title="Toutes les stations attendues sont rattachées et actives">✓ Prêt à publier</span>}</td><td><div className="admin-row-actions"><Link href={`/admin/domaines-skiables/${item.id}`}>Modifier</Link>{item.status === "published" && <Link href={`/domaines-skiables/${item.slug}`}>Voir</Link>}<button className={item.status !== "published" && stationState?.ready ? "admin-publish-ready" : undefined} type="button" onClick={() => void publish(item)}>{item.status === "published" ? "Dépublier" : "Publier"}</button></div></td></tr>;
    })}</tbody></table>{items.length === 0 && <p className="empty-state">Aucun domaine trouvé.</p>}</div>}
    <div className="admin-pagination"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Précédent</button><span>Page {pagination.page}{pagination.pages ? ` sur ${pagination.pages}` : ""}</span><button disabled={!pagination.pages || page >= pagination.pages} onClick={() => setPage(value => value + 1)}>Suivant</button></div>
  </main>;
}
