import { useState } from "react";
import type { BatchJob } from "./BatchMediaPreparation";

type StationRecord = { station: { slug: string; name?: string; [key: string]: unknown }; [key: string]: unknown };
type MediaRecord = { station_slug: string; role: string; [key: string]: unknown };
type Draft = { document: { stations: StationRecord[] }; media: MediaRecord[]; research?: { station_slug?: string; [key: string]: unknown }[] };

export default function BatchCorrectionEditor({ batch, target, busy, onApply, onClose }: {
  batch: unknown; target: Pick<BatchJob, "station_slug" | "role">; busy: boolean;
  onApply: (batch: unknown) => Promise<void>; onClose: () => void;
}) {
  const draft = batch as Draft;
  const [slug, setSlug] = useState(target.station_slug);
  const [role, setRole] = useState<BatchJob["role"]>(target.role);
  const current = draft.media.find(media => media.station_slug === slug && media.role === role);
  const [url, setUrl] = useState(String(current?.source_url || ""));
  const [page, setPage] = useState("");
  const [format, setFormat] = useState(String(current?.format || "file"));
  const [file, setFile] = useState<File | null>(null);
  const [editData, setEditData] = useState(false);
  const [data, setData] = useState(JSON.stringify(draft.document.stations.find(record => record.station.slug === slug), null, 2));
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const select = (nextSlug: string, nextRole: BatchJob["role"]) => {
    setSlug(nextSlug); setRole(nextRole); setFile(null); setError(""); setPage(""); setEditData(false);
    const media = draft.media.find(item => item.station_slug === nextSlug && item.role === nextRole);
    setUrl(String(media?.source_url || "")); setFormat(String(media?.format || "file"));
    setData(JSON.stringify(draft.document.stations.find(record => record.station.slug === nextSlug), null, 2));
  };
  const apply = async () => {
    setError(""); setReading(true);
    try {
      const next = JSON.parse(JSON.stringify(draft)) as Draft;
      const index = next.document.stations.findIndex(record => record.station.slug === slug);
      if (editData) {
        const record = JSON.parse(data) as StationRecord;
        if (!record?.station || record.station.slug !== slug) throw new Error("Conservez le slug de la station. Modifiez seulement ses données.");
        next.document.stations[index] = record;
      }
      const mediaIndex = next.media.findIndex(item => item.station_slug === slug && item.role === role);
      if (role === "piste_map" && (url.trim() !== String(current?.source_url || "") || format !== String(current?.format || "file") || page.trim())) {
        const link = new URL(url.trim());
        if (link.protocol !== "https:" || link.username || link.password) throw new Error("Indiquez un lien HTTPS public vers le plan.");
        const sourcePage = page.trim() || link.toString();
        const parsedPage = new URL(sourcePage);
        if (parsedPage.protocol !== "https:" || parsedPage.username || parsedPage.password) throw new Error("La page source doit être un lien HTTPS public.");
        next.media[mediaIndex] = { station_slug: slug, role, status: "found", format, source_kind: "official", source_provider: "official", source_selection: "manual", source_url: link.toString(), source_page_url: parsedPage.toString() };
      } else if (file) {
        const limit = (role === "cover" ? 80 : 40) * 1024;
        if (!file.size || file.size > limit) throw new Error(`Le WebP doit peser au maximum ${limit / 1024} Ko.`);
        const bytes = new Uint8Array(await file.arrayBuffer());
        const marker = String.fromCharCode(...bytes.slice(0, 12));
        if (!marker.startsWith("RIFF") || marker.slice(8) !== "WEBP") throw new Error("Le fichier doit être une véritable image WebP.");
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        next.media[mediaIndex] = { station_slug: slug, role, status: "found", format: "file", source_kind: "generated", source_provider: "generated", source_selection: "manual", data_base64: btoa(binary) };
      }
      await onApply(next);
    } catch (e) { setError(e instanceof Error ? e.message : "Correction invalide."); }
    finally { setReading(false); }
  };
  const exclude = async () => {
    setError("");
    if (draft.document.stations.length <= 1) { setError("Il ne resterait aucune station à importer."); return; }
    const next = JSON.parse(JSON.stringify(draft)) as Draft;
    next.document.stations = next.document.stations.filter(record => record.station.slug !== slug);
    next.media = next.media.filter(media => media.station_slug !== slug);
    if (next.research) next.research = next.research.filter(item => item.station_slug !== slug);
    try { await onApply(next); } catch (e) { setError(e instanceof Error ? e.message : "Correction impossible."); }
  };
  return <section className="import-detail" aria-label="Corriger le lot">
    <h4>Corriger et retester</h4>
    <p>Seuls les médias modifiés seront préparés à nouveau. Les autres seront conservés après vérification. Les corrections ne sont pas encore enregistrées sur le site.</p>
    <fieldset disabled={busy || reading} style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <label>Station <select aria-label="Station à corriger" value={slug} onChange={event => select(event.target.value, role)}>{draft.document.stations.map(record => <option key={record.station.slug} value={record.station.slug}>{record.station.name || record.station.slug}</option>)}</select></label>
      <label>Média <select aria-label="Média à corriger" value={role} onChange={event => select(slug, event.target.value as BatchJob["role"])}><option value="piste_map">Plan des pistes</option><option value="logo">Logo</option><option value="cover">Couverture</option></select></label>
      {role === "piste_map" ? <>
        <label>Nouveau lien du plan <input aria-label="Nouveau lien du plan" type="url" value={url} onChange={event => { const value = event.target.value; setUrl(value); setPage(""); try { setFormat(/\.(pdf|jpe?g|png|webp)$/i.test(new URL(value).pathname) ? "file" : "interactive"); } catch { /* validate on submission */ } }} style={{ width: "100%" }} /></label>
        <label>Type de plan <select aria-label="Type de plan" value={format} onChange={event => setFormat(event.target.value)}><option value="file">Image ou PDF</option><option value="interactive">Lecteur interactif, Calaméo ou page intégrable</option></select></label>
        <label>Page source (facultatif, sinon le lien du plan est utilisé) <input aria-label="Page source du plan" type="url" value={page} onChange={event => setPage(event.target.value)} style={{ width: "100%" }} /></label>
      </> : <>
        <p>{role === "cover" ? "Remplacement : couverture générée de zéro, en WebP de 80 Ko maximum." : "Remplacement : écusson Snow Explorer généré, en WebP de 40 Ko maximum."}</p>
        {Boolean(current?.source_url) && <a href={String(current?.source_url)} target="_blank" rel="noopener noreferrer">Ouvrir la source actuelle</a>}
        <label>Fichier WebP de remplacement <input aria-label="Fichier WebP de remplacement" type="file" accept="image/webp,.webp" onChange={event => setFile(event.target.files?.[0] || null)} /></label>
      </>}
      <label><input type="checkbox" checked={editData} onChange={event => setEditData(event.target.checked)} /> Modifier aussi les données de cette station</label>
      {editData && <label>Données de la station (JSON) <textarea aria-label="Données de la station" value={data} onChange={event => setData(event.target.value)} rows={15} style={{ width: "100%", fontFamily: "monospace" }} /></label>}
      {error && <p role="alert">{error}</p>}
      <button type="button" className="btn btn--primary" onClick={() => void apply()}>Appliquer la correction et reprendre les tests</button>
      <button type="button" className="btn btn--secondary" onClick={() => void exclude()}>Écarter cette station du lot</button>
      <button type="button" className="btn btn--secondary" onClick={onClose}>Fermer la correction</button>
    </fieldset>
  </section>;
}
