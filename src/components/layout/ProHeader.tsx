import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2, MapPin, Menu, Search, UserRound, X } from "lucide-react";

type Resort = {
  id?: string;
  name: string;
  slug: string;
  is_active?: boolean;
  region?: { name?: string };
  department?: { name?: string };
};

const navItems = [
  { label: "Stations", href: "/stations", kind: "stations" },
  { label: "Météo", href: "/meteo" },
  { label: "Forfaits", href: "/forfaits" },
  { label: "Plan des pistes", href: "/plan-des-pistes" },
  { label: "Contact", href: "/contact" },
];

export default function ProHeader() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Resort[]>([]);
  const [stations, setStations] = useState<Resort[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [stationsOpen, setStationsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stationsFilter, setStationsFilter] = useState("");
  const [cursor, setCursor] = useState(-1);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const searchRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const stationsRef = useRef<HTMLDivElement | null>(null);
  const mobileCloseRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingSearch(true);
    const timer = setTimeout(async () => {
      try {
        const url = query.trim() ? `/api/ski/resorts/?q=${encodeURIComponent(query.trim())}` : "/api/ski/resorts/";
        const res = await fetch(url);
        if (!res.ok) throw new Error("search_failed");
        const data = await res.json();
        const activeOnly = Array.isArray(data) ? data.filter((x: Resort) => x?.is_active !== false && x?.is_active !== null) : [];
        if (!cancelled) setResults(activeOnly.slice(0, 8));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoadingSearch(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    async function loadStations() {
      try {
        const res = await fetch("/api/ski/resorts/");
        if (!res.ok) throw new Error("load_failed");
        const data = await res.json();
        const activeOnly = Array.isArray(data) ? data.filter((x: Resort) => x?.is_active !== false && x?.is_active !== null) : [];
        if (!cancelled) setStations(activeOnly);
      } catch { if (!cancelled) setStations([]); }
    }
    loadStations();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 12); }
    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
      if (accountRef.current && !accountRef.current.contains(target)) setAccountOpen(false);
      if (stationsRef.current && !stationsRef.current.contains(target)) setStationsOpen(false);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mousedown", onDocClick);
    return () => { window.removeEventListener("scroll", onScroll); document.removeEventListener("mousedown", onDocClick); };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileCloseRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    function closeOnNavigation() { setMobileOpen(false); }

    document.addEventListener("keydown", closeOnEscape);
    router.events.on("routeChangeStart", closeOnNavigation);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      router.events.off("routeChangeStart", closeOnNavigation);
    };
  }, [mobileOpen, router.events]);

  const filteredResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return results;
    return results.filter((station) => `${station?.name || ""} ${station?.region?.name || ""} ${station?.department?.name || ""}`.toLowerCase().includes(needle));
  }, [query, results]);

  const stationsByLetter = useMemo(() => {
    const needle = stationsFilter.trim().toLowerCase();
    const filtered = stations.filter((station) => !needle || `${station?.name || ""} ${station?.region?.name || ""} ${station?.department?.name || ""}`.toLowerCase().includes(needle)).sort((a, b) => (a?.name || "").localeCompare(b?.name || "", "fr"));
    const map = new Map<string, Resort[]>();
    filtered.forEach((station) => {
      const first = (station?.name || "").trim().charAt(0).toUpperCase();
      const letter = /[A-ZÀ-ÖØ-Ý]/.test(first) ? first : "#";
      map.set(letter, [...(map.get(letter) || []), station]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "fr"));
  }, [stations, stationsFilter]);

  function goToStation(station: Resort) {
    if (!station?.slug) return;
    router.push(`/stations/${station.slug}`);
    setSearchOpen(false); setStationsOpen(false); setMobileOpen(false);
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!searchOpen && (event.key === "ArrowDown" || event.key === "Enter")) { setSearchOpen(true); return; }
    if (!searchOpen) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setCursor((c) => Math.min(c + 1, filteredResults.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (event.key === "Enter") { event.preventDefault(); const station = filteredResults[cursor] || filteredResults[0]; if (station) goToStation(station); }
    else if (event.key === "Escape") { setSearchOpen(false); setCursor(-1); }
  }

  return (
    <header className={`site-header ${scrolled ? "site-header--compact" : ""}`}>
      <div className="site-header__bar">
        <Link href="/" className="brand" aria-label="Accueil Snow Explorer">
          <Image src="/logo.png" alt="Snow Explorer" width={48} height={48} priority />
          <span><strong>Snow Explorer</strong><small>Stations, neige et météo</small></span>
        </Link>

        <div className="global-search" ref={searchRef}>
          <label className="sr-only" htmlFor="global-station-search">Rechercher une station, ville ou destination</label>
          <Search className="global-search__icon" size={20} aria-hidden="true" />
          <input id="global-station-search" role="combobox" aria-autocomplete="list" value={query} onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); setCursor(-1); }} onFocus={() => setSearchOpen(true)} onKeyDown={onSearchKeyDown} placeholder="Station, ville, domaine skiable…" aria-expanded={searchOpen} aria-controls="global-search-results" autoComplete="off" />
          {loadingSearch && <Loader2 className="global-search__loader" size={18} aria-label="Recherche en cours" />}
          {searchOpen && (
            <div id="global-search-results" className="search-panel" role="listbox">
              <div className="search-panel__title">Suggestions</div>
              {filteredResults.length === 0 && <div className="empty-state empty-state--small"><Search size={18} />Aucune station trouvée. Essayez une région ou une autre orthographe.</div>}
              {filteredResults.map((station, index) => (
                <button key={station.id || `${station.slug}-${index}`} type="button" role="option" aria-selected={cursor === index} onClick={() => goToStation(station)} className={`search-result ${cursor === index ? "is-active" : ""}`}>
                  <span className="search-result__mark"><MapPin size={16} /></span><span><strong>{station.name}</strong><small>{station?.region?.name || station?.department?.name || "Station de ski"}</small></span><ChevronDown size={16} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="header-actions" ref={accountRef}>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => setAccountOpen((v) => !v)}><UserRound size={18} /> <span>Compte</span></button>
          <button type="button" className="mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen} aria-controls="mobile-navigation"><Menu /><span className="sr-only">Ouvrir le menu</span></button>
          {accountOpen && <div className="account-menu"><p className="eyebrow">Espace membre</p><button type="button" className="btn btn--secondary" onClick={() => router.push("/mon-compte")}>Aller à mon compte</button><label>Email<input type="email" placeholder="vous@exemple.fr" /></label><label>Mot de passe<input type="password" placeholder="••••••••" /></label><button type="button" className="btn btn--primary">Se connecter</button></div>}
        </div>
      </div>

      <nav className="desktop-nav desktop-nav--tier" aria-label="Navigation principale">
        <div className="desktop-nav__inner">
          {navItems.map((item) => item.href ? (
            <Link key={item.label} href={item.href} className="nav-link">{item.label}</Link>
          ) : (
            <span key={item.label} className="nav-link" aria-disabled="true">{item.label}</span>
          ))}
        </div>
      </nav>

      {mobileOpen && createPortal(
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title">
          <button type="button" className="mobile-menu__backdrop" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" />
          <div className="mobile-menu__panel" id="mobile-navigation">
            <div className="mobile-menu__header">
              <div><p className="eyebrow">Navigation</p><h2 id="mobile-menu-title">Explorer Snow Explorer</h2></div>
              <button ref={mobileCloseRef} type="button" className="mobile-menu__close" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu"><X /></button>
            </div>
            <nav className="mobile-nav" aria-label="Navigation mobile">
              {navItems.map((item) => <Link key={item.label} href={item.href} className="nav-link" onClick={() => setMobileOpen(false)}>{item.label}<span aria-hidden="true">›</span></Link>)}
            </nav>
          </div>
        </div>,
        document.body,
      )}

      <div ref={stationsRef}>{stationsOpen && <div className="stations-mega"><div className="stations-mega__head"><div><p className="eyebrow">Explorer</p><h2>Stations par nom</h2></div><label className="field field--compact"><span>Filtrer</span><input value={stationsFilter} onChange={(event) => setStationsFilter(event.target.value)} placeholder="Nom, région, département" /></label></div><div className="stations-grid">{stationsByLetter.length === 0 && <div className="empty-state">Aucune station trouvée</div>}{stationsByLetter.map(([letter, letterStations]) => <section key={letter} className="station-letter"><h3>{letter}</h3>{letterStations.slice(0, 12).map((station) => <button key={station.id || station.slug} type="button" onClick={() => goToStation(station)}>{station.name}<small>{station.region?.name || station.department?.name || ""}</small></button>)}</section>)}</div></div>}</div>
    </header>
  );
}
