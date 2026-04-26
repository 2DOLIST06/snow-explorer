import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [stations, setStations] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [stationsOpen, setStationsOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);

  const searchRef = useRef(null);
  const accountRef = useRef(null);
  const stationsRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(query.trim() ? `/api/ski/resorts/?q=${encodeURIComponent(query.trim())}` : "/api/ski/resorts/");
        if (!res.ok) throw new Error("search_failed");
        const data = await res.json();
        if (!cancelled) setResults(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 200);

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
    function onDocClick(event) {
      const target = event.target;
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
      if (accountRef.current && !accountRef.current.contains(target)) setAccountOpen(false);
      if (stationsRef.current && !stationsRef.current.contains(target)) setStationsOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const groups = useMemo(() => {
    const map = new Map();
    stations.forEach((station) => {
      const zone = station?.department?.name || station?.region?.name || "Autres stations";
      const current = map.get(zone) || [];
      current.push(station);
      map.set(zone, current);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, "fr"))
      .map(([zone, items]) => ({
        zone,
        items: items.sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr")),
      }));
  }, [stations]);

  function goToStation(station) {
    if (!station?.slug) return;
    router.push(`/stations/${station.slug}`);
    setSearchOpen(false);
    setStationsOpen(false);
  }

  function onSearchKeyDown(event) {
    if (!searchOpen && (event.key === "ArrowDown" || event.key === "Enter")) {
      setSearchOpen(true);
      return;
    }
    if (!searchOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const station = results[cursor] || results[0];
      if (station) goToStation(station);
    } else if (event.key === "Escape") {
      setSearchOpen(false);
      setCursor(-1);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div className="topRow">
          <div className="brand" onClick={() => router.push("/")} role="button" tabIndex={0}>
            <img src="/logo.png" alt="Snow Explorer" className="logo" />
            <div>
              <div className="brandTitle">Snow Explorer</div>
              <div className="brandTag">Votre guide montagne premium</div>
            </div>
          </div>

          <div className="searchWrap" ref={searchRef}>
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
              className="searchInput"
            />
            {searchOpen && (
              <div className="searchDropdown" role="listbox">
                {results.length === 0 && <div className="muted">Aucune station trouvée</div>}
                {results.map((station, index) => (
                  <button
                    key={station.id || `${station.slug}-${index}`}
                    type="button"
                    onClick={() => goToStation(station)}
                    className="resultBtn"
                    style={{ background: cursor === index ? "#eff6ff" : "white" }}
                  >
                    <span>{station.name}</span>
                    <span className="muted">{station?.region?.name || station?.department?.name || ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="account" ref={accountRef}>
            <button type="button" className="accountBtn" onClick={() => setAccountOpen((v) => !v)}>
              Mon compte ▾
            </button>
            {accountOpen && (
              <div className="accountDropdown">
                <button type="button" className="fullBtn" onClick={() => router.push("/mon-compte")}>Aller à mon compte</button>
                <div className="split">ou se connecter</div>
                <input type="email" placeholder="Email" className="field" />
                <input type="password" placeholder="Mot de passe" className="field" />
                <button type="button" className="fullBtn primary">Se connecter</button>
              </div>
            )}
          </div>
        </div>

        <div className="bottomRow" ref={stationsRef}>
          <button type="button" className="tab active" onClick={() => setStationsOpen((v) => !v)}>
            Stations
          </button>
          <button type="button" className="tab">Météo</button>
          <button type="button" className="tab">Forfaits</button>
          <button type="button" className="tab">Activités</button>
          <button type="button" className="tab">Bons plans</button>
          <button type="button" className="tab">Contact</button>
        </div>

        {stationsOpen && (
          <div className="megaMenu">
            {groups.length === 0 ? (
              <div className="muted">Chargement des stations...</div>
            ) : (
              groups.map((group) => (
                <div key={group.zone} className="group">
                  <h3>{group.zone}</h3>
                  <div className="links">
                    {group.items.map((station) => (
                      <button
                        key={station.id || station.slug}
                        type="button"
                        onClick={() => goToStation(station)}
                        className="stationLink"
                      >
                        {station.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </header>

      <main className="hero">
        <div className="overlay" />
        <div className="content">
          <h1>Snow Explorer arrive bientôt</h1>
          <p>
            Un nouveau guide des stations de ski se prépare. Comparez les domaines,
            les conditions et les bonnes adresses pour organiser vos séjours à la neige.
          </p>
        </div>
      </main>

      <style jsx>{`
        .page { min-height: 100vh; background: #eaf2ff; }
        .header {
          position: sticky; top: 0; z-index: 40;
          background: linear-gradient(100deg, #0f172a, #1d4ed8 65%, #0284c7);
          box-shadow: 0 12px 30px rgba(2, 6, 23, 0.28);
        }
        .topRow {
          max-width: 1380px; margin: 0 auto; padding: 18px 22px;
          display: grid; grid-template-columns: 300px minmax(260px, 1fr) 220px;
          gap: 16px; align-items: center;
        }
        .brand { display: flex; gap: 10px; color: white; align-items: center; cursor: pointer; }
        .logo { width: 62px; height: 62px; object-fit: contain; }
        .brandTitle { font-size: 24px; font-weight: 900; line-height: 1; }
        .brandTag { opacity: 0.9; font-size: 13px; }
        .searchWrap { position: relative; }
        .searchInput {
          width: 100%; border: 1px solid rgba(255,255,255,0.45); border-radius: 14px;
          padding: 14px 16px; font-size: 16px; background: rgba(255,255,255,0.97);
          outline: none;
        }
        .searchDropdown {
          position: absolute; top: calc(100% + 8px); left: 0; right: 0; max-height: 300px; overflow: auto;
          background: white; border-radius: 12px; border: 1px solid #dbeafe; box-shadow: 0 12px 24px rgba(2,6,23,.16);
        }
        .resultBtn {
          width: 100%; border: 0; background: white; text-align: left; padding: 11px 12px;
          display: flex; align-items: center; justify-content: space-between; cursor: pointer;
          border-bottom: 1px solid #eff6ff;
        }
        .account { position: relative; }
        .accountBtn {
          width: 100%; border-radius: 12px; padding: 12px 14px; font-weight: 700; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.5); color: white; background: rgba(255,255,255,0.12);
        }
        .accountDropdown {
          position: absolute; right: 0; top: calc(100% + 8px); width: 290px; background: white;
          border-radius: 12px; border: 1px solid #dbeafe; padding: 12px; box-shadow: 0 12px 24px rgba(2,6,23,.2);
          display: grid; gap: 8px;
        }
        .field { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 14px; }
        .fullBtn { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; cursor: pointer; background: white; font-weight: 600; }
        .fullBtn.primary { background: #2563eb; color: white; border-color: #2563eb; }
        .split { font-size: 12px; color: #64748b; text-align: center; }
        .bottomRow {
          max-width: 1380px; margin: 0 auto; padding: 0 22px 16px;
          display: flex; gap: 10px; flex-wrap: wrap;
        }
        .tab {
          border: 1px solid rgba(255,255,255,0.34); color: white; background: rgba(255,255,255,0.1);
          border-radius: 999px; padding: 10px 14px; font-weight: 700; cursor: pointer;
        }
        .tab.active { background: rgba(255,255,255,0.2); }
        .megaMenu {
          width: 100%; background: white; border-top: 1px solid #dbeafe;
          padding: 16px 22px 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;
          max-height: 58vh; overflow: auto;
        }
        .group h3 { margin: 0 0 8px; font-size: 14px; color: #1e3a8a; }
        .links { display: grid; gap: 4px; }
        .stationLink { border: 0; background: transparent; text-align: left; padding: 3px 0; cursor: pointer; color: #0f172a; }
        .stationLink:hover { color: #2563eb; }
        .muted { color: #64748b; padding: 10px; font-size: 14px; }
        .hero {
          min-height: calc(100vh - 164px);
          background: url("https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg") center/cover no-repeat;
          position: relative; display: flex; align-items: center;
        }
        .overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(2,6,23,0.62), rgba(2,6,23,0.45)); }
        .content { position: relative; z-index: 1; color: white; max-width: 900px; padding: 40px 24px; margin: 0 auto; text-align: center; }
        .content h1 { margin: 0 0 12px; font-size: clamp(2rem, 5vw, 3.8rem); }
        .content p { margin: 0; font-size: 18px; line-height: 1.5; }

        @media (max-width: 980px) {
          .topRow { grid-template-columns: 1fr; }
          .accountDropdown { left: 0; right: auto; }
        }
      `}</style>
    </div>
  );
}
