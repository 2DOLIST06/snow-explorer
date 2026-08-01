import type { ImportChange, ImportMessage } from "@/types/stationImport";
import { AlertTriangle, Check, CircleMinus, Pencil, Plus } from "lucide-react";
import { useState } from "react";

export const MAX_JSON_SIZE = 1024 * 1024;
export function validateJsonFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".json")) return "Sélectionnez un fichier avec l’extension .json.";
  if (file.size === 0) return "Le fichier est vide.";
  if (file.size > MAX_JSON_SIZE) return "Le fichier dépasse la taille maximale de 1 Mo.";
  return null;
}

const labels = { add: "Ajout", update: "Modification", clear: "Suppression", unchanged: "Inchangé" } as const;
const icons = { add: Plus, update: Pencil, clear: CircleMinus, unchanged: Check };
export function ChangeBadge({ action }: { action: ImportChange["action"] }) { const Icon = icons[action]; return <span className={`import-badge import-badge--${action}`}><Icon size={14} aria-hidden="true" />{labels[action]}</span>; }
export function MessageList({ title, messages, warning = false }: { title: string; messages: ImportMessage[]; warning?: boolean }) {
  if (!messages.length) return null;
  return <section className={`import-alert ${warning ? "import-alert--warning" : "import-alert--error"}`} role={warning ? "status" : "alert"}><h3><AlertTriangle size={18} aria-hidden="true" />{title}</h3><ul>{messages.map((m, i) => <li key={`${m.code}-${m.path || i}`}><strong>{m.path ? `${m.path} : ` : ""}</strong>{m.message}</li>)}</ul></section>;
}
function Value({ value }: { value: unknown }) {
  const [full, setFull] = useState(false);
  const text = value === undefined ? "—" : value === null ? "null" : typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const long = text.length > 240;
  return <div><pre className="import-value">{long && !full ? `${text.slice(0, 240)}…` : text}</pre>{long && <button type="button" className="import-link" onClick={() => setFull(v => !v)}>{full ? "Réduire" : "Voir la valeur complète"}</button>}</div>;
}
export function ChangeList({ changes }: { changes: ImportChange[] }) {
  return <div className="import-changes">{changes.map((change, index) => <article className="import-change" key={`${change.path}-${index}`}><header><strong>{change.path}</strong><ChangeBadge action={change.action} /></header><div className="import-change__values"><div><h4>Ancienne valeur</h4><Value value={change.old_value} /></div><div><h4>Nouvelle valeur</h4><Value value={change.new_value} /></div></div></article>)}</div>;
}
export function ImportRules() { return <aside className="import-rules"><h3>Règles d’import</h3><dl><div><dt>Champ absent</dt><dd>La valeur actuelle est conservée.</dd></div><div><dt>Champ avec null</dt><dd>La valeur est supprimée si le champ accepte une valeur vide.</dd></div><div><dt>Champ avec chaîne vide</dt><dd>La valeur peut être normalisée ou refusée selon le champ.</dd></div><div><dt>Tableau absent</dt><dd>La liste actuelle est conservée.</dd></div><div><dt>Tableau vide</dt><dd>La liste peut être vidée si le schéma le permet.</dd></div></dl></aside>; }

export function FilePicker({ file, onChange, error }: { file: File | null; onChange: (file: File | null) => void; error?: string }) {
  return <div className="import-file"><label htmlFor="station-json-file"><strong>Fichier JSON</strong><span>Format .json, 1 Mo maximum</span></label><input id="station-json-file" type="file" accept=".json,application/json" onChange={e => onChange(e.target.files?.[0] || null)} />{file && <div className="import-file__selected"><span><strong>{file.name}</strong> — {(file.size / 1024).toFixed(1)} Ko</span><button type="button" className="btn btn--secondary" onClick={() => onChange(null)}>Retirer</button></div>}{error && <p className="import-field-error" role="alert">{error}</p>}</div>;
}
