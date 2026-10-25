import { useEffect, useRef, useState } from "react";
import { PlanPistesFigure } from "@/components/stations/StationPisteMap";
import { assembleStationBatch, prepareStationBatchMedia, resolveStationBatch, reviseStationBatch } from "@/lib/api/stationImports";
import BatchCorrectionEditor from "./BatchCorrectionEditor";
import { completeStationBatch } from "@/lib/completeStationBatch";

export type BatchJob = {
  station_slug: string;
  role: "cover" | "logo" | "piste_map";
  source_url?: string;
  source_provider?: string;
  job_token: string;
};
export type PreparedBatchMedia = BatchJob & {
  receipt: string;
  url: string;
  preview_url: string;
  render_mode?: "image" | "interactive";
  linked_image?: boolean;
  width: number;
  height: number;
  size_bytes: number;
};

type BatchQueue = { source: unknown; jobs: BatchJob[]; prepared: PreparedBatchMedia[] };

export default function BatchMediaPreparation({ batch, onPrepared, onBusy }: {
  batch: unknown;
  onPrepared: (document: unknown) => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [workingBatch, setWorkingBatch] = useState(batch);
  const [failedJob, setFailedJob] = useState<BatchJob | null>(null);
  const [editTarget, setEditTarget] = useState<Pick<BatchJob, "station_slug" | "role"> | null>(null);
  const [assets, setAssets] = useState<PreparedBatchMedia[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [reviewed, setReviewed] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [importBatch, setImportBatch] = useState<unknown>(null);
  const cache = useRef<BatchQueue | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [step, setStep] = useState("");
  useEffect(() => {
    if (!busy) return;
    const timer = globalThis.setInterval(() => setElapsed(value => value + 1), 1000);
    return () => globalThis.clearInterval(timer);
  }, [busy, step]);
  useEffect(() => () => controller.current?.abort(), []);
  const runStep = async <T,>(label: string, action: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    setStep(label); setElapsed(0);
    const active = new AbortController();
    controller.current = active;
    let rejectAbort: () => void = () => {};
    let timedOut = false;
    const interrupted = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(new Error(timedOut ? "Aucune réponse dans le délai prévu (75 s)." : "Attente arrêtée."));
      active.signal.addEventListener("abort", rejectAbort, { once: true });
    });
    const timer = globalThis.setTimeout(() => { timedOut = true; active.abort(); }, 75000);
    try { return await Promise.race([action(active.signal), interrupted]); }
    catch (error) { throw new Error(`${label} : ${error instanceof Error ? error.message : "Erreur inconnue"}`); }
    finally { globalThis.clearTimeout(timer); active.signal.removeEventListener("abort", rejectAbort); controller.current = null; }
  };
  const keyOf = (asset: BatchJob) => `${asset.station_slug}:${asset.role}`;
  const changeBusy = (value: boolean) => { setBusy(value); onBusy(value); };
  const prepareQueue = async (current: BatchQueue) => {
    for (let i = 0; i < current.jobs.length; i++) {
      const job = current.jobs[i];
      if (current.prepared.some(asset => keyOf(asset) === keyOf(job))) continue;
      setFailedJob(job);
      const label = `${i + 1}/${current.jobs.length} — ${job.station_slug} : ${job.role}`;
      setProgress(label);
      const prepared = await runStep(label, signal => prepareStationBatchMedia(job.job_token, signal));
      current.prepared.push(prepared);
      setAssets([...current.prepared]);
    }
    setFailedJob(null); setReady(true); setProgress("Médias préparés. Vérifiez les aperçus avant de poursuivre.");
  };
  const interrupted = (e: unknown) => {
    setProgress(`Préparation interrompue. ${cache.current?.prepared.length || 0} média(s) préparé(s) conservé(s) dans cette fenêtre. Corrigez l’élément ou reprenez les tests.`);
    setError(e instanceof Error && e.message ? e.message : "Préparation impossible.");
  };
  const prepare = async () => {
    if (busy) return;
    changeBusy(true); setError(""); setReady(false); setReviewed(false);
    try {
      if (!cache.current || cache.current.source !== workingBatch) {
        cache.current = null;
        setAssets([]); setLoaded({}); setOpened({}); setWarnings([]); setImportBatch(null);
        setProgress("Vérification des sources et de la disponibilité ANMSM…");
        const filtered = completeStationBatch(workingBatch);
        const exclusions = filtered.excluded.map(item => `${item.name} exclue : ${item.fields.join(", ")}.`);
        setWarnings(exclusions);
        if (!filtered.batch.document.stations.length) {
          setProgress("Aucune station complète à importer. Les informations manquantes sont listées ci-dessous.");
          return;
        }
        setImportBatch(filtered.batch);
        const resolved = await runStep("Vérification des sources du lot", signal => resolveStationBatch(filtered.batch, signal));
        setWarnings([...exclusions, ...resolved.warnings]);
        cache.current = { source: workingBatch, jobs: resolved.jobs, prepared: [] };
      }
      await prepareQueue(cache.current);
    } catch (e) { interrupted(e); }
    finally { changeBusy(false); }
  };
  const revise = async (nextBatch: unknown) => {
    if (busy) return;
    changeBusy(true); setError(""); setReviewed(false); setReady(false);
    try {
      const filtered = completeStationBatch(nextBatch);
      if (!filtered.batch.document.stations.length) throw new Error("Aucune station complète ne resterait dans le lot. Complétez les données avant de réessayer.");
      const result = await runStep("Validation de la correction", signal => reviseStationBatch(filtered.batch, (cache.current?.prepared || []).map(asset => asset.receipt), signal));
      const retainedKeys = new Set(result.prepared.map(keyOf));
      setLoaded(current => Object.fromEntries(Object.entries(current).filter(([key]) => retainedKeys.has(key))));
      setOpened(current => Object.fromEntries(Object.entries(current).filter(([key]) => retainedKeys.has(key))));
      setWorkingBatch(nextBatch); setImportBatch(filtered.batch);
      setWarnings([...filtered.excluded.map(item => `${item.name} exclue : ${item.fields.join(", ")}.`), ...result.warnings]);
      const current = { source: nextBatch, jobs: result.jobs, prepared: result.prepared };
      cache.current = current;
      setAssets([...current.prepared]); setEditTarget(null);
      await prepareQueue(current);
    } catch (e) { interrupted(e); }
    finally { changeBusy(false); }
  };
  const openCorrection = () => {
    const candidate = failedJob || cache.current?.jobs[0];
    const first = (workingBatch as { document?: { stations?: { station: { slug: string } }[] } })?.document?.stations?.[0]?.station.slug;
    if (candidate) setEditTarget(candidate);
    else if (first) setEditTarget({ station_slug: first, role: "piste_map" });
  };
  const allLoaded = assets.every(asset => asset.render_mode === "interactive" || loaded[keyOf(asset)]);
  const unopenedMaps = assets.filter(asset => asset.role === "piste_map" && !opened[keyOf(asset)]);
  const mapsOpened = unopenedMaps.length === 0;
  const finish = async () => {
    if (!ready || !allLoaded || !mapsOpened || !reviewed) return;
    changeBusy(true); setError("");
    try {
      const result = await runStep("Assemblage et prévisualisation du lot", signal => assembleStationBatch(importBatch, assets.map(asset => asset.receipt), signal));
      await onPrepared(result.document);
    } catch (e) { setError(e instanceof Error ? e.message : "Assemblage impossible."); }
    finally { changeBusy(false); }
  };
  return <section className="import-detail">
    <h3>Préparer les médias du lot</h3>
    <p>Les couvertures générées et les écussons sont stockés avant l’import. Les plans conservent leur URL, sans conversion ni copie. Ouvrez chaque plan pour vérifier son affichage.</p>
    <div style={{ position: "sticky", top: 0, zIndex: 2, background: "#f7fbff", padding: "12px", border: "1px solid #ccdce8" }}>
    <button type="button" className="btn btn--secondary" onClick={() => void prepare()} disabled={busy}>{assets.length || ready ? "Reprendre la préparation" : "Vérifier et préparer les médias"}</button>
    {progress && <p role="status">{progress}</p>}
    {busy && <>
      <p role="status">{step} — attente : {elapsed} s. {assets.length} média(s) déjà préparé(s).</p>
      {elapsed >= 20 && <p>La réponse prend du temps. L’étape sera interrompue après 75 secondes au maximum ; vous pourrez la reprendre.</p>}
      <button type="button" onClick={() => controller.current?.abort()}>Arrêter l’attente</button>
    </>}
    {error && <p role="alert">{error}</p>}
    {!busy && <button type="button" onClick={openCorrection}>{failedJob ? "Corriger le média en erreur" : "Corriger une station ou un média"}</button>}
    {error && !busy && <p>Vous pouvez modifier le lien du plan, remplacer un WebP ou corriger les données. Une erreur de connexion peut être réessayée ; un problème de droits ou de configuration serveur peut nécessiter une intervention technique.</p>}
    {assets.length > 0 && !ready && !busy && <p>Les médias reçus sont conservés tant que cette fenêtre reste ouverte. Aucun import de station n’a été lancé à cette étape.</p>}
    </div>
    {editTarget && <BatchCorrectionEditor key={`${editTarget.station_slug}:${editTarget.role}`} batch={workingBatch} target={editTarget} busy={busy} onApply={revise} onClose={() => setEditTarget(null)} />}
    {warnings.length > 0 && <ul>{warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>}
    {assets.map(asset => {
      const key = keyOf(asset);
      return <article key={key} className="import-detail">
        <h4>{asset.station_slug} — {asset.role === "cover" ? "Couverture" : asset.role === "logo" ? "Logo" : "Plan des pistes"}</h4>
        <p>{asset.source_provider === "generated" ? "Création Snow Explorer" : asset.source_provider === "anmsm" ? "Source ANMSM" : "Source officielle"} · {asset.render_mode === "interactive" ? "Plan interactif : vérification visuelle requise" : asset.linked_image ? "Lien image conservé" : `${asset.width} × ${asset.height} · ${(asset.size_bytes / 1024).toFixed(1)} Ko`}</p>
        {/* Test the final public URL, not an expiring private preview URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {asset.render_mode !== "interactive" && <img hidden={asset.role === "piste_map"} src={asset.url} alt={`Aperçu ${asset.role} ${asset.station_slug}`} style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain" }} onLoad={event => { if (event.currentTarget.naturalWidth > 0) setLoaded(current => ({ ...current, [key]: true })); }} onError={() => { setLoaded(current => ({ ...current, [key]: false })); setError(`Le fichier public de ${asset.station_slug} (${asset.role}) ne se charge pas. Vérifiez les permissions du stockage.`); }} />}
        {asset.role === "piste_map" && <PlanPistesFigure name={asset.station_slug} large={asset.render_mode === "interactive" || asset.linked_image ? null : asset.url} officialUrl={asset.render_mode === "interactive" || asset.linked_image ? asset.url : null} onModalOpen={() => setOpened(current => current[key] ? current : ({ ...current, [key]: true }))} />}
        {!busy && <button type="button" onClick={() => setEditTarget(asset)}>Modifier ce média</button>}
        {asset.source_url && <a href={asset.source_url} target="_blank" rel="noopener noreferrer">Voir la source</a>}
      </article>;
    })}
    {ready && <>
      <label><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} disabled={!allLoaded || !mapsOpened} /> J’ai vérifié les médias et les plans dans les modales. Seules les stations complètes sont conservées.</label>
      {!allLoaded && <p role="status">En attente du chargement des fichiers publics.</p>}
      {!mapsOpened && <p role="status">Plans restant à ouvrir avec leur bouton : {unopenedMaps.map(asset => asset.station_slug).join(", ")}.</p>}
      <button type="button" className="btn btn--primary" disabled={busy || !allLoaded || !mapsOpened || !reviewed} onClick={() => void finish()}>Prévisualiser les créations</button>
    </>}
  </section>;
}
