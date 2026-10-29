import { useId, useState } from "react";

/** The entire description is server-rendered; only its mobile height changes. */
export default function MobileDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <div className="ski-area-description-wrap">
    <p id={id} className={`ski-area-description${expanded ? " is-expanded" : ""}`}>{text}</p>
    <button type="button" className="ski-area-description-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>{expanded ? "Voir moins" : "Voir la suite"}</button>
  </div>;
}
