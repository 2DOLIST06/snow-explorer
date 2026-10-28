import { useEffect, useRef, useState, type ReactNode } from "react";

export type SkiAreaSection = { id: string; label: string; mobileLabel?: string; content: ReactNode };

export default function SkiAreaSections({ sections, hero }: { sections: SkiAreaSection[]; hero?: ReactNode }) {
  const [selected, setSelected] = useState("apercu");
  const [first, setFirst] = useState<string | null>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;
    const update = () => setEdges({ left: navigation.scrollLeft > 1, right: navigation.scrollLeft + navigation.clientWidth < navigation.scrollWidth - 1 });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(navigation);
    navigation.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); navigation.removeEventListener("scroll", update); };
  }, []);

  function select(id: string) {
    const alreadySelected = selected === id;
    setSelected(id);
    setFirst(id);
    window.requestAnimationFrame(() => {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      const target = sectionRefs.current[id];
      if (alreadySelected && target) {
        const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--site-header-visible-height")) || 0;
        const navigation = navigationRef.current?.parentElement?.getBoundingClientRect().height || 0;
        window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - header - navigation, behavior });
      } else navigationRef.current?.scrollIntoView({ behavior, block: "start" });
      navigationRef.current?.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ behavior, block: "nearest", inline: "center" });
    });
  }
  const ordered = first ? [...sections.filter(section => section.id === first), ...sections.filter(section => section.id !== first)] : sections;
  return <>
    <div className="ski-area-masthead">
    {hero}
    <div className={`v3-navigation-shell ski-area-navigation${edges.left ? " has-left-overflow" : ""}${edges.right ? " has-right-overflow" : ""}`}>
      <nav ref={navigationRef} className="v3-navigation" aria-label="Rubriques du domaine skiable">
        {sections.map(section => <button key={section.id} data-section={section.id} type="button" aria-pressed={selected === section.id} aria-label={section.label} aria-controls={`domaine-${section.id}`} onClick={() => select(section.id)}>
          <span className="v3-label-desktop">{section.label}</span><span className="v3-label-mobile" aria-hidden="true">{section.mobileLabel || section.label}</span>
        </button>)}
      </nav>
    </div>
    </div>
    <div className="ski-area-floors">
      {ordered.map(section => <div key={section.id} id={`domaine-${section.id}`} ref={element => { sectionRefs.current[section.id] = element; }}>{section.content}</div>)}
    </div>
    <style jsx global>{`
      .ski-area-masthead{overflow:hidden;border-radius:28px;background:#fff}
      .ski-area-masthead .ski-area-hero{margin:0;border-radius:0}
      .ski-area-masthead .ski-area-navigation{position:relative;top:auto;background:#fff;border:0;backdrop-filter:none}
      .ski-area-navigation .v3-navigation{padding-inline:12px}
      .ski-area-floors{display:grid;gap:24px;margin-top:24px;min-width:0}
      .ski-area-floors>div{min-width:0}
      .ski-area-floors .ski-area-overview{display:grid;gap:20px}
      .ski-area-floors .ski-area-map-section,.ski-area-floors .ski-area-members{padding:22px;border:1px solid var(--line);border-radius:20px;background:#fff}
    `}</style>
  </>;
}
