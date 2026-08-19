import React, { useState } from "react";
import { adminFetch } from "@/lib/adminApi";
import type { SkiPassImportResult } from "@/types/skiPass";

type Entry = string | { path?: string; message?: string; error?: string };
type Preview = { valid?: boolean; station?: any; season?: any; periods_count?: number; passes_count?: number; products_count?: number; prices_count?: number; tariffs_count?: number; errors?: Entry[]; replaces_existing_season?: boolean; season_exists?: boolean; preview_token?: string };
const entryText = (entry: Entry) => typeof entry === "string" ? entry : `${entry.path ? `${entry.path} : ` : ""}${entry.message || entry.error || "Erreur de validation"}`;
const label = (value: any) => typeof value === "string" ? value : value?.name || value?.label || "—";

export default function ForfaitsJsonImport({ stationSlug, onImported }: { stationSlug: string; onImported?: (result: SkiPassImportResult) => void | Promise<void> }) {
  const [json, setJson] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState("");
  const request = async (action: "preview" | "import") => {
    setBusy(true); setErrors([]); setResult("");
    try {
      let data: unknown;
      try { data = JSON.parse(json); } catch (error) { throw new Error(`JSON invalide : ${error instanceof Error ? error.message : "syntaxe incorrecte"}`); }
      const response = await adminFetch(`/api/admin/stations/${encodeURIComponent(stationSlug)}/forfaits/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "import" && preview?.preview_token ? { data, preview_token: preview.preview_token } : data) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(body.errors) ? body.errors.map(entryText).join("\n") : body.message || body.error || `Erreur HTTP ${response.status}`);
      if (action === "preview") { setPreview(body); setErrors(Array.isArray(body.errors) ? body.errors.map(entryText) : []); }
      else {
        if (body?.success !== true) throw new Error(body?.message || "L’import n’a pas été confirmé par le backend.");
        for (const field of ["station_slug", "season", "periods_count", "passes_count", "prices_count"]) {
          if (body[field] === undefined || body[field] === null) throw new Error(`Réponse d’import incomplète : ${field} est absent.`);
        }
        if (body.periods_count < 1 || body.passes_count < 1 || body.prices_count < 1) throw new Error("Import refusé : aucune grille complète n’a été enregistrée.");
        const imported = body as SkiPassImportResult;
        setResult(`Import réussi — Saison ${imported.season} : ${imported.periods_count} période(s), ${imported.passes_count} forfait(s), ${imported.prices_count} tarif(s).`);
        setPreview(null); setJson("");
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
    <h3>Importer une saison de forfaits</h3><p>Collez le document JSON complet, puis vérifiez-le avant de lancer manuellement l’import.</p>
    <label htmlFor="forfaits-json">JSON des tarifs</label><textarea id="forfaits-json" value={json} onChange={(event) => { setJson(event.target.value); setPreview(null); setErrors([]); setResult(""); }} rows={12} spellCheck={false} placeholder={'{\n  "station": "…",\n  "season": "2026-2027",\n  "periods": []\n}'} />
    <div className="forfaits-json-actions"><button type="button" className="btn btn--secondary" disabled={busy || !json.trim()} onClick={() => void request("preview")}>{busy ? "Vérification…" : "Prévisualiser"}</button>{preview?.valid === true && <button type="button" className="btn btn--primary" disabled={busy} onClick={importData}>Importer</button>}</div>
    {preview && <div className={`forfaits-preview ${preview.valid ? "is-valid" : "is-invalid"}`} aria-live="polite"><h4>{preview.valid ? "JSON valide" : "JSON à corriger"}</h4><dl><div><dt>Station</dt><dd>{label(preview.station)}</dd></div><div><dt>Saison</dt><dd>{label(preview.season)}</dd></div><div><dt>Périodes</dt><dd>{preview.periods_count ?? 0}</dd></div><div><dt>Forfaits</dt><dd>{preview.passes_count ?? preview.products_count ?? 0}</dd></div><div><dt>Tarifs</dt><dd>{preview.prices_count ?? preview.tariffs_count ?? 0}</dd></div></dl>{(preview.replaces_existing_season || preview.season_exists) && <p><strong>Attention :</strong> l’import remplacera la saison existante après confirmation.</p>}</div>}
    {errors.length > 0 && <div className="forfaits-import-errors" role="alert"><strong>Erreurs</strong><ul>{errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul></div>}{result && <p className="forfaits-import-result" role="status">{result}</p>}
  </div>;
}
