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
          position: "relative",
          color: "#0f172a",
        }}
      >
        <div style={{ position: "fixed", inset: 0 }}>
          <Image
            src="https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg"
            alt="Séjour au ski – Page d’accueil"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(2,6,23,0.80) 0%, rgba(15,23,42,0.45) 30%, rgba(15,23,42,0.20) 55%, rgba(248,250,252,0.95) 100%)",
            }}
          />
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            padding: "20px 24px 80px",
          }}
        >
          <header
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.35)",
              background: "rgba(15,23,42,0.45)",
              backdropFilter: "blur(12px)",
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "white",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: 0.3 }}>Snow Explorer</div>
            <nav style={{ display: "flex", alignItems: "center", gap: 10 }} ref={menuRef}>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.45)",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.1)",
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
                    background: "rgba(255,255,255,0.08)",
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
              maxWidth: 1120,
              margin: "34px auto 0",
            }}
          >
            <div
              style={{
                padding: "48px 24px 40px",
                borderRadius: 28,
                background: "rgba(15,23,42,0.52)",
                border: "1px solid rgba(255,255,255,0.28)",
                backdropFilter: "blur(8px)",
                textAlign: "center",
              }}
            >
              <h1
                style={{
                  color: "white",
                  fontWeight: 800,
                  fontSize: "clamp(2rem, 5vw, 3.2rem)",
                  lineHeight: 1.1,
                  marginBottom: 14,
                  textShadow: "0 3px 12px rgba(0,0,0,0.35)",
                }}
              >
                Une page d’accueil premium pour vos séjours à la montagne
              </h1>

              <p
                style={{
                  color: "rgba(255,255,255,0.95)",
                  opacity: 0.95,
                  fontSize: 18,
                  marginBottom: 24,
                  textShadow: "0 2px 8px rgba(0,0,0,0.35)",
                  maxWidth: 760,
                  marginInline: "auto",
                }}
              >
                Recherchez une station en quelques secondes puis découvrez des rubriques élégantes prêtes à être associées
                à vos futurs contenus.
              </p>

              <div style={{ position: "relative", width: "100%", maxWidth: 840, margin: "0 auto" }} ref={boxRef}>
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
          </section>

          <section
            style={{
              maxWidth: 1120,
              margin: "28px auto 0",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {[
              { title: "Meilleures stations", text: "Un top dynamique des stations les plus recherchées." },
              { title: "Meilleures activités", text: "Ski, snowpark, luge, spa, randonnée et plus encore." },
              { title: "Idées de séjours", text: "Des blocs éditoriaux pour week-end, famille, expert, détente." },
              { title: "Rubriques à associer", text: "Espace prévu pour vos futurs modules personnalisés." },
            ].map((card) => (
              <article
                key={card.title}
                style={{
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(148,163,184,0.35)",
                  padding: "20px 18px",
                  boxShadow: "0 8px 24px rgba(2,6,23,0.08)",
                }}
              >
                <h2 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>{card.title}</h2>
                <p style={{ margin: "10px 0 0", color: "#334155", lineHeight: 1.45 }}>{card.text}</p>
              </article>
            ))}
          </section>
        </div>
      </main>
    </>
  );
};

export default Home;
