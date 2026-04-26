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
  imageUrl?: string;
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
  const heroSlides = useMemo(
    () => [
      "https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg",
      "https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg",
      "https://d38x6kuhd141c9.cloudfront.net/page-accueil-ski.jpg",
    ],
    [],
  );

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

  const featuredResortsWithImage = useMemo(
    () =>
      featuredResorts.map((resort, index) => ({
        ...resort,
        imageUrl: resort.imageUrl || heroSlides[index % heroSlides.length],
      })),
    [featuredResorts, heroSlides],
  );

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
          background: "linear-gradient(180deg, #dbeafe 0%, #f8fafc 34%, #e2e8f0 100%)",
          color: "#0f172a",
        }}
      >
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            width: "100%",
            background: "linear-gradient(95deg, #0f172a 0%, #1d4ed8 62%, #0284c7 100%)",
            boxShadow: "0 8px 22px rgba(2,6,23,0.25)",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 1440,
              margin: "0 auto",
              padding: "16px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: "white" }}>
              <Image src="/logo.png" alt="Snow Explorer logo" width={56} height={56} />
              <div>
                <div style={{ fontWeight: 900, fontSize: 28, lineHeight: 1 }}>Snow Explorer</div>
                <div style={{ opacity: 0.9 }}>Le portail premium des stations françaises</div>
              </div>
            </div>

            <nav style={{ display: "flex", alignItems: "center", gap: 10 }} ref={menuRef}>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.55)",
                    padding: "12px 16px",
                    background: "rgba(255,255,255,0.14)",
                    color: "white",
                    fontWeight: 700,
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
                      width: 520,
                      maxWidth: "94vw",
                      maxHeight: 380,
                      overflow: "auto",
                      borderRadius: 16,
                      border: "1px solid #dbeafe",
                      background: "white",
                      color: "#0f172a",
                      padding: 14,
                      boxShadow: "0 22px 44px rgba(2,6,23,0.25)",
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                      zIndex: 40,
                    }}
                  >
                    {resortsByRegion.map((group) => (
                      <div key={group.region}>
                        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.2, color: "#475569" }}>
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
              {["Stations", "Activités", "Forfaits", "Guides", "Contact"].map((item) => (
                <button
                  key={item}
                  type="button"
                  style={{
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.35)",
                    padding: "12px 16px",
                    background: "rgba(255,255,255,0.11)",
                    color: "white",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <section style={{ width: "100%", minHeight: 560, position: "relative" }}>
          <Image
            src={heroSlides[0]}
            alt="Vue panoramique station de ski"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(2,6,23,0.62) 0%, rgba(2,6,23,0.25) 45%, rgba(2,6,23,0.72) 100%)",
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 3,
              maxWidth: 1240,
              margin: "0 auto",
              padding: "110px 24px 80px",
              color: "white",
            }}
          >
            <h1 style={{ margin: 0, fontSize: "clamp(2.3rem, 6vw, 4.2rem)", fontWeight: 900, lineHeight: 1.05 }}>
              Planifiez votre séjour ski avec une expérience premium
            </h1>
            <p style={{ marginTop: 14, maxWidth: 780, fontSize: 20, opacity: 0.95 }}>
              Comparez les stations, explorez les activités et trouvez la destination parfaite grâce à une interface
              visuelle grand format.
            </p>

            <div style={{ position: "relative", width: "100%", maxWidth: 880, marginTop: 26 }} ref={boxRef}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Rechercher une station (Auron, Chamonix, Val Thorens...)"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); setCursor(-1); }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                style={{
                  width: "100%",
                  padding: "20px 20px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.62)",
                  background: "rgba(255,255,255,0.96)",
                  fontSize: 19,
                  outline: "none",
                  boxShadow: "0 12px 28px rgba(2,6,23,0.2)",
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
      boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
    }}
    role="listbox"
  >
    {loading && <div style={{ padding: 12, color: "#666" }}>Chargement…</div>}
    {!loading && items.length === 0 && <div style={{ padding: 12, color: "#666" }}>Aucun résultat</div>}
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
          <div style={{ fontWeight: 700 }}>{r.name}</div>
          <div style={{ color: "#6b7280" }}>{r.region?.name || ""}</div>
        </div>
      ))}
  </div>
)}
          </div>
        </section>

        <div style={{ maxWidth: 1320, margin: "26px auto 0", padding: "0 24px" }}>
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>Top stations du moment</h2>
              <span style={{ color: "#475569", fontWeight: 600 }}>Faites glisser le diaporama →</span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                overflowX: "auto",
                paddingBottom: 6,
                scrollSnapType: "x mandatory",
              }}
            >
              {featuredResortsWithImage.map((resort) => (
                <button
                  key={resort.id}
                  type="button"
                  onClick={() => handlePick(resort)}
                  style={{
                    minWidth: 320,
                    maxWidth: 340,
                    width: "100%",
                    border: "none",
                    borderRadius: 18,
                    overflow: "hidden",
                    cursor: "pointer",
                    padding: 0,
                    boxShadow: "0 10px 24px rgba(2,6,23,0.16)",
                    position: "relative",
                    scrollSnapAlign: "start",
                  }}
                >
                  <div style={{ position: "relative", minHeight: 230 }}>
                    <Image src={resort.imageUrl || heroSlides[0]} alt={resort.name} fill sizes="340px" style={{ objectFit: "cover" }} />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(to top, rgba(2,6,23,0.75), rgba(2,6,23,0.15))",
                      }}
                    />
                    <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, color: "white", textAlign: "left" }}>
                      <div style={{ fontWeight: 900, fontSize: 24 }}>{resort.name}</div>
                      <div style={{ opacity: 0.92 }}>{resort.region?.name || "Région à définir"}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {[
              { title: "Expériences neige", text: "Ski alpin, raquettes, snowboard, spa et soirées en altitude." },
              { title: "Préparer son séjour", text: "Hébergements, transports, location matériel et checklist départ." },
              { title: "Actualités stations", text: "Neige fraîche, ouvertures de domaines et conditions en direct." },
              { title: "Webcams & météo live", text: "Retrouvez les images en direct et les tendances météo." },
            ].map((card) => (
              <article
                key={card.title}
                style={{
                  borderRadius: 18,
                  background: "#ffffffcc",
                  border: "1px solid #cbd5e1",
                  padding: "18px 16px",
                }}
              >
                <h3 style={{ margin: 0, fontSize: 22 }}>{card.title}</h3>
                <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.45 }}>{card.text}</p>
              </article>
            ))}
          </section>
        </div>

        <footer
          style={{
            marginTop: 36,
            width: "100%",
            background: "linear-gradient(90deg, #0f172a 0%, #1e293b 45%, #0f172a 100%)",
            color: "white",
            padding: "36px 24px 42px",
          }}
        >
          <div
            style={{
              maxWidth: 1320,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20,
              alignItems: "start",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Image src="/logo.png" alt="Logo Snow Explorer" width={44} height={44} />
              <div>
                <div style={{ fontWeight: 900, fontSize: 22 }}>Snow Explorer</div>
                <div style={{ opacity: 0.8 }}>Votre référence montagne</div>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Nous contacter</div>
              <div>contact@snowexplorer.fr</div>
              <div>+33 4 00 00 00 00</div>
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Navigation</div>
              <div>Stations</div>
              <div>Forfaits</div>
              <div>Activités</div>
            </div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Informations</div>
              <div>Mentions légales</div>
              <div>Politique de confidentialité</div>
              <div>Partenaires</div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
};

export default Home;
