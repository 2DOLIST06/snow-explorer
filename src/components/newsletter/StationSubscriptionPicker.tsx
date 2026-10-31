import { useMemo, useState } from "react";
import StationSearch from "./StationSearch";
import { translator } from "@/lib/newsletter/i18n";
import type { StationSummary } from "@/types/newsletter";
import styles from "./StationNewsletterEditor.module.css";

type Props = { followedIds: Set<string>; onAdd: (stations: StationSummary[]) => void; onClose: () => void; disabled?: boolean; fr: boolean; maxSelections: number };
export default function StationSubscriptionPicker({ followedIds, onAdd, onClose, disabled, fr, maxSelections }: Props) {
  const [selected, setSelected] = useState<StationSummary[]>([]);
  const t = useMemo(() => translator(fr ? "fr" : "en"), [fr]);
  return <section className={styles.picker} aria-label={fr ? "Choisir les stations à ajouter" : "Choose resorts to add"}>
    <div className={styles.pickerHeading}><strong>{fr ? "Choisissez une ou plusieurs stations" : "Choose one or more resorts"}</strong><button type="button" className={styles.textButton} disabled={disabled} onClick={onClose}>{fr ? "Fermer" : "Close"}</button></div>
    <StationSearch followedIds={followedIds} selected={selected} onChange={setSelected} disabled={disabled} t={t} />
    <p role="status">{fr ? `${selected.length} station(s) sélectionnée(s)` : `${selected.length} resort(s) selected`}</p>
    {selected.length > maxSelections && <p role="alert">{fr ? `Vous pouvez ajouter encore ${maxSelections} station(s).` : `You can add ${maxSelections} more resort(s).`}</p>}
    <button type="button" className="btn btn--primary" disabled={disabled || !selected.length || selected.length > maxSelections} onClick={() => onAdd(selected)}>{fr ? "Ajouter les stations sélectionnées" : "Add selected resorts"}</button>
  </section>;
}
