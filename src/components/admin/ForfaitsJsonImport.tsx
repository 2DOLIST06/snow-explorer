import React, { useRef, useState } from "react";
import { adminFetch } from "@/lib/adminApi";
import { downloadJson, skiPassExport, SKI_PASS_TEMPLATE } from "@/lib/skiPassJsonExport";
import type { SkiPassImportResult, SkiPassSeason } from "@/types/skiPass";

type Entry = string | { path?: string; message?: string; error?: string };
type Preview = { valid?: boolean; station?: any; season?: any; periods_count?: number; passes_count?: number; products_count?: number; prices_count?: number; tariffs_count?: number; errors?: Entry[]; replaces_existing_season?: boolean; season_exists?: boolean; preview_token?: string };
type Props = { stationSlug: string; season?: SkiPassSeason; onImported?: (result: SkiPassImportResult) => void | Promise<void> };
const entryText = (entry: Entry) => typeof entry === "string" ? entry : `${entry.path ? `${entry.path} : ` : ""}${entry.message || entry.error || "Erreur de validation"}`;
const label = (value: any) => typeof value === "string" ? value : value?.name || value?.label || "—";

export function collectImportedPriceNotes(value: unknown): string[] {
  const notes: string[] = [];
  const visit = (candidate: unknown) => {
    if (Array.isArray(candidate)) return candidate.forEach(visit);
    if (!candidate || typeof candidate !== "object") return;
    const record = candidate as Record<string, unknown>;
    const note = typeof record.note === "string" ? record.note.trim() : "";
    if (note && !notes.includes(note)) notes.push(note);
    Object.values(record).forEach(visit);
  };
  visit(value);
  return notes;
}

export default function ForfaitsJsonImport({ stationSlug, season, onImported }: Props) {
  const [json, setJson] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState("");
  const [previewNotes, setPreviewNotes] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const resetValidation = () => { setPreview(null); setPreviewNotes([]); setErrors([]); setResult(""); };
  const loadFile = async (file?: File) => {
    if (!file) return;
    setBusy(true); resetValidation();
    try {
      const content = await file.text();
      JSON.parse(content);
      setJson(content); setFileName(file.name);
    } catch (error) {
      setFileName("");
      setErrors([`Fichier JSON invalide : ${error instanceof Error ? error.message : "lecture impossible"}`]);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };
  const request = async (action: "preview" | "import") => {
    setBusy(true); setErrors([]); setResult("");
    try {
      let data: unknown;
      try { data = JSON.parse(json); } catch (error) { throw new Error(`JSON invalide : ${error instanceof Error ? error.message : "syntaxe incorrecte"}`); }
      const response = await adminFetch(`/api/admin/stations/${encodeURIComponent(stationSlug)}/forfaits/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "import" && preview?.preview_token ? { data, preview_token: preview.preview_token } : data) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(body.errors) ? body.errors.map(entryText).join("\n") : body.message || body.error || `Erreur HTTP ${response.status}`);
      if (action === "preview") { setPreview(body); setPreviewNotes(collectImportedPriceNotes(data)); setErrors(Array.isArray(body.errors) ? body.errors.map(entryText) : []); }
      else {
        if (body?.success !== true) throw new Error(body?.message || "L’import n’a pas été confirmé par le backend.");
        for (const field of ["station_slug", "season", "periods_count", "passes_count", "prices_count"]) {
          if (body[field] === undefined || body[field] === null) throw new Error(`Réponse d’import incomplète : ${field} est absent.`);
        }
        if (body.periods_count < 1 || body.passes_count < 1 || body.prices_count < 1) throw new Error("Import refusé : aucune grille complète n’a été enregistrée.");
        const imported = body as SkiPassImportResult;
        setResult(`Import réussi — Saison ${imported.season} : ${imported.periods_count} période(s), ${imported.passes_count} forfait(s), ${imported.prices_count} tarif(s).`);
        setPreview(null); setPreviewNotes([]); setJson("");
        await onImported?.(imported);
      }
    } catch (error) { setErrors(String(error instanceof Error ? error.message : error).split("\n")); }
    finally { setBusy(false); }
  };
  const importData = () => {
    if (!preview?.valid) return;
    if ((preview.replaces_existing_season || preview.season_exists) && !window.confirm("Cette saison existe déjà. Confirmez-vous son remplacement complet ?")) return;
    void request("import");
  };
  return <div className="forfaits-json-import">
    <h3>Importer une saison de forfaits</h3><p>Importez un fichier JSON ou collez le document complet, puis vérifiez-le avant de lancer manuellement l’import. Ajoutez <code>"note": "Votre note"</code> sur un tarif pour afficher une étoile rouge et sa note sous la grille. Le champ <code>label</code> des tarifs dynamiques reste inchangé. Plusieurs textes différents génèrent *, **, puis *** dans leur ordre d’apparition.</p>
    <div className="forfaits-json-export-actions">
      <button type="button" className="btn btn--secondary" disabled={!season} onClick={() => season && downloadJson(skiPassExport(stationSlug, season), `forfaits-${stationSlug}-${season.season}.json`)}>Exporter le JSON</button>
      <button type="button" className="btn btn--secondary" onClick={() => downloadJson(SKI_PASS_TEMPLATE, "modele-forfaits.json")}>Exporter la structure vide</button>
    </div>
    <div className="forfaits-json-file">
      <input ref={fileInput} id="forfaits-json-file" type="file" accept="application/json,.json" disabled={busy} onChange={event => void loadFile(event.target.files?.[0])} />
      <label htmlFor="forfaits-json-file" className="btn btn--secondary" aria-disabled={busy}>{busy ? "Lecture en cours…" : "Choisir un fichier JSON"}</label>
      <span aria-live="polite">{fileName ? `Fichier chargé : ${fileName}` : "Aucun fichier sélectionné"}</span>
    </div>
    <label htmlFor="forfaits-json">JSON des tarifs</label><textarea id="forfaits-json" value={json} onChange={(event) => { setJson(event.target.value); setFileName(""); resetValidation(); }} rows={12} spellCheck={false} placeholder={'{\n  "station": "…",\n  "season": "2026-2027",\n  "periods": []\n}'} />
    <div className="forfaits-json-actions"><button type="button" className="btn btn--secondary" disabled={busy || !json.trim()} onClick={() => void request("preview")}>{busy ? "Vérification…" : "Prévisualiser"}</button>{preview?.valid === true && <button type="button" className="btn btn--primary" disabled={busy} onClick={importData}>Importer</button>}</div>
    {preview && <div className={`forfaits-preview ${preview.valid ? "is-valid" : "is-invalid"}`} aria-live="polite"><h4>{preview.valid ? "JSON valide" : "JSON à corriger"}</h4><dl><div><dt>Station</dt><dd>{label(preview.station)}</dd></div><div><dt>Saison</dt><dd>{label(preview.season)}</dd></div><div><dt>Périodes</dt><dd>{preview.periods_count ?? 0}</dd></div><div><dt>Forfaits</dt><dd>{preview.passes_count ?? preview.products_count ?? 0}</dd></div><div><dt>Tarifs</dt><dd>{preview.prices_count ?? preview.tariffs_count ?? 0}</dd></div><div><dt>Notes étoilées</dt><dd>{previewNotes.length}</dd></div></dl>{previewNotes.length > 0 && <div className="forfaits-preview__notes"><strong>Notes détectées dans le JSON</strong><ul>{previewNotes.map((note, index) => <li key={note}><span className="forfait-note-marker" aria-hidden="true">{"*".repeat(index + 1)}</span> {note}</li>)}</ul></div>}{(preview.replaces_existing_season || preview.season_exists) && <p><strong>Attention :</strong> l’import remplacera la saison existante après confirmation.</p>}</div>}
    {errors.length > 0 && <div className="forfaits-import-errors" role="alert"><strong>Erreurs</strong><ul>{errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul></div>}{result && <p className="forfaits-import-result" role="status">{result}</p>}
  </div>;
}
