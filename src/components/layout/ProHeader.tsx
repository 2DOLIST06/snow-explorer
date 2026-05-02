import Image from "next/image";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Resort = {
  id?: string;
  name: string;
  slug: string;
  region?: { name?: string };
  department?: { name?: string };
};

const navItems = ["Stations", "Météo", "Forfaits", "Activités", "Bons plans", "Contact"];

export default function ProHeader() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Resort[]>([]);
  const [stations, setStations] = useState<Resort[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [stationsOpen, setStationsOpen] = useState(false);
  const [stationsFilter, setStationsFilter] = useState("");
  const [cursor, setCursor] = useState(-1);

  const searchRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const stationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const url = query.trim() ? `/api/ski/resorts/?q=${encodeURIComponent(query.trim())}` : "/api/ski/resorts/";
        const res = await fetch(url);
        if (!res.ok) throw new Error("search_failed");
        const data = await res.json();
        if (!cancelled) setResults(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function loadStations() {
      try {
        const res = await fetch("/api/ski/resorts/");
        if (!res.ok) throw new Error("load_failed");
        const data = await res.json();
        if (!cancelled) setStations(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setStations([]);
      }
    }

    loadStations();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
      if (accountRef.current && !accountRef.current.contains(target)) setAccountOpen(false);
      if (stationsRef.current && !stationsRef.current.contains(target)) setStationsOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filteredResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return results;
    return results.filter((station) => {
      const haystack = `${station?.name || ""} ${station?.region?.name || ""} ${station?.department?.name || ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, results]);

  const stationsByLetter = useMemo(() => {
    const needle = stationsFilter.trim().toLowerCase();
    const filtered = stations
      .filter((station) => {
        if (!needle) return true;
        const haystack = `${station?.name || ""} ${station?.region?.name || ""} ${station?.department?.name || ""}`.toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => (a?.name || "").localeCompare(b?.name || "", "fr"));

    const map = new Map<string, Resort[]>();
    filtered.forEach((station) => {
      const first = (station?.name || "").trim().charAt(0).toUpperCase();
      const letter = /[A-ZÀ-ÖØ-Ý]/.test(first) ? first : "#";
      const current = map.get(letter) || [];
      current.push(station);
      map.set(letter, current);
    });

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "fr"));
  }, [stations, stationsFilter]);

  function goToStation(station: Resort) {
    if (!station?.slug) return;
    router.push(`/stations/${station.slug}`);
    setSearchOpen(false);
    setStationsOpen(false);
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!searchOpen && (event.key === "ArrowDown" || event.key === "Enter")) {
      setSearchOpen(true);
      return;
    }
    if (!searchOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, filteredResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const station = filteredResults[cursor] || filteredResults[0];
      if (station) goToStation(station);
    } else if (event.key === "Escape") {
      setSearchOpen(false);
      setCursor(-1);
    }
  }

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 60, background: "#ffffff", boxShadow: "0 12px 30px rgba(2,6,23,0.08)" }}>
      <div style={{ maxWidth: 1380, margin: "0 auto", padding: "16px 22px", display: "grid", gridTemplateColumns: "300px minmax(260px, 1fr) 220px", gap: 16, alignItems: "center" }}>
        <button type="button" onClick={() => router.push("/")} style={{ display: "flex", gap: 10, color: "#1d4ed8", alignItems: "center", cursor: "pointer", border: "none", background: "transparent", padding: 0, textAlign: "left" }}>
          <Image src="/logo.png" alt="Snow Explorer" width={62} height={62} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>Snow Explorer</div>
            <div style={{ color: "#1d4ed8", fontSize: 13 }}>Votre guide montagne premium</div>
          </div>
        </button>

        <div style={{ position: "relative", border: "1px solid #cbd5e1", borderRadius: 16, padding: 4, background: "#ffffff" }} ref={searchRef}>
          <input
            type="text"
            placeholder="Rechercher une station (Auron, Chamonix, Val Thorens...)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
              setCursor(-1);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={onSearchKeyDown}
            style={{ width: "100%", border: "1px solid #94a3b8", borderRadius: 12, padding: "14px 16px", fontSize: 16, background: "#ffffff", outline: "none" }}
          />
          {searchOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, maxHeight: 320, overflow: "auto", background: "white", borderRadius: 12, border: "1px solid #dbeafe", boxShadow: "0 12px 24px rgba(2,6,23,.16)", zIndex: 65 }} role="listbox">
              {filteredResults.length === 0 && <div style={{ padding: 12, color: "#64748b" }}>Aucune station trouvée</div>}
              {filteredResults.map((station, index) => (
                <button
                  key={station.id || `${station.slug}-${index}`}
                  type="button"
                  onClick={() => goToStation(station)}
                  style={{ width: "100%", border: 0, background: cursor === index ? "#eff6ff" : "white", textAlign: "left", padding: "11px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderBottom: "1px solid #eff6ff" }}
                >
                  <span>{station.name}</span>
                  <span style={{ color: "#64748b" }}>{station?.region?.name || station?.department?.name || ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: "relative" }} ref={accountRef}>
          <button type="button" style={{ width: "100%", borderRadius: 12, padding: "12px 14px", fontWeight: 700, cursor: "pointer", border: "1px solid #1d4ed8", color: "#ffffff", background: "#1d4ed8" }} onClick={() => setAccountOpen((v) => !v)}>
            Mon compte ▾
          </button>
          {accountOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 280, background: "white", borderRadius: 12, border: "1px solid #dbeafe", boxShadow: "0 16px 30px rgba(2,6,23,.22)", padding: 12, display: "grid", gap: 8, zIndex: 65 }}>
              <button type="button" style={{ border: "1px solid #1d4ed8", borderRadius: 10, padding: "10px 12px", background: "white", cursor: "pointer", fontWeight: 700 }} onClick={() => router.push("/mon-compte")}>Aller à mon compte</button>
              <div style={{ color: "#64748b", textAlign: "center", fontSize: 13 }}>ou se connecter</div>
              <input type="email" placeholder="Email" style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 12px" }} />
              <input type="password" placeholder="Mot de passe" style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 12px" }} />
              <button type="button" style={{ border: "none", borderRadius: 10, padding: "10px 12px", background: "#1d4ed8", color: "white", cursor: "pointer", fontWeight: 700 }}>Se connecter</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", background: "#ffffff" }} ref={stationsRef}>
        <div style={{ maxWidth: 1380, margin: "0 auto", padding: "12px 22px", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => item === "Stations" && setStationsOpen((v) => !v)}
              style={{ borderRadius: 999, border: "1px solid #cbd5e1", padding: "10px 16px", background: item === "Stations" ? "#eff6ff" : "#ffffff", color: "#0f172a", fontWeight: 700, cursor: "pointer" }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {stationsOpen && (
        <div style={{ background: "white", borderBottom: "1px solid #cbd5e1", boxShadow: "0 12px 26px rgba(15,23,42,.15)" }}>
          <div style={{ maxWidth: 1500, margin: "0 auto", width: "100%", padding: "18px 22px" }}>
            <input
              type="text"
              value={stationsFilter}
              onChange={(event) => setStationsFilter(event.target.value)}
              placeholder="Filtrer les stations (nom, région, département)"
              style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 15 }}
            />
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", alignItems: "start" }}>
              {stationsByLetter.length === 0 && <div style={{ color: "#64748b" }}>Aucune station trouvée</div>}
              {stationsByLetter.map(([letter, letterStations]) => (
                <div key={letter}>
                  <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16, fontWeight: 800 }}>{letter}</h3>
                <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                  {letterStations.map((station) => (
                    <button key={station.id || station.slug} type="button" onClick={() => goToStation(station)} style={{ textAlign: "left", border: "none", background: "transparent", padding: "4px 0", color: "#1e293b", cursor: "pointer" }}>
                      {station.name}
                    </button>
                  ))}
                </div>
              </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
