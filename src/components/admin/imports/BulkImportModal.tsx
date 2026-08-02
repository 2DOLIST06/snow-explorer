import { useState } from "react";
import AccessibleModal from "./AccessibleModal";
import { ChangeList, FilePicker, ImportRules, MessageList, validateJsonFile } from "./ImportUi";
import { confirmBulkStationImport, previewBulkStationImport } from "@/lib/api/stationImports";
import type { BulkImportOptions, BulkImportPreview, BulkImportResult, ImportMessage, StationImportPreviewItem } from "@/types/stationImport";

type Filter = "all" | "update" | "create" | "unchanged" | "error";
export default function BulkImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void | Promise<void> }) {
  const [file, setFile] = useState<File | null>(null), [fileError, setFileError] = useState(""); const [options, setOptions] = useState<BulkImportOptions>({ create_missing: false, transaction: "atomic" }); const [preview, setPreview] = useState<BulkImportPreview | null>(null), [result, setResult] = useState<BulkImportResult | null>(null); const [detail, setDetail] = useState<StationImportPreviewItem | null>(null), [filter, setFilter] = useState<Filter>("all"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const reset = () => { setFile(null); setFileError(""); setOptions({ create_missing: false, transaction: "atomic" }); setPreview(null); setResult(null); setDetail(null); setFilter("all"); setError(""); };
  const close = () => { if (!busy) { reset(); onClose(); } }; const select = (f: File | null) => { setFile(f); setFileError(f ? validateJsonFile(f) || "" : ""); setPreview(null); setResult(null); };
  const analyze = async () => { if (!file) return; setBusy(true); setError(""); try { setPreview(await previewBulkStationImport(file, options)); } catch (e) { setError(e instanceof Error ? e.message : "Analyse impossible."); } finally { setBusy(false); } };
  const previewStations = Array.isArray(preview?.stations)
    ? preview.stations.filter(
        (item): item is StationImportPreviewItem =>
          Boolean(item && typeof item === "object"),
      )
    : [];
  const total = preview?.summary?.total ?? previewStations.length;
  const invalidPreview = Boolean(preview) && (!preview?.summary || !Array.isArray(preview?.stations) || typeof preview?.valid !== "boolean");
  const blocked = invalidPreview || !preview?.valid || !preview?.preview_token || !previewStations.some(item => Array.isArray(item.changes) && item.changes.some(change => change.action !== "unchanged")) || (previewStations.some(item => item.status === "create") && !options.create_missing);
  const confirm = async () => { if (!file || !preview?.preview_token || blocked) return; setBusy(true); try { setResult(await confirmBulkStationImport(file, preview.preview_token, options)); await onImported(); } catch (e) { setError(e instanceof Error ? e.message : "Import impossible."); } finally { setBusy(false); } };
  const rows = previewStations.filter(item => filter === "all" || item.status === filter);
  const messages = (values: unknown[] | undefined): ImportMessage[] => Array.isArray(values) ? values.map((value, index) => {
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      return { code: typeof record.code === "string" ? record.code : `message-${index}`, path: typeof record.path === "string" ? record.path : undefined, message: typeof record.message === "string" ? record.message : JSON.stringify(value) };
    }
    return { code: `message-${index}`, message: String(value) };
  }) : [];
  return <AccessibleModal open={open} title="Importer plusieurs stations" busy={busy} onClose={close}>
    <div className="import-modal__body" aria-live="polite">
      {error && <div className="import-alert import-alert--error" role="alert">{error}</div>}
      {!result && <>
        <FilePicker file={file} onChange={select} error={fileError} />
        <fieldset className="import-options">
          <legend>Options</legend>
          <label><input type="checkbox" checked={options.create_missing} onChange={event => { setOptions(current => ({ ...current, create_missing: event.target.checked })); setPreview(null); }} /> Créer les stations absentes</label>
          {options.create_missing && <p className="import-alert import-alert--warning">Les stations absentes du site pourront être créées lors de la confirmation.</p>}
          <label><input type="radio" name="transaction" checked={options.transaction === "atomic"} onChange={() => setOptions(current => ({ ...current, transaction: "atomic" }))} /> Annuler tout l’import si une erreur survient</label>
          <label><input type="radio" name="transaction" checked={options.transaction === "valid_only"} onChange={() => setOptions(current => ({ ...current, transaction: "valid_only" }))} /> Importer uniquement les stations valides</label>
        </fieldset>
        {!preview && <><ImportRules /><button className="btn btn--primary" disabled={!file || !!fileError || busy} onClick={analyze}>{busy ? "Analyse…" : "Analyser le fichier"}</button></>}
      </>}
      {preview && !result && invalidPreview && <div className="import-alert import-alert--error" role="alert">La réponse de prévisualisation est invalide. Aucun contenu ne peut être affiché.</div>}
      {preview && !result && !invalidPreview && <>
        <div className="import-summary">
          <div><span>Total détecté</span><strong>{total}</strong></div>
          <div><span>Existantes</span><strong>{preview.summary?.existing ?? 0}</strong></div>
          <div><span>Absentes</span><strong>{preview.summary?.missing ?? 0}</strong></div>
          <div><span>Inchangées</span><strong>{preview.summary?.unchanged ?? 0}</strong></div>
          <div><span>En erreur</span><strong>{preview.summary?.errors ?? 0}</strong></div>
        </div>
        <MessageList title="Erreurs" messages={messages(preview.errors)} />
        <MessageList title="Avertissements" messages={messages(preview.warnings)} warning />
        <label className="import-filter">Filtrer <select value={filter} onChange={event => setFilter(event.target.value as Filter)}><option value="all">Toutes</option><option value="update">Mises à jour</option><option value="create">Créations</option><option value="unchanged">Inchangées</option><option value="error">Erreurs</option></select></label>
        <div className="import-table-wrap"><table className="import-table"><thead><tr><th scope="col">Nom</th><th scope="col">Slug</th><th scope="col">Identifiant</th><th scope="col">Statut</th><th scope="col">Changements</th><th scope="col">Action</th></tr></thead><tbody>
          {rows.map((item, index) => {
            const stationName = item.name?.trim() || item.slug?.trim() || "Station non identifiée";
            const changes = Array.isArray(item.changes) ? item.changes : [];
            return <tr key={item.id ?? item.slug ?? `station-${index}`}><td>{stationName}</td><td>{item.slug || "—"}</td><td>{item.id ?? "—"}</td><td>{item.status}</td><td>{changes.length}</td><td><button className="import-link" onClick={() => setDetail(item)}>Voir le détail</button></td></tr>;
          })}
        </tbody></table></div>
        {detail && (() => {
          const stationName = detail.name?.trim() || detail.slug?.trim() || "Station non identifiée";
          const changes = Array.isArray(detail.changes) ? detail.changes : [];
          return <section className="import-detail"><button className="import-link" onClick={() => setDetail(null)}>Fermer le détail</button><h3>{stationName} — {detail.status}</h3><p>Slug : {detail.slug || "—"}</p><p>Identifiant : {detail.id ?? "—"}</p><ChangeList changes={changes} /></section>;
        })()}
        <div className="import-actions"><button className="btn btn--secondary" disabled={busy} onClick={() => setPreview(null)}>Modifier les options</button><button className="btn btn--primary" disabled={blocked || busy} onClick={confirm}>{busy ? "Confirmation…" : "Confirmer l’import"}</button></div>
      </>}
      {result && <div className="import-result"><h3>Rapport d’import</h3><p>{result.message || (result.success ? "Import terminé." : "Import partiel ou en erreur.")}</p><div className="import-summary">{Object.entries(result.summary || {}).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</div><button className="btn btn--primary" onClick={close}>Fermer</button></div>}
    </div>
  </AccessibleModal>;
}
