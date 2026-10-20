import { useEffect, useState } from "react";
import { activitiesApi } from "@/lib/adminActivitiesApi";
import type { ActivitiesSnapshot } from "@/types/activities";
import ActivitiesEditor from "./ActivitiesEditor";
export default function StationActivitiesEditor({ slug }: { slug: string }) {
  const [state, setState] = useState<ActivitiesSnapshot | null>(null); const [error, setError] = useState(""); const [saved, setSaved] = useState(false); const [busy, setBusy] = useState(false);
  const load = () => { setError(""); setState(null); void activitiesApi<ActivitiesSnapshot>(`stations/${encodeURIComponent(slug)}/activities`).then(setState).catch(e => setError(e.message)); };
  useEffect(() => { let active = true; setState(null); setError(""); void activitiesApi<ActivitiesSnapshot>(`stations/${encodeURIComponent(slug)}/activities`).then(data => { if (active) setState(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [slug]);
  return <section className="activities-admin"><h2>Activités à faire</h2><p>Enregistrement indépendant des autres données de la station. <a href="/admin/activites">Gérer les modèles et les lots</a></p>
    {error && <p role="alert">{error}</p>}{saved && <p role="status">Bloc enregistré.</p>}
    {state ? <><fieldset disabled={busy}><ActivitiesEditor value={state.block} onChange={block => { setSaved(false); setState({ ...state, block }); }} /></fieldset>
      <div className="activity-actions"><button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(""); setSaved(false); try { const data = await activitiesApi<ActivitiesSnapshot>(`stations/${encodeURIComponent(slug)}/activities`, "PUT", state); setState(data); setSaved(true); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>Enregistrer les activités</button><button type="button" disabled={busy} onClick={load}>Recharger le bloc enregistré</button></div>
    </> : <button type="button" onClick={load}>Charger le bloc</button>}
  </section>;
}
