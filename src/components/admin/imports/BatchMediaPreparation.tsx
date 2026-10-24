import { useState } from "react";
import { PlanPistesFigure } from "@/components/stations/StationPisteMap";
import { assembleStationBatch, prepareStationBatchMedia, resolveStationBatch } from "@/lib/api/stationImports";

export type BatchJob = {
  station_slug: string;
  role: "cover" | "logo" | "piste_map";
  source_url: string;
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

export default function BatchMediaPreparation({ batch, onPrepared, onBusy }: {
  batch: unknown;
  onPrepared: (document: unknown) => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [assets, setAssets] = useState<PreparedBatchMedia[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [reviewed, setReviewed] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const keyOf = (asset: BatchJob) => `${asset.station_slug}:${asset.role}`;
  const changeBusy = (value: boolean) => { setBusy(value); onBusy(value); };
  const prepare = async () => {
    changeBusy(true); setError(""); setReady(false); setAssets([]); setLoaded({}); setOpened({}); setReviewed(false);
    try {
      setProgress("Vérification des sources et de la disponibilité ANMSM…");
      const resolved = await resolveStationBatch(batch);
      setWarnings(resolved.warnings);
      for (let i = 0; i < resolved.jobs.length; i++) {
        const job = resolved.jobs[i];
        setProgress(`${i + 1}/${resolved.jobs.length} — ${job.station_slug} : ${job.role}`);
        const prepared = await prepareStationBatchMedia(job.job_token);
        setAssets(current => [...current, prepared]);
      }
      setReady(true); setProgress("Médias préparés. Vérifiez les aperçus avant de poursuivre.");
    } catch (e) { setError(e instanceof Error ? e.message : "Préparation impossible."); }
    finally { changeBusy(false); }
  };
  const allLoaded = assets.every(asset => asset.render_mode === "interactive" || loaded[keyOf(asset)]);
  const mapsOpened = assets.filter(asset => asset.role === "piste_map").every(asset => opened[keyOf(asset)]);
  const finish = async () => {
    if (!ready || !allLoaded || !mapsOpened || !reviewed) return;
    changeBusy(true); setError("");
    try {
      const result = await assembleStationBatch(batch, assets.map(asset => asset.receipt));
      await onPrepared(result.document);
    } catch (e) { setError(e instanceof Error ? e.message : "Assemblage impossible."); }
    finally { changeBusy(false); }
  };
  return <section className="import-detail">
    <h3>Préparer les médias du lot</h3>
    <p>Les fichiers sont convertis et stockés avant l’import. Pour chaque plan, ouvrez la modale et vérifiez la station, le périmètre et la lisibilité.</p>
    <button type="button" className="btn btn--secondary" onClick={() => void prepare()} disabled={busy}>{assets.length || ready ? "Reprendre la préparation" : "Vérifier et préparer les médias"}</button>
    {progress && <p role="status">{progress}</p>}
    {error && <p role="alert">{error}</p>}
    {warnings.length > 0 && <ul>{warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>}
    {assets.map(asset => {
      const key = keyOf(asset);
      return <article key={key} className="import-detail">
        <h4>{asset.station_slug} — {asset.role === "cover" ? "Couverture" : asset.role === "logo" ? "Logo" : "Plan des pistes"}</h4>
        <p>{asset.source_provider === "anmsm" ? "Source ANMSM" : "Source officielle"} · {asset.render_mode === "interactive" ? "Plan interactif : vérification visuelle requise" : asset.linked_image ? "Lien image conservé" : `${asset.width} × ${asset.height} · ${(asset.size_bytes / 1024).toFixed(1)} Ko`}</p>
        {/* Test the final public URL, not an expiring private preview URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {asset.render_mode !== "interactive" && <img src={asset.url} alt={`Aperçu ${asset.role} ${asset.station_slug}`} style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain" }} onLoad={event => { if (event.currentTarget.naturalWidth > 0) setLoaded(current => ({ ...current, [key]: true })); }} onError={() => { setLoaded(current => ({ ...current, [key]: false })); setError(`Le fichier public de ${asset.station_slug} (${asset.role}) ne se charge pas. Vérifiez les permissions du stockage.`); }} />}
        {asset.role === "piste_map" && <div onClickCapture={event => {
          if ((event.target as HTMLElement).closest('button[aria-label^="Agrandir le plan"], button[aria-label^="Voir le plan"]')) setOpened(current => ({ ...current, [key]: true }));
        }}><PlanPistesFigure name={asset.station_slug} large={asset.render_mode === "interactive" || asset.linked_image ? null : asset.url} officialUrl={asset.render_mode === "interactive" || asset.linked_image ? asset.url : null} /></div>}
        <a href={asset.source_url} target="_blank" rel="noopener noreferrer">Voir la source</a>
      </article>;
    })}
    {ready && <>
      <label><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} disabled={!allLoaded || !mapsOpened} /> J’ai vérifié les médias et les plans dans les modales. Les éléments manquants signalés peuvent rester vides.</label>
      {!allLoaded && <p role="status">En attente du chargement des fichiers publics.</p>}
      {!mapsOpened && <p role="status">Ouvrez chaque plan avec « Agrandir le plan ».</p>}
      <button type="button" className="btn btn--primary" disabled={busy || !allLoaded || !mapsOpened || !reviewed} onClick={() => void finish()}>Prévisualiser les créations</button>
    </>}
  </section>;
}
