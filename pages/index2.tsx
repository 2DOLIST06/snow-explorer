// src/pages/index.tsx
import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

type Resort = {
  id: string;
  name: string;
  slug: string;
  region?: { name?: string };
};

const Home: NextPage = () => {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Resort[]>([]);
  const [allResorts, setAllResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<number>(-1);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Récupère les stations côté API (proxy Next si configuré, sinon direct)
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001";
  const fetchUrl = useMemo(() => {
    const base = typeof window !== "undefined" ? "/api/ski/resorts/" : `${apiBase}/api/resorts/`;
    const q = query.trim();
    return q ? `${base}?q=${encodeURIComponent(q)}` : base;
  }, [apiBase, query]);

  // debounce simple
  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(fetchUrl);
        if (!r.ok) throw new Error("failed");
        const data: Resort[] = await r.json();
        if (!cancel) setItems(data);
      } catch {
        if (!cancel) setItems([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [fetchUrl]);

  useEffect(() => {
    let cancel = false;
    async function loadAllResorts() {
      try {
        const base = typeof window !== "undefined" ? "/api/ski/resorts/" : `${apiBase}/api/resorts/`;
        const r = await fetch(base);
        if (!r.ok) throw new Error("failed");
        const data: Resort[] = await r.json();
        if (!cancel) setAllResorts(data);
      } catch {
        if (!cancel) setAllResorts([]);
      }
    }
    loadAllResorts();
    return () => { cancel = true; };
  }, [apiBase]);

  const resortsByRegion = useMemo(() => {
    const grouped = new Map<string, Resort[]>();
    allResorts.forEach((resort) => {
      const region = resort.region?.name?.trim() || "Autres régions";
      const existing = grouped.get(region) || [];
      existing.push(resort);
      grouped.set(region, existing);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b, "fr"))
      .map(([region, resorts]) => ({
        region,
        resorts: resorts
          .sort((a, b) => a.name.localeCompare(b.name, "fr"))
          .slice(0, 8),
      }));
  }, [allResorts]);

  const featuredResorts = useMemo(() => {
    const source = allResorts.length > 0 ? allResorts : items;
    return source.slice(0, 6);
  }, [allResorts, items]);

  // fermeture au clic extérieur
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = items[cursor] || items[0];
      if (picked) handlePick(picked);
    } else if (e.key === "Escape") {
      setOpen(false);
      setCursor(-1);
    }
  }

  function handlePick(r: Resort) {
    setQuery(r.name);
    setOpen(false);
    setCursor(-1);
    // Redirige vers la page station (à créer ensuite)
    router.push(`/stations/${r.slug}`);
  }

  return (
    <>
      <Head>
        <title>Préparez votre prochain séjour dans les stations de ski – 2dolist</title>
        <meta name="description" content="Recherchez une station et organisez votre séjour à la montagne." />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #e2e8f0 0%, #f8fafc 35%, #eef2ff 100%)",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            padding: "20px 24px 80px",
          }}
        >
          <section
            style={{
              maxWidth: 1200,
              margin: "0 auto 12px",
              borderRadius: 14,
              padding: "8px 14px",
              background: "linear-gradient(90deg, #0ea5e9 0%, #2563eb 100%)",
              color: "white",
              fontWeight: 600,
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>Ouverture hiver 2026 : comparez les stations en un clin d’œil.</span>
            <span style={{ opacity: 0.9 }}>Météo • Webcams • Forfaits • Activités</span>
          </section>

          <header
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              borderRadius: 24,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "linear-gradient(120deg, #0f172a 0%, #1e3a8a 100%)",
              padding: "14px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "white",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Image src="/logo.png" alt="Snow Explorer logo" width={38} height={38} />
              <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: 0.3 }}>Snow Explorer</div>
            </div>
            <nav style={{ display: "flex", alignItems: "center", gap: 10 }} ref={menuRef}>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.45)",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.15)",
                    color: "white",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Stations ▾
                </button>
                {menuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      width: 460,
                      maxWidth: "92vw",
                      maxHeight: 360,
                      overflow: "auto",
                      borderRadius: 16,
                      border: "1px solid #e2e8f0",
                      background: "white",
                      color: "#0f172a",
                      padding: 14,
                      boxShadow: "0 18px 40px rgba(0,0,0,0.2)",
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                      zIndex: 10,
                    }}
                  >
                    {resortsByRegion.map((group) => (
                      <div key={group.region}>
                        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.2, color: "#475569" }}>
                          {group.region}
                        </div>
                        <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                          {group.resorts.map((resort) => (
                            <button
                              key={resort.id}
                              type="button"
                              onClick={() => handlePick(resort)}
                              style={{
                                textAlign: "left",
                                border: "none",
                                background: "transparent",
                                padding: "4px 0",
                                color: "#0f172a",
                                cursor: "pointer",
                              }}
                            >
                              {resort.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {["Activités", "Offres", "Guides", "Webcams"].map((item) => (
                <button
                  key={item}
                  type="button"
                  style={{
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.35)",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.13)",
                    color: "white",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {item}
                </button>
              ))}
            </nav>
          </header>

          <section
            style={{
              maxWidth: 1200,
              margin: "14px auto 0",
              borderRadius: 20,
              border: "1px solid rgba(148,163,184,0.3)",
              background: "rgba(255,255,255,0.78)",
              backdropFilter: "blur(4px)",
              padding: "12px 16px",
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {["Stations premium", "Comparateur forfaits", "Activités famille", "Neige en direct", "Guides & bons plans", "Séjours week-end"].map((rubrique) => (
              <button
                key={rubrique}
                type="button"
                style={{
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  padding: "9px 12px",
                  color: "#0f172a",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {rubrique}
              </button>
            ))}
          </section>

          <section
            style={{
              maxWidth: 1120,
              margin: "20px auto 0",
            }}
          >
            <div
              style={{
                padding: "48px 24px 40px",
                borderRadius: 28,
                background: "linear-gradient(130deg, #0f172a 0%, #1d4ed8 52%, #06b6d4 100%)",
                border: "1px solid rgba(59,130,246,0.45)",
                color: "white",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 24,
                alignItems: "center",
              }}
            >
              <div>
                <h1
                  style={{
                    color: "white",
                    fontWeight: 800,
                    fontSize: "clamp(2rem, 5vw, 3.1rem)",
                    lineHeight: 1.1,
                    marginBottom: 14,
                  }}
                >
                  Le guide complet des stations de ski françaises
                </h1>

                <p
                  style={{
                    color: "rgba(255,255,255,0.95)",
                    fontSize: 18,
                    marginBottom: 24,
                    maxWidth: 620,
                  }}
                >
                  Stations triées par région, météo, activités, webcams et forfaits : tout est prêt pour construire une
                  expérience premium.
                </p>

                <div style={{ position: "relative", width: "100%", maxWidth: 760 }} ref={boxRef}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Recherchez une station (ex. Auron, Val Thorens, Chamonix…)"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); setCursor(-1); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    style={{
                      width: "100%",
                      padding: "18px 20px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.6)",
                      background: "rgba(255,255,255,0.96)",
                      fontSize: 18,
                      outline: "none",
                    }}
                  />

                  {open && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: 8,
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        background: "#fff",
                        maxHeight: 320,
                        overflowY: "auto",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                      }}
                      role="listbox"
                    >
                      {loading && (
                        <div style={{ padding: 12, color: "#666" }}>Chargement…</div>
                      )}

                      {!loading && items.length === 0 && (
                        <div style={{ padding: 12, color: "#666" }}>Aucun résultat</div>
                      )}

                      {!loading &&
                        items.map((r, i) => (
                          <div
                            key={r.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handlePick(r)}
                            role="option"
                            aria-selected={cursor === i}
                            style={{
                              padding: "12px 14px",
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              cursor: "pointer",
                              background: cursor === i ? "#f3f4f6" : "#fff",
                              borderBottom: "1px solid #f3f4f6",
                            }}
                            onMouseEnter={() => setCursor(i)}
                          >
                            <div style={{ fontWeight: 600 }}>{r.name}</div>
                            <div style={{ color: "#6b7280" }}>{r.region?.name || ""}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  position: "relative",
                  borderRadius: 20,
                  overflow: "hidden",
                  minHeight: 280,
                  border: "1px solid rgba(255,255,255,0.25)",
                  boxShadow: "0 12px 30px rgba(2,6,23,0.25)",
                }}
              >
                <Image
                  src="/images/plan-pistes-auron.png"
                  alt="Plan de pistes"
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 420px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            </div>
          </section>

          <section
            style={{
              maxWidth: 1200,
              margin: "24px auto 0",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 18,
            }}
          >
            <article
              style={{
                borderRadius: 20,
                background: "rgba(255,255,255,0.92)",
                border: "1px solid rgba(148,163,184,0.35)",
                padding: 20,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 24 }}>Top stations du moment</h2>
              <p style={{ margin: "8px 0 16px", color: "#475569" }}>
                Sélection éditoriale inspirée de vos pages stations, météo et activités.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {featuredResorts.map((resort) => (
                  <button
                    key={resort.id}
                    type="button"
                    onClick={() => handlePick(resort)}
                    style={{
                      borderRadius: 14,
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      padding: "12px 14px",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{resort.name}</div>
                    <div style={{ color: "#64748b", marginTop: 4 }}>{resort.region?.name || "Région à définir"}</div>
                  </button>
                ))}
              </div>
            </article>

            <article
              style={{
                borderRadius: 20,
                background: "rgba(255,255,255,0.92)",
                border: "1px solid rgba(148,163,184,0.35)",
                padding: 20,
                display: "grid",
                gap: 12,
                alignContent: "start",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 22 }}>Rubriques à enrichir</h2>
              {["Meilleures activités", "Forfaits & promos", "Snowparks", "Webcams live", "Séjours famille"].map((bloc) => (
                <div
                  key={bloc}
                  style={{
                    borderRadius: 12,
                    border: "1px dashed #94a3b8",
                    padding: "12px 10px",
                    color: "#1e293b",
                    fontWeight: 600,
                    background: "#f8fafc",
                  }}
                >
                  {bloc}
                </div>
              ))}
            </article>
          </section>

          <section
            style={{
              maxWidth: 1200,
              margin: "18px auto 0",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                title: "Expériences neige",
                text: "Ski alpin, raquettes, snowboard, détente spa et soirées en altitude.",
              },
              {
                title: "Préparer son séjour",
                text: "Hébergements, transports, location matériel et checklist départ.",
              },
              {
                title: "Actualités stations",
                text: "Neige fraîche, ouvertures de domaines et conditions en direct.",
              },
            ].map((card) => (
              <article
                key={card.title}
                style={{
                  borderRadius: 18,
                  background: "#ffffffcc",
                  border: "1px solid #cbd5e1",
                  padding: "16px 14px",
                }}
              >
                <h3 style={{ margin: 0, fontSize: 19 }}>{card.title}</h3>
                <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.5 }}>{card.text}</p>
              </article>
            ))}
          </section>

          <footer
            style={{
              maxWidth: 1200,
              margin: "22px auto 0",
              borderRadius: 16,
              border: "1px solid #cbd5e1",
              background: "rgba(255,255,255,0.7)",
              padding: "14px 16px",
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
              color: "#334155",
            }}
          >
            <span style={{ fontWeight: 600 }}>Snow Explorer</span>
            <span>Prototype homepage premium — modules prêts à connecter</span>
          </footer>
        </div>
      </main>
    </>
  );
};

export default Home;
