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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<number>(-1);
  const boxRef = useRef<HTMLDivElement | null>(null);
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

  // fermeture au clic extérieur
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
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
          overflow: "hidden",
        }}
      >
        {/* HERO */}
        <div style={{ position: "absolute", inset: 0 }}>
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
                "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0) 60%)",
            }}
          />
        </div>

        {/* CONTENU */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "75vh",
            padding: "0 16px",
          }}
        >
          <div style={{ width: "100%", maxWidth: 820 }} ref={boxRef}>
            <h1
              style={{
                color: "white",
                textAlign: "center",
                fontWeight: 800,
                fontSize: 42,
                lineHeight: 1.15,
                marginBottom: 16,
                textShadow: "0 2px 8px rgba(0,0,0,0.35)",
              }}
            >
              Préparez votre prochain séjour dans les stations de ski
            </h1>

            <p
              style={{
                color: "white",
                textAlign: "center",
                opacity: 0.95,
                fontSize: 18,
                marginBottom: 18,
                textShadow: "0 2px 8px rgba(0,0,0,0.35)",
              }}
            >
              Tapez pour filtrer et choisissez votre station.
            </p>

            {/* Champ + menu déroulant */}
            <div style={{ position: "relative" }}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Recherchez une station (ex. Auron, Val Thorens, …)"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); setCursor(-1); }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                style={{
                  width: "100%",
                  padding: "16px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.6)",
                  background: "rgba(255,255,255,0.95)",
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
        </div>
      </main>
    </>
  );
};

export default Home;
