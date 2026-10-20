import { useState } from "react";
import type { ActivitiesBlock, ActivityItem } from "@/types/activities";
import ActivityRichEditor from "./ActivityRichEditor";
import ActivityImageInput from "./ActivityImageInput";
import ActivitiesPreview from "@/components/activities/ActivitiesBlock";
export default function ActivitiesEditor({ value, onChange }: { value: ActivitiesBlock; onChange: (block: ActivitiesBlock) => void }) {
  const [preview, setPreview] = useState(false);
  const update = (index: number, patch: Partial<ActivityItem>) => onChange({ ...value, items: value.items.map((item, i) => i === index ? { ...item, ...patch } as ActivityItem : item) });
  const move = (index: number, offset: number) => { const items = [...value.items]; [items[index], items[index + offset]] = [items[index + offset], items[index]]; onChange({ ...value, items }); };
  const add = (type: ActivityItem["type"]) => {
    const base = { id: crypto.randomUUID(), enabled: true };
    const item: ActivityItem = type === "image" ? { ...base, type, src: "", alt: "", href: "", newTab: true } : type === "rich" ? { ...base, type, html: "" } : { ...base, type, html: "", origins: [] };
    onChange({ ...value, items: [...value.items, item] });
  };
  return <div className="activities-admin">
    <label><input type="checkbox" checked={value.enabled} onChange={e => onChange({ ...value, enabled: e.target.checked })} />Activer le bloc</label>
    <label>Titre du bloc<input maxLength={200} value={value.title} onChange={e => onChange({ ...value, title: e.target.value })} /></label>
    {value.items.map((item, index) => <fieldset key={item.id}><legend>Élément {index + 1} · {item.type === "image" ? "Image avec lien" : item.type === "rich" ? "Contenu enrichi" : "Intégration d’affiliation"}</legend>
      <div className="activity-actions"><label><input type="checkbox" checked={item.enabled} onChange={e => update(index, { enabled: e.target.checked })} />Actif</label><button type="button" disabled={index === 0} onClick={() => move(index, -1)}>Monter</button><button type="button" disabled={index === value.items.length - 1} onClick={() => move(index, 1)}>Descendre</button><button type="button" onClick={() => onChange({ ...value, items: value.items.filter((_, i) => i !== index) })}>Supprimer</button></div>
      {item.type === "image" ? <><ActivityImageInput value={item.src} onChange={src => update(index, { src })} /><label>Texte alternatif<input value={item.alt} onChange={e => update(index, { alt: e.target.value })} /></label><label>URL de destination (paramètres conservés)<input value={item.href} onChange={e => update(index, { href: e.target.value })} /></label><label><input type="checkbox" checked={item.newTab} onChange={e => update(index, { newTab: e.target.checked })} />Ouvrir dans un nouvel onglet</label></> : item.type === "rich" ? <ActivityRichEditor value={item.html} onChange={html => update(index, { html })} /> : <>
        <p>HTML, iframe HTTPS ou script externe HTTPS avec son conteneur. Les scripts inline, formulaires et accès au document parent sont incompatibles. Le code reste séparé de l’éditeur visuel.</p>
        <label>Code du partenaire<textarea rows={9} spellCheck={false} value={item.html} onChange={e => update(index, { html: e.target.value })} /></label>
        <label>Origines réseau supplémentaires, une par ligne (API, styles, polices)<textarea value={item.origins.join("\n")} placeholder="https://api.partenaire.com" onChange={e => update(index, { origins: e.target.value.split(/\s+/).filter(Boolean) })} /></label>
      </>}
    </fieldset>)}
    <div className="activity-actions">{(["image", "rich", "embed"] as const).map((type, i) => <button key={type} type="button" disabled={value.items.length >= 50} onClick={() => add(type)}>Ajouter {['une image avec lien', 'du contenu enrichi', 'une intégration'][i]}</button>)}<button type="button" onClick={() => setPreview(!preview)}>{preview ? "Fermer l’aperçu" : "Aperçu"}</button></div>
    {preview && <div className="activities-preview"><p>Aperçu des éléments actifs. Les widgets se chargent uniquement après votre accord. Vérifiez les erreurs de validation à la sauvegarde.</p><ActivitiesPreview block={value} /></div>}
  </div>;
}
