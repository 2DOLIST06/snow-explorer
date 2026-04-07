import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

const API = process.env.NEXT_PUBLIC_SKI_API_BASE || "http://127.0.0.1:5001";

type RegionRow = { id: string; name: string; country_code?: string };
type DepartmentRow = { code: string; name: string; region_id: string };

type ResortType = {
  id?: string;
  name?: string;
  slug?: string;
  latitude?: number | null;
  longitude?: number | null;
  website_url?: string | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
  description_md?: string | null;
  region_id?: string | null;
  department?: string | null;
  region?: { id?: string; name?: string; country_code?: string } | null;

  altitude_min_m?: number | null;
  altitude_max_m?: number | null;
  season_open_date?: string | null;
  season_close_date?: string | null;

  pistes_small_map_url?: string | null;
  pistes_large_map_url?: string | null;
};

type ForfaitColumn = {
  id: string;
  label: string;
};

type ForfaitItem = {
  id: string;
  title: string;
  prices: Record<string, string>;
};

// helpers
const toNumberOrNull = (v: string): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toIntOrZero = (v: string): number => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeLabelKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

const normalizeForfaitConfig = (rawForfaits: any): { enabled: boolean; columns: ForfaitColumn[]; items: ForfaitItem[] } => {
  const enabled = !!rawForfaits?.enabled;

  const columnMap = new Map<string, ForfaitColumn>();

  const ensureColumn = (rawLabel: unknown, rawId?: unknown): string => {
    const label = typeof rawLabel === "string" ? rawLabel.trim() : "";
    if (!label) {
      const fallbackId =
        typeof rawId === "string" && rawId.trim() !== "" ? rawId.trim() : createId("fc");
      if (!columnMap.has(fallbackId)) {
        columnMap.set(fallbackId, { id: fallbackId, label: "" });
      }
      return fallbackId;
    }

    const normalized = normalizeLabelKey(label);
    const existing = Array.from(columnMap.values()).find(
      (col) => normalizeLabelKey(col.label) === normalized
    );
    if (existing) return existing.id;

    const id =
      typeof rawId === "string" && rawId.trim() !== ""
        ? rawId.trim()
        : `fc-${normalized || Math.random().toString(36).slice(2, 8)}`;

    columnMap.set(id, { id, label });
    return id;
  };

  if (Array.isArray(rawForfaits?.columns)) {
    rawForfaits.columns.forEach((rawCol: any) => {
      ensureColumn(rawCol?.label, rawCol?.id);
    });
  }

  const rawItems = Array.isArray(rawForfaits?.items) ? rawForfaits.items : [];

  const items: ForfaitItem[] = rawItems.map((rawItem: any, itemIndex: number) => {
    const rowId =
      typeof rawItem?.id === "string" && rawItem.id.trim() !== ""
        ? rawItem.id
        : createId(`f${itemIndex + 1}`);

    const rowTitle = typeof rawItem?.title === "string" ? rawItem.title : "";
    const prices: Record<string, string> = {};

    if (rawItem?.prices && typeof rawItem.prices === "object" && !Array.isArray(rawItem.prices)) {
      Object.entries(rawItem.prices).forEach(([key, value]) => {
        const rawValue = typeof value === "string" ? value : "";
        const existingById = Array.from(columnMap.values()).find((col) => col.id === key);
        if (existingById) {
          prices[existingById.id] = rawValue;
          return;
        }

        const existingByLabel = Array.from(columnMap.values()).find(
          (col) => normalizeLabelKey(col.label) === normalizeLabelKey(key)
        );
        if (existingByLabel) {
          prices[existingByLabel.id] = rawValue;
          return;
        }

        const newId = ensureColumn(key);
        prices[newId] = rawValue;
      });
    }

    if (Array.isArray(rawItem?.columns)) {
      rawItem.columns.forEach((rawCol: any) => {
        const label = typeof rawCol?.label === "string" ? rawCol.label : "";
        const value = typeof rawCol?.value === "string" ? rawCol.value : "";
        if (!label.trim()) return;

        const colId = ensureColumn(label, rawCol?.id);
        prices[colId] = value;
      });
    }

    return {
      id: rowId,
      title: rowTitle,
      prices,
    };
  });

  const columns = Array.from(columnMap.values());

  return {
    enabled,
    columns,
    items,
  };
};

// === Helpers image (resize via Canvas) ===
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de charger l'image"));
    };
    img.src = url;
  });
}

async function resizeImageToWidth(
  file: File,
  targetWidth: number,
  mimeOut: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.85
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const w = (img as any).naturalWidth || img.width;
  const h = (img as any).naturalHeight || img.height;
  if (!w || !h) throw new Error("Dimensions image invalides");

  const outWidth = Math.min(targetWidth, w);
  const outHeight = Math.round((outWidth / w) * h);

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");

  if (mimeOut === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outWidth, outHeight);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, outWidth, outHeight);

  return await new Promise<Blob>((resolve, reject) => {
    if (mimeOut === "image/png") {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob PNG a échoué"))), "image/png");
    } else {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob JPEG a échoué"))), "image/jpeg", quality);
    }
  });
}

function getFileBaseAndExt(filename: string): { base: string; ext: string } {
  const i = filename.lastIndexOf(".");
  if (i <= 0) return { base: filename, ext: "" };
  return { base: filename.slice(0, i), ext: filename.slice(i + 1).toLowerCase() };
}

function buildSmallFilename(original: string, preferJpeg = true): string {
  const { base, ext } = getFileBaseAndExt(original);
  if (preferJpeg) return `${base}-small.jpg`;
  if (ext === "png") return `${base}-small.png`;
  return `${base}-small.jpg`;
}

// =========================
// UI helpers
// =========================
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#111827",
  } as React.CSSProperties,

  shell: {
    maxWidth: 1320,
    margin: "0 auto",
    padding: "24px 16px 24px",
    height: "calc(100vh - 88px)",
    overflow: "hidden",
  } as React.CSSProperties,

  topBar: {
    position: "sticky" as const,
    top: 0,
    zIndex: 30,
    background: "rgba(245,247,251,0.92)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid #e5e7eb",
    margin: "0 -16px 24px",
    padding: "14px 16px",
  },

  topBarInner: {
    maxWidth: 1320,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap" as const,
  },

  titleWrap: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },

  title: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.1,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  subtitle: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
    fontSize: 13,
    color: "#6b7280",
  },

  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    fontSize: 12,
    color: "#374151",
  } as React.CSSProperties,

  actionRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
    alignItems: "center",
  },

  primaryBtn: {
    border: "none",
    borderRadius: 10,
    background: "#111827",
    color: "#fff",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties,

  secondaryBtn: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#fff",
    color: "#111827",
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,

  ghostBtn: {
    border: "1px dashed #d1d5db",
    borderRadius: 10,
    background: "#fff",
    color: "#111827",
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,

  layout: {
    display: "grid",
    gridTemplateColumns: "280px minmax(0, 1fr)",
    gap: 20,
    alignItems: "start",
    height: "100%",
    minHeight: 0,
  } as React.CSSProperties,

  sidebar: {
    position: "sticky" as const,
    top: 0,
    display: "grid",
    gap: 12,
    alignSelf: "start",
    maxHeight: "100%",
    overflow: "auto",
    paddingRight: 4,
  } as React.CSSProperties,

  sidebarCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 8px 28px rgba(15,23,42,0.04)",
  } as React.CSSProperties,

  sectionLinkList: {
    display: "grid",
    gap: 8,
  },

  sectionLink: {
    display: "block",
    textDecoration: "none",
    color: "#374151",
    background: "#f9fafb",
    border: "1px solid #edf0f3",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    fontWeight: 600,
  } as React.CSSProperties,

  sectionLinkRow: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
} as React.CSSProperties,

sectionStatusOk: {
  width: 20,
  height: 20,
  minWidth: 20,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dcfce7",
  color: "#15803d",
  border: "1px solid #86efac",
  fontSize: 12,
  fontWeight: 800,
} as React.CSSProperties,

sectionStatusKo: {
  width: 20,
  height: 20,
  minWidth: 20,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#fee2e2",
  color: "#dc2626",
  border: "1px solid #fca5a5",
  fontSize: 12,
  fontWeight: 800,
} as React.CSSProperties,

  content: {
    display: "grid",
    gap: 18,
    height: "100%",
    minHeight: 0,
    overflowY: "auto",
    paddingRight: 6,
  } as React.CSSProperties,

  section: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 12px 34px rgba(15,23,42,0.05)",
  } as React.CSSProperties,

  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap" as const,
    marginBottom: 16,
  },

  sectionTitleWrap: {
    display: "grid",
    gap: 4,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 20,
    lineHeight: 1.2,
    fontWeight: 800,
    letterSpacing: "-0.01em",
  } as React.CSSProperties,

  sectionDesc: {
    margin: 0,
    color: "#6b7280",
    fontSize: 14,
  },

  sectionActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
  },

  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  } as React.CSSProperties,

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
  } as React.CSSProperties,

  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
  } as React.CSSProperties,

  stack: {
    display: "grid",
    gap: 14,
  } as React.CSSProperties,

  label: {
    display: "grid",
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
  } as React.CSSProperties,

  input: {
    width: "100%",
    minHeight: 44,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    fontSize: 14,
    outline: "none",
  } as React.CSSProperties,

  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    fontSize: 14,
    fontFamily: "monospace",
    outline: "none",
    resize: "vertical" as const,
  } as React.CSSProperties,

  checkboxRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fafafa",
  } as React.CSSProperties,

  helperBox: {
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    padding: 12,
    fontSize: 13,
    color: "#4b5563",
  } as React.CSSProperties,

  previewImage: {
    width: "100%",
    height: "auto",
    display: "block",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#fff",
  } as React.CSSProperties,

  previewLogo: {
    maxWidth: 180,
    maxHeight: 180,
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#fff",
    objectFit: "contain" as const,
    padding: 8,
  } as React.CSSProperties,

  splitPreview: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  } as React.CSSProperties,

  previewCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
    background: "#fff",
  } as React.CSSProperties,

  previewCardHeader: {
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: 12,
    fontWeight: 700,
    color: "#6b7280",
    background: "#fafafa",
  } as React.CSSProperties,

  lineItem: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 12,
    background: "#fcfcfd",
  } as React.CSSProperties,

  miniStats: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  } as React.CSSProperties,

  statBox: {
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#fff",
    padding: 12,
    display: "grid",
    gap: 6,
  } as React.CSSProperties,

  statLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  } as React.CSSProperties,

  statValue: {
    color: "#111827",
    fontSize: 15,
    fontWeight: 700,
  } as React.CSSProperties,

  alertInfo: {
    marginBottom: 16,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 600,
  } as React.CSSProperties,

  alertError: {
    marginBottom: 16,
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 600,
  } as React.CSSProperties,
};

function SectionCard({
  id,
  title,
  description,
  actions,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitleWrap}>
          <h2 style={styles.sectionTitle}>{title}</h2>
          {description ? <p style={styles.sectionDesc}>{description}</p> : null}
        </div>
        {actions ? <div style={styles.sectionActions}>{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function SaveButton({
  onClick,
  label = "Enregistrer",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button onClick={onClick} style={styles.primaryBtn}>
      {label}
    </button>
  );
}

export default function AdminStationEdit() {
  const router = useRouter();

  const slug =
    typeof router.query.slug === "string"
      ? router.query.slug
      : Array.isArray(router.query.slug)
      ? router.query.slug[0]
      : "";

  const [loading, setLoading] = useState(true);
  const [resort, setResort] = useState<ResortType | null>(null);
  const [widgets, setWidgets] = useState<any>({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);

  const ensureRegionInList = (
    list: RegionRow[],
    rid: string | null | undefined,
    rname?: string | null
  ): RegionRow[] => {
    if (!rid) return list;
    const has = list.some((x) => x.id.toLowerCase() === rid.toLowerCase());
    return has ? list : [...list, { id: rid, name: rname || rid, country_code: "FR" }];
  };

  const ensureDepartmentInList = (
    list: DepartmentRow[],
    dep: string | null | undefined,
    rid: string | null | undefined
  ): DepartmentRow[] => {
    if (!dep) return list;
    const has = list.some((x) => x.name === dep);
    return has ? list : [...list, { code: "", name: dep, region_id: (rid || "").toString() }];
  };

  const load = async (mySlug: string) => {
    if (!mySlug) {
      setErr("Slug manquant dans l’URL");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr("");

    try {
      let url = `${API}/api/admin/stations/${mySlug}`;
      let r = await fetch(url, { cache: "no-store" });

      if (!r.ok) {
        url = `${API}/api/admin/resorts/${mySlug}`;
        r = await fetch(url, { cache: "no-store" });
      }

      if (!r.ok) throw new Error(`HTTP ${r.status} (${url})`);

      const j = await r.json();

      const rcv: ResortType = j.resort || j;
      const normalized: ResortType = {
        ...rcv,
        region_id: rcv.region_id ?? rcv.region?.id ?? null,
        department: rcv.department ?? null,
        altitude_min_m: rcv.altitude_min_m ?? null,
        altitude_max_m: rcv.altitude_max_m ?? null,
        season_open_date: rcv.season_open_date ?? null,
        season_close_date: rcv.season_close_date ?? null,
        pistes_small_map_url: rcv.pistes_small_map_url ?? null,
        pistes_large_map_url: rcv.pistes_large_map_url ?? null,
      };

      setResort(normalized);

      const w = j.widgets || {};
      if (!w.pistes) w.pistes = {};
      if (!w.pistes.colors) w.pistes.colors = { green: 0, blue: 0, red: 0, black: 0 };
      if (!w.snowparks) w.snowparks = { count: 0 };
      if (!w.remontees) w.remontees = { tireFesses: 0, telesieges: 0, telepheriques: 0 };
      if (!w.forfaits) w.forfaits = { enabled: false, columns: [], items: [] };
w.forfaits = normalizeForfaitConfig(w.forfaits);
setWidgets(w);

      const rr = await fetch(`${API}/api/regions`, { cache: "no-store" });
      let regs: RegionRow[] = rr.ok ? await rr.json() : [];
      regs = ensureRegionInList(regs, normalized.region_id, normalized.region?.name || null);
      regs.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, "fr"));
      setRegions(regs);

      const rid = (normalized.region_id || "").toLowerCase();
      const depUrl = rid
        ? `${API}/api/departments?region_id=${encodeURIComponent(rid)}`
        : `${API}/api/departments`;

      const dr = await fetch(depUrl, { cache: "no-store" });
      let deps: DepartmentRow[] = dr.ok ? await dr.json() : [];
      deps = ensureDepartmentInList(deps, normalized.department || null, normalized.region_id || null);
      deps.sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr"));
      setDepartments(deps);
    } catch (e: any) {
      setErr(e?.message || "Erreur API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    if (!slug) return;
    load(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, slug]);

  useEffect(() => {
    const rid = (resort?.region_id || "").toLowerCase();
    if (!resort) return;

    (async () => {
      if (!rid) {
        setDepartments((prev) => ensureDepartmentInList(prev, resort.department || null, null));
        return;
      }

      try {
        const r = await fetch(`${API}/api/departments?region_id=${encodeURIComponent(rid)}`, {
          cache: "no-store",
        });
        let deps: DepartmentRow[] = r.ok ? await r.json() : [];
        deps = ensureDepartmentInList(deps, resort.department || null, resort.region_id || null);
        deps.sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr"));
        setDepartments(deps);
      } catch {
        setDepartments((prev) =>
          ensureDepartmentInList(prev, resort.department || null, resort.region_id || null)
        );
      }
    })();
  }, [resort?.region_id, resort]);

  const patchResort = async () => {
    if (!resort) return;
    setMsg("Enregistrement…");
    setErr("");

    try {
      const payload: ResortType = {
        ...resort,
        pistes_large_map_url: resort.pistes_large_map_url ?? (widgets?.pistes?.largeMapUrl || null),
        pistes_small_map_url: resort.pistes_small_map_url ?? (widgets?.pistes?.smallMapUrl || null),
        region_id: resort.region_id ?? resort.region?.id ?? null,
        region: undefined,
      };

      console.log("PATCH resort payload =", payload);

      const r = await fetch(`${API}/api/admin/stations/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`PATCH failed ${r.status}: ${txt}`);
      }

      await load(slug);
      setMsg("Infos enregistrées.");
    } catch (e: any) {
      setErr(e?.message || "Erreur API");
      setMsg("");
    }
  };

  const patchWidgets = async () => {
    setMsg("Enregistrement widgets…");
    setErr("");

    try {
      const r = await fetch(`${API}/api/admin/stations/${slug}/widgets`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(widgets),
      });

      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`PATCH widgets failed ${r.status}: ${txt}`);
      }

      await load(slug);
      setMsg("Widgets enregistrés.");
    } catch (e: any) {
      setErr(e?.message || "Erreur API");
      setMsg("");
    }
  };

  const patchPistesBoth = async () => {
    await patchWidgets();
    await patchResort();
  };

  const setW = (path: string, val: any) => {
    const parts = path.split(".");
    const copy = { ...widgets };
    let cur: any = copy;

    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      cur[k] = cur[k] ?? {};
      cur = cur[k];
    }

    cur[parts[parts.length - 1]] = val;
    setWidgets(copy);
  };

  const forfaitConfig = normalizeForfaitConfig(widgets?.forfaits);
const forfaitColumns: ForfaitColumn[] = forfaitConfig.columns;
const forfaitItems: ForfaitItem[] = forfaitConfig.items;

const isFilled = (v: any) => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  return true;
};

const isFilledNumber = (v: any) => {
  return v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
};

const areForfaitsComplete = (columns: ForfaitColumn[], items: ForfaitItem[]) => {
  if (!Array.isArray(columns) || columns.length === 0) return false;
  if (!Array.isArray(items) || items.length === 0) return false;

  const columnsOk = columns.every((col) => isFilled(col.label));

  const itemsOk = items.every((item) => {
    if (!isFilled(item.title)) return false;
    const hasAtLeastOnePrice = columns.some((col) => isFilled(item.prices?.[col.id]));
    return hasAtLeastOnePrice;
  });

  return columnsOk && itemsOk;
};

const sectionChecks = {
  overview: !!resort?.cover_image_url && !!resort?.logo_url,

  infos:
    isFilled(resort?.name) &&
    isFilledNumber(resort?.latitude) &&
    isFilledNumber(resort?.longitude) &&
    isFilled(resort?.region_id) &&
    isFilled(resort?.department) &&
    isFilled(resort?.website_url) &&
    isFilled(resort?.cover_image_url) &&
    isFilled(resort?.logo_url) &&
    isFilled(resort?.description_md) &&
    isFilledNumber(resort?.altitude_min_m) &&
    isFilledNumber(resort?.altitude_max_m) &&
    isFilled(resort?.season_open_date) &&
    isFilled(resort?.season_close_date),

  pistes:
    isFilledNumber(widgets?.pistes?.colors?.green) &&
    isFilledNumber(widgets?.pistes?.colors?.blue) &&
    isFilledNumber(widgets?.pistes?.colors?.red) &&
    isFilledNumber(widgets?.pistes?.colors?.black) &&
    isFilledNumber(widgets?.snowparks?.count),

  plan:
    !!widgets?.pistes?.enabled &&
    isFilled(widgets?.pistes?.largeMapUrl) &&
    isFilled(widgets?.pistes?.smallMapUrl) &&
    isFilled(widgets?.pistes?.caption),

  description:
    !!widgets?.description?.enabled &&
    isFilled(widgets?.description?.html),

  snowpark:
    !!widgets?.snowpark?.enabled &&
    isFilled(widgets?.snowpark?.mapUrl) &&
    isFilled(widgets?.snowpark?.caption) &&
    isFilled(widgets?.snowpark?.logoUrl) &&
    isFilled(widgets?.snowpark?.descriptionHtml),

  forfaits:
  !!widgets?.forfaits?.enabled &&
  areForfaitsComplete(forfaitColumns, forfaitItems),
};

const sections = [
  { id: "overview", label: "Vue d’ensemble", complete: sectionChecks.overview },
  { id: "infos", label: "Infos station", complete: sectionChecks.infos },
  { id: "pistes", label: "Pistes & snowpark", complete: sectionChecks.pistes },
  { id: "plan", label: "Plan des pistes", complete: sectionChecks.plan },
  { id: "description", label: "Description", complete: sectionChecks.description },
  { id: "snowpark", label: "Snowpark visuel", complete: sectionChecks.snowpark },
  { id: "forfaits", label: "Forfaits", complete: sectionChecks.forfaits },
];

  const setForfaitsState = (nextColumns: ForfaitColumn[], nextItems: ForfaitItem[]) => {
  setW("forfaits", {
    ...(widgets?.forfaits || {}),
    enabled: !!widgets?.forfaits?.enabled,
    columns: nextColumns,
    items: nextItems,
  });
};

const addForfaitGlobalColumn = () => {
  const nextColumns = [...forfaitColumns, { id: createId("fc"), label: "" }];
  const nextItems = forfaitItems.map((row) => ({
    ...row,
    prices: { ...row.prices },
  }));
  setForfaitsState(nextColumns, nextItems);
};

const updateForfaitGlobalColumnLabel = (colIdx: number, value: string) => {
  const nextColumns = forfaitColumns.map((col, idx) =>
    idx === colIdx ? { ...col, label: value } : col
  );
  setForfaitsState(nextColumns, forfaitItems);
};

const removeForfaitGlobalColumn = (colIdx: number) => {
  const removedColumn = forfaitColumns[colIdx];
  const nextColumns = forfaitColumns.filter((_, idx) => idx !== colIdx);

  const nextItems = forfaitItems.map((row) => {
    const nextPrices = { ...row.prices };
    if (removedColumn?.id) {
      delete nextPrices[removedColumn.id];
    }
    return {
      ...row,
      prices: nextPrices,
    };
  });

  setForfaitsState(nextColumns, nextItems);
};

const addForfaitRow = () => {
  const prices: Record<string, string> = {};
  forfaitColumns.forEach((col) => {
    prices[col.id] = "";
  });

  const nextItems = [...forfaitItems, { id: createId("f"), title: "", prices }];
  setForfaitsState(forfaitColumns, nextItems);
};

const updateForfaitRowTitle = (rowIdx: number, value: string) => {
  const nextItems = forfaitItems.map((row, idx) =>
    idx === rowIdx ? { ...row, title: value } : row
  );
  setForfaitsState(forfaitColumns, nextItems);
};

const updateForfaitPrice = (rowIdx: number, columnId: string, value: string) => {
  const nextItems = forfaitItems.map((row, idx) => {
    if (idx !== rowIdx) return row;

    return {
      ...row,
      prices: {
        ...row.prices,
        [columnId]: value,
      },
    };
  });

  setForfaitsState(forfaitColumns, nextItems);
};

const removeForfaitRow = (rowIdx: number) => {
  const nextItems = forfaitItems.filter((_, idx) => idx !== rowIdx);
  setForfaitsState(forfaitColumns, nextItems);
};
  


  async function uploadWithPresign(file: File): Promise<string> {
    const r = await fetch(`${API}/api/s3/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name }),
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Presign error ${r.status}: ${t}`);
    }

    const { uploadUrl, publicUrl } = await r.json();
    const put = await fetch(uploadUrl, { method: "PUT", body: file });

    if (!put.ok) {
      const t = await put.text();
      throw new Error(`S3 PUT failed ${put.status}: ${t}`);
    }

    return publicUrl;
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const publicUrl = await uploadWithPresign(file);
      setResort((prev) => ({ ...(prev || {}), cover_image_url: publicUrl }));
      setMsg("Image uploadée.");
    } catch (e: any) {
      setErr(e?.message || "Erreur upload");
    } finally {
      (e.target as HTMLInputElement).value = "";
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const publicUrl = await uploadWithPresign(file);
      setResort((prev) => ({ ...(prev || {}), logo_url: publicUrl }));
      setMsg("Logo uploadé.");
    } catch (e: any) {
      setErr(e?.message || "Erreur upload logo");
    } finally {
      (e.target as HTMLInputElement).value = "";
    }
  }

  function handleFileUploadTo(path: string) {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const publicUrl = await uploadWithPresign(file);
        setW(path, publicUrl);
        setMsg("Image uploadée.");
      } catch (e: any) {
        setErr(e?.message || "Erreur upload");
      } finally {
        (e.target as HTMLInputElement).value = "";
      }
    };
  }

  async function uploadLargeAndAutoSmall(
    file: File,
    {
      smallWidth = 800,
      smallMime = "image/jpeg" as "image/jpeg" | "image/png",
      smallQuality = 0.85,
    } = {}
  ): Promise<{ largeUrl: string; smallUrl: string }> {
    const largeUrl = await uploadWithPresign(file);

    const smallBlob = await resizeImageToWidth(file, smallWidth, smallMime, smallQuality);

    const smallName = buildSmallFilename(file.name, smallMime === "image/jpeg");
    const presignSmall = await fetch(`${API}/api/s3/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: smallName }),
    });

    if (!presignSmall.ok) {
      const t = await presignSmall.text();
      throw new Error(`Presign small error ${presignSmall.status}: ${t}`);
    }

    const { uploadUrl: smallUploadUrl, publicUrl: smallPublicUrl } = await presignSmall.json();

    const putSmall = await fetch(smallUploadUrl, { method: "PUT", body: smallBlob });

    if (!putSmall.ok) {
      const t = await putSmall.text();
      throw new Error(`S3 PUT small failed ${putSmall.status}: ${t}`);
    }

    return { largeUrl, smallUrl: smallPublicUrl };
  }

  async function handleUploadPistesLargeAutoSmall(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setMsg("Upload du plan en cours…");
      setErr("");

      const { largeUrl, smallUrl } = await uploadLargeAndAutoSmall(file, {
        smallWidth: 800,
        smallMime: "image/jpeg",
        smallQuality: 0.85,
      });

      setW("pistes.largeMapUrl", largeUrl);
      setW("pistes.smallMapUrl", smallUrl);

      setResort((prev) => ({
        ...(prev || {}),
        pistes_large_map_url: largeUrl,
        pistes_small_map_url: smallUrl,
      }));

      setMsg("Plan des pistes uploadé (grand + petit).");
    } catch (e: any) {
      setErr(e?.message || "Erreur upload plan");
      setMsg("");
    } finally {
      (e.target as HTMLInputElement).value = "";
    }
  }



  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.shell}>Chargement…</div>
      </main>
    );
  }

  if (err && !resort) {
    return (
      <main style={styles.page}>
        <div style={styles.shell}>
          <div style={styles.alertError}>Erreur : {err}</div>
        </div>
      </main>
    );
  }

  if (!resort) {
    return (
      <main style={styles.page}>
        <div style={styles.shell}>Not found</div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.topBarInner}>
          <div style={styles.titleWrap}>
            <h1 style={styles.title}>{resort.name || "Station"}</h1>
            <div style={styles.subtitle}>
              <span style={styles.chip}>Slug : {slug || "—"}</span>
              <span style={styles.chip}>region_id : {resort.region_id || "—"}</span>
              <span style={styles.chip}>department : {resort.department || "—"}</span>
              {resort.region?.name ? <span style={styles.chip}>region.name : {resort.region.name}</span> : null}
            </div>
          </div>

          <div style={styles.actionRow}>
            <button onClick={() => load(slug)} style={styles.secondaryBtn}>
              Rafraîchir
            </button>
            <button onClick={patchWidgets} style={styles.secondaryBtn}>
              Enregistrer widgets
            </button>
            <button onClick={patchResort} style={styles.primaryBtn}>
              Enregistrer station
            </button>
          </div>
        </div>
      </div>

      <div style={styles.shell}>
        {msg ? <div style={styles.alertInfo}>{msg}</div> : null}
        {err ? <div style={styles.alertError}>{err}</div> : null}

        <div style={styles.layout}>
          <aside style={styles.sidebar}>
            <div style={styles.sidebarCard}>
              <div style={{ ...styles.sectionTitleWrap, marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Navigation</h3>
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                  Accès rapide aux blocs d’édition
                </p>
              </div>

              <div style={styles.sectionLinkList}>
                {sections.map((section) => (
  <a key={section.id} href={`#${section.id}`} style={styles.sectionLink}>
    <span style={styles.sectionLinkRow}>
      <span>{section.label}</span>
      <span
        style={section.complete ? styles.sectionStatusOk : styles.sectionStatusKo}
        title={section.complete ? "Section complète" : "Section incomplète"}
      >
        {section.complete ? "✓" : "✕"}
      </span>
    </span>
  </a>
))}
              </div>
            </div>

            <div style={styles.sidebarCard}>
              <div style={{ ...styles.sectionTitleWrap, marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Résumé</h3>
              </div>

              <div style={styles.miniStats}>
                <div style={styles.statBox}>
                  <div style={styles.statLabel}>Nom</div>
                  <div style={styles.statValue}>{resort.name || "—"}</div>
                </div>

                <div style={styles.statBox}>
                  <div style={styles.statLabel}>Région</div>
                  <div style={styles.statValue}>{resort.region_id || "—"}</div>
                </div>

                <div style={styles.statBox}>
                  <div style={styles.statLabel}>Département</div>
                  <div style={styles.statValue}>{resort.department || "—"}</div>
                </div>

                <div style={styles.statBox}>
                  <div style={styles.statLabel}>Forfaits</div>
                  <div style={styles.statValue}>{forfaitItems.length}</div>
                </div>
              </div>
            </div>
          </aside>

          <div style={styles.content}>
            <SectionCard
              id="overview"
              title="Vue d’ensemble"
              description="Aperçu rapide de la station et des principaux médias."
            >
              <div style={styles.grid2}>
                <div style={styles.lineItem}>
                  <div style={{ ...styles.statLabel, marginBottom: 10 }}>Cover</div>
                  {resort.cover_image_url ? (
                    <img src={resort.cover_image_url} alt="Cover preview" style={styles.previewImage} />
                  ) : (
                    <div style={styles.helperBox}>Aucune image de couverture.</div>
                  )}
                </div>

                <div style={styles.lineItem}>
                  <div style={{ ...styles.statLabel, marginBottom: 10 }}>Logo</div>
                  {resort.logo_url ? (
                    <img src={resort.logo_url} alt="Logo station" style={styles.previewLogo} />
                  ) : (
                    <div style={styles.helperBox}>Aucun logo.</div>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              id="infos"
              title="Infos station"
              description="Informations principales, localisation, images, altitudes et dates."
              actions={<SaveButton onClick={patchResort} />}
            >
              <div style={styles.stack}>
                <div style={styles.grid2}>
                  <label style={styles.label}>
                    Nom
                    <input
                      value={resort.name || ""}
                      onChange={(e) => setResort({ ...resort, name: e.target.value })}
                      style={styles.input}
                    />
                  </label>

                  <label style={styles.label}>
                    Site web
                    <input
                      value={resort.website_url || ""}
                      onChange={(e) => setResort({ ...resort, website_url: e.target.value })}
                      style={styles.input}
                    />
                  </label>
                </div>

                <div style={styles.grid2}>
                  <label style={styles.label}>
                    Latitude
                    <input
                      value={resort.latitude ?? ""}
                      onChange={(e) =>
                        setResort({
                          ...resort,
                          latitude: toNumberOrNull(e.target.value),
                        })
                      }
                      style={styles.input}
                    />
                  </label>

                  <label style={styles.label}>
                    Longitude
                    <input
                      value={resort.longitude ?? ""}
                      onChange={(e) =>
                        setResort({
                          ...resort,
                          longitude: toNumberOrNull(e.target.value),
                        })
                      }
                      style={styles.input}
                    />
                  </label>
                </div>

                <div style={styles.grid2}>
                  <label style={styles.label}>
                    Région
                    <select
                      value={resort.region_id ?? ""}
                      onChange={(e) =>
                        setResort({
                          ...resort,
                          region_id: e.target.value || null,
                        })
                      }
                      style={styles.input}
                    >
                      <option value="">— choisir —</option>
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={styles.label}>
                    Département
                    <select
                      value={resort.department ?? ""}
                      onChange={(e) =>
                        setResort({
                          ...resort,
                          department: e.target.value || null,
                        })
                      }
                      style={styles.input}
                    >
                      <option value="">— choisir —</option>
                      {departments.map((d) => (
                        <option key={`${d.region_id}-${d.code}-${d.name}`} value={d.name}>
                          {d.name}
                          {d.code ? ` (${d.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={styles.grid2}>
                  <label style={styles.label}>
                    Altitude min (m)
                    <input
                      value={resort.altitude_min_m ?? ""}
                      onChange={(e) =>
                        setResort({
                          ...resort,
                          altitude_min_m: toNumberOrNull(e.target.value),
                        })
                      }
                      style={styles.input}
                    />
                  </label>

                  <label style={styles.label}>
                    Altitude max (m)
                    <input
                      value={resort.altitude_max_m ?? ""}
                      onChange={(e) =>
                        setResort({
                          ...resort,
                          altitude_max_m: toNumberOrNull(e.target.value),
                        })
                      }
                      style={styles.input}
                    />
                  </label>
                </div>

                <div style={styles.grid2}>
                  <label style={styles.label}>
                    Ouverture (saison) — AAAA-MM-JJ
                    <input
                      type="date"
                      value={resort.season_open_date || ""}
                      onChange={(e) =>
                        setResort({
                          ...resort,
                          season_open_date: e.target.value || null,
                        })
                      }
                      style={styles.input}
                    />
                  </label>

                  <label style={styles.label}>
                    Fermeture (saison) — AAAA-MM-JJ
                    <input
                      type="date"
                      value={resort.season_close_date || ""}
                      onChange={(e) =>
                        setResort({
                          ...resort,
                          season_close_date: e.target.value || null,
                        })
                      }
                      style={styles.input}
                    />
                  </label>
                </div>

                <div style={styles.grid2}>
                  <div style={styles.lineItem}>
                    <label style={styles.label}>
                      Cover image
                      <input
                        value={resort.cover_image_url || ""}
                        onChange={(e) => setResort({ ...resort, cover_image_url: e.target.value })}
                        placeholder="URL publique (auto-remplie après upload)"
                        style={styles.input}
                      />
                    </label>

                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        style={styles.input}
                      />
                      {resort.cover_image_url ? (
                        <img src={resort.cover_image_url} alt="Cover preview" style={styles.previewImage} />
                      ) : null}
                    </div>
                  </div>

                  <div style={styles.lineItem}>
                    <label style={styles.label}>
                      Logo station
                      <input
                        value={resort.logo_url || ""}
                        onChange={(e) => setResort({ ...resort, logo_url: e.target.value })}
                        placeholder="URL publique du logo (auto-remplie après upload)"
                        style={styles.input}
                      />
                    </label>

                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        style={styles.input}
                      />
                      {resort.logo_url ? (
                        <img src={resort.logo_url} alt="Logo station" style={styles.previewLogo} />
                      ) : null}
                    </div>
                  </div>
                </div>

                <label style={styles.label}>
                  Description (Markdown/HTML)
                  <textarea
                    value={resort.description_md || ""}
                    onChange={(e) => setResort({ ...resort, description_md: e.target.value })}
                    rows={8}
                    style={styles.textarea}
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard
              id="pistes"
              title="Pistes & snowpark"
              description="Comptages par couleur et nombre de snowparks."
              actions={<SaveButton onClick={patchPistesBoth} />}
            >
              <div style={styles.grid4}>
                <label style={styles.label}>
                  Vertes
                  <input
                    type="number"
                    min={0}
                    value={widgets?.pistes?.colors?.green ?? 0}
                    onChange={(e) => setW("pistes.colors.green", toIntOrZero(e.target.value))}
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Bleues
                  <input
                    type="number"
                    min={0}
                    value={widgets?.pistes?.colors?.blue ?? 0}
                    onChange={(e) => setW("pistes.colors.blue", toIntOrZero(e.target.value))}
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Rouges
                  <input
                    type="number"
                    min={0}
                    value={widgets?.pistes?.colors?.red ?? 0}
                    onChange={(e) => setW("pistes.colors.red", toIntOrZero(e.target.value))}
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Noires
                  <input
                    type="number"
                    min={0}
                    value={widgets?.pistes?.colors?.black ?? 0}
                    onChange={(e) => setW("pistes.colors.black", toIntOrZero(e.target.value))}
                    style={styles.input}
                  />
                </label>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ ...styles.label, maxWidth: 260 }}>
                  Snowparks (nombre)
                  <input
                    type="number"
                    min={0}
                    value={widgets?.snowparks?.count ?? 0}
                    onChange={(e) => setW("snowparks.count", toIntOrZero(e.target.value))}
                    style={styles.input}
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard
              id="plan"
              title="Plan des pistes"
              description="Gestion du plan grand format, génération automatique du small et légende."
              actions={<SaveButton onClick={patchPistesBoth} />}
            >
              <div style={styles.stack}>
                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={!!widgets?.pistes?.enabled}
                    onChange={(e) => setW("pistes.enabled", e.target.checked)}
                  />
                  Activer
                </label>

                <label style={styles.label}>
                  Large map URL
                  <input
                    value={widgets?.pistes?.largeMapUrl || ""}
                    onChange={(e) => setW("pistes.largeMapUrl", e.target.value)}
                    placeholder="URL grande carte…"
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Upload plan des pistes
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadPistesLargeAutoSmall}
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Small map URL (auto)
                  <input
                    value={widgets?.pistes?.smallMapUrl || ""}
                    readOnly
                    style={{ ...styles.input, background: "#f9fafb", color: "#6b7280" }}
                  />
                </label>

                <label style={styles.label}>
                  Légende
                  <input
                    value={widgets?.pistes?.caption || ""}
                    onChange={(e) => setW("pistes.caption", e.target.value)}
                    style={styles.input}
                  />
                </label>

                {(widgets?.pistes?.largeMapUrl || widgets?.pistes?.smallMapUrl) ? (
                  <div style={styles.splitPreview}>
                    <div style={styles.previewCard}>
                      <div style={styles.previewCardHeader}>Small</div>
                      {widgets?.pistes?.smallMapUrl ? (
                        <img
                          src={widgets?.pistes?.smallMapUrl}
                          alt="Prévisualisation small"
                          style={{ width: "100%", height: "auto", display: "block" }}
                        />
                      ) : (
                        <div style={{ padding: 16, color: "#9ca3af", fontSize: 13 }}>—</div>
                      )}
                    </div>

                    <div style={styles.previewCard}>
                      <div style={styles.previewCardHeader}>Large</div>
                      {widgets?.pistes?.largeMapUrl ? (
                        <img
                          src={widgets?.pistes?.largeMapUrl}
                          alt="Prévisualisation large"
                          style={{ width: "100%", height: "auto", display: "block" }}
                        />
                      ) : (
                        <div style={{ padding: 16, color: "#9ca3af", fontSize: 13 }}>—</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              id="description"
              title="Description"
              description="Bloc widgets.description.html"
              actions={<SaveButton onClick={patchWidgets} />}
            >
              <div style={styles.stack}>
                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={!!widgets?.description?.enabled}
                    onChange={(e) => setW("description.enabled", e.target.checked)}
                  />
                  Activer
                </label>

                <label style={styles.label}>
                  HTML
                  <textarea
                    value={widgets?.description?.html || ""}
                    onChange={(e) => setW("description.html", e.target.value)}
                    rows={10}
                    style={styles.textarea}
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard
              id="snowpark"
              title="Snowpark visuel"
              description="Aperçu, image, logo et description HTML du snowpark."
              actions={<SaveButton onClick={patchWidgets} />}
            >
              <div style={styles.stack}>
                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={!!widgets?.snowpark?.enabled}
                    onChange={(e) => setW("snowpark.enabled", e.target.checked)}
                  />
                  Activer
                </label>

                <div style={styles.grid2}>
                  <div style={styles.lineItem}>
                    <label style={styles.label}>
                      Plan (mapUrl)
                      <input
                        value={widgets?.snowpark?.mapUrl || ""}
                        onChange={(e) => setW("snowpark.mapUrl", e.target.value)}
                        placeholder="https://.../plan-snowpark.svg|png|jpg"
                        style={styles.input}
                      />
                    </label>

                    <div style={{ marginTop: 10 }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUploadTo("snowpark.mapUrl")}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <div style={styles.lineItem}>
                    <label style={styles.label}>
                      Image (imageUrl) — optionnel
                      <input
                        value={widgets?.snowpark?.imageUrl || ""}
                        onChange={(e) => setW("snowpark.imageUrl", e.target.value)}
                        placeholder="https://.../snowpark.jpg"
                        style={styles.input}
                      />
                    </label>

                    <div style={{ marginTop: 10 }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUploadTo("snowpark.imageUrl")}
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>

                <div style={styles.grid2}>
                  <label style={styles.label}>
                    Légende
                    <input
                      value={widgets?.snowpark?.caption || ""}
                      onChange={(e) => setW("snowpark.caption", e.target.value)}
                      placeholder="Nom du secteur, année, source, etc."
                      style={styles.input}
                    />
                  </label>

                  <div style={styles.lineItem}>
                    <label style={styles.label}>
                      Logo snowpark (logoUrl)
                      <input
                        value={widgets?.snowpark?.logoUrl || ""}
                        onChange={(e) => setW("snowpark.logoUrl", e.target.value)}
                        placeholder="https://.../logo-snowpark.png"
                        style={styles.input}
                      />
                    </label>

                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUploadTo("snowpark.logoUrl")}
                        style={styles.input}
                      />
                      {widgets?.snowpark?.logoUrl ? (
                        <img
                          src={widgets?.snowpark?.logoUrl}
                          alt="Logo snowpark"
                          style={styles.previewLogo}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <label style={styles.label}>
                  Description du snowpark (HTML)
                  <textarea
                    value={widgets?.snowpark?.descriptionHtml || ""}
                    onChange={(e) => setW("snowpark.descriptionHtml", e.target.value)}
                    rows={8}
                    placeholder="<p>Contenu HTML de la description du snowpark…</p>"
                    style={styles.textarea}
                  />
                </label>

                {(widgets?.snowpark?.mapUrl || widgets?.snowpark?.imageUrl) ? (
                  <div style={styles.previewCard}>
                    <div style={styles.previewCardHeader}>Aperçu</div>
                    <img
                      src={widgets?.snowpark?.mapUrl || widgets?.snowpark?.imageUrl}
                      alt={widgets?.snowpark?.caption || "Aperçu snowpark"}
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
  id="forfaits"
  title="Forfaits"
  description="Définis d’abord les colonnes globales (Adulte, Enfant, Senior…), puis remplis les prix par type de forfait."
  actions={<SaveButton onClick={patchWidgets} />}
>
  <div style={styles.stack}>
    <label style={styles.checkboxRow}>
      <input
        type="checkbox"
        checked={!!widgets?.forfaits?.enabled}
        onChange={(e) => setW("forfaits.enabled", e.target.checked)}
      />
      Activer
    </label>

    <div style={styles.helperBox}>
      Le tableau du site utilisera exactement ces colonnes globales.  
      Exemple : Adulte / Enfant / Senior.  
      Chaque ligne correspond à un type de forfait : Journée, 4 heures, 6 jours, etc.
    </div>

    <div style={styles.lineItem}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Colonnes du tableau</div>
        <button onClick={addForfaitGlobalColumn} style={styles.ghostBtn}>
          + Ajouter une colonne
        </button>
      </div>

      {forfaitColumns.length === 0 ? (
        <div style={styles.helperBox}>
          Aucune colonne pour le moment. Commence par ajouter par exemple : Adulte, Enfant, Senior.
        </div>
      ) : (
        <div style={styles.stack}>
          {forfaitColumns.map((col, colIdx) => (
            <div
              key={col.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 10,
                alignItems: "end",
              }}
            >
              <label style={styles.label}>
                Nom de colonne
                <input
                  placeholder="Ex: Adulte"
                  value={col.label}
                  onChange={(e) => updateForfaitGlobalColumnLabel(colIdx, e.target.value)}
                  style={styles.input}
                />
              </label>

              <button
                onClick={() => removeForfaitGlobalColumn(colIdx)}
                style={styles.secondaryBtn}
                title="Supprimer la colonne"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>

    <div style={styles.lineItem}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Lignes de forfaits</div>
        <button onClick={addForfaitRow} style={styles.ghostBtn}>
          + Ajouter une ligne
        </button>
      </div>

      {forfaitItems.length === 0 ? (
        <div style={styles.helperBox}>
          Aucun type de forfait pour le moment.
        </div>
      ) : (
        <div style={styles.stack}>
          {forfaitItems.map((row, rowIdx) => (
            <div key={row.id} style={styles.lineItem}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
                  Ligne {rowIdx + 1}
                </div>
                <button
                  onClick={() => removeForfaitRow(rowIdx)}
                  style={styles.secondaryBtn}
                  title="Supprimer la ligne"
                >
                  Supprimer la ligne
                </button>
              </div>

              <div style={styles.stack}>
                <label style={styles.label}>
                  Type de forfait
                  <input
                    placeholder="Ex: Journée"
                    value={row.title}
                    onChange={(e) => updateForfaitRowTitle(rowIdx, e.target.value)}
                    style={styles.input}
                  />
                </label>

                {forfaitColumns.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                    }}
                  >
                    {forfaitColumns.map((col) => (
                      <label key={col.id} style={styles.label}>
                        {col.label || "Colonne sans nom"}
                        <input
                          placeholder="Ex: 29.50"
                          value={row.prices?.[col.id] || ""}
                          onChange={(e) => updateForfaitPrice(rowIdx, col.id, e.target.value)}
                          style={styles.input}
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <div style={styles.helperBox}>
                    Ajoute d’abord les colonnes globales avant de saisir les prix.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
</SectionCard>
          </div>
        </div>
      </div>
    </main>
  );
}
