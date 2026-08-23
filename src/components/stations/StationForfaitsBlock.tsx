import React, { useMemo, useState } from "react";
import type { ForfaitColumn, ForfaitItem, ForfaitPeriod, ForfaitPrice, ForfaitSeason } from "@/types/station";

type Props = {
  enabled?: boolean;
  columns?: ForfaitColumn[];
  items?: ForfaitItem[];
  periods?: ForfaitPeriod[];
  season?: string | ForfaitSeason | null;
  source_url?: string | null;
  sourceUrl?: string | null;
};

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const key = (value: unknown) => text(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
const idOf = (value: unknown, fallback: string) => text(value) || fallback;

const euro = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} €`;
  const valueText = text(value);
  if (!valueText) return "—";
  if (valueText.includes("€")) return valueText;
  const numeric = Number(valueText.replace(",", "."));
  return Number.isFinite(numeric) ? `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(numeric)} €` : valueText;
};

const dateValue = (value: unknown) => {
  const raw = text(value);
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return null;
  const parsed = new Date(`${raw.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};
const formatDate = (value: unknown) => {
  const date = dateValue(value);
  return date ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date) : text(value);
};
const periodLabel = (period: ForfaitPeriod) => text(period.label || period.name) || [formatDate(period.start_date || period.startDate), formatDate(period.end_date || period.endDate)].filter(Boolean).join(" – ") || "Période tarifaire";

export const normalizeForfaits = (rawColumns: ForfaitColumn[] = [], rawItems: ForfaitItem[] = []) => {
  const explicit = rawColumns.length > 0;
  const columns: ForfaitColumn[] = [];
  const ensure = (labelValue: unknown, idValue?: unknown) => {
    const label = text(labelValue);
    const existing = columns.find((column) => column.id === idValue || key(column.label) === key(label));
    if (existing) return existing.id;
    const id = idOf(idValue, `fc-${key(label) || columns.length + 1}`);
    if (key(id) !== "title" && key(label) !== "title") columns.push({ id, label });
    return id;
  };
  rawColumns.forEach((column) => ensure(column?.label, column?.id));
  const items = rawItems.map((item, index) => {
    let title = text(item?.title);
    const prices: Record<string, string> = {};
    Object.entries(item?.prices || {}).forEach(([priceKey, value]) => {
      const found = columns.find((column) => column.id === priceKey || key(column.label) === key(priceKey));
      if (found) prices[found.id] = text(value);
      else if (!explicit) prices[ensure(priceKey)] = text(value);
    });
    (item?.columns || []).forEach((column) => {
      if (key(column.label) === "title") title = text(column.value);
      else if (key(column.label) === "price" && !explicit) prices[ensure("Prix", "prix")] = text(column.value);
      else if (text(column.label)) {
        const found = columns.find((candidate) => candidate.id === column.id || key(candidate.label) === key(column.label));
        if (found) prices[found.id] = text(column.value);
        else if (!explicit) prices[ensure(column.label, column.id)] = text(column.value);
      }
    });
    if (text(item?.price) && !explicit) prices[ensure("Prix", "prix")] = text(item.price);
    return { id: idOf(item?.id, `f-${index + 1}`), title, prices };
  });
  return { columns, items };
};

type Cell = ForfaitPrice & { category_id: string };
type Grid = { columns: ForfaitColumn[]; rows: Array<{ id: string; title: string; cells: Record<string, Cell> }> };
type PriceNote = { label: string; stars: string };

const hasValue = (value: unknown) => value !== null && value !== undefined && (typeof value !== "string" || value.trim() !== "");

export function hasForfaitPrice(cell?: ForfaitPrice): boolean {
  if (!cell) return false;
  return [cell.price, cell.amount, cell.price_min, cell.price_max].some(hasValue);
}

const onlyPricedRows = (grid: Grid): Grid => ({
  ...grid,
  rows: grid.rows.filter((row) => Object.values(row.cells).some(hasForfaitPrice)),
});

export function collectPriceNotes(grid: Grid): PriceNote[] {
  const labels: string[] = [];
  grid.rows.forEach((row) => Object.values(row.cells).forEach((cell) => {
    const label = text(cell.note);
    if (label && !labels.includes(label)) labels.push(label);
  }));
  return labels.map((label, index) => ({ label, stars: "*".repeat(index + 1) }));
}

export function periodGrid(period: ForfaitPeriod): Grid {
  const categories = Array.isArray(period.categories) ? period.categories : [];
  const columns: ForfaitColumn[] = categories.map((category, index) => ({ id: idOf(category.id || category.key, `category-${index}`), label: text(category.label || category.name) }));
  const ensure = (label: unknown, categoryId?: unknown) => {
    const candidateId = text(categoryId);
    const found = columns.find((column) => column.id === candidateId || (text(label) && key(column.label) === key(label)));
    if (found) return found.id;
    const id = idOf(categoryId, `category-${key(label) || columns.length + 1}`);
    columns.push({ id, label: text(label) || id });
    return id;
  };
  const products = period.passes || period.products || period.forfaits || period.items || [];
  const rows = products.map((product, index) => {
    const cells: Record<string, Cell> = {};
    const rates = Array.isArray(product.prices) ? product.prices : Array.isArray(product.rates) ? product.rates : Array.isArray(product.tariffs) ? product.tariffs : [];
    rates.forEach((rate) => {
      const category = rate.category || {};
      const categoryId = ensure(rate.category_label || category.label || category.name, rate.category_id || category.id || category.key);
      cells[categoryId] = { ...rate, category_id: categoryId };
    });
    if (product.prices && !Array.isArray(product.prices)) Object.entries(product.prices).forEach(([categoryName, value]) => {
      const categoryId = ensure(categoryName, categoryName);
      cells[categoryId] = typeof value === "object" && value ? { ...(value as ForfaitPrice), category_id: categoryId } : { price_type: "fixed", price: value as string, category_id: categoryId };
    });
    return { id: idOf(product.id, `pass-${index}`), title: text(product.label || product.name || product.title || product.duration_label), cells };
  });
  return onlyPricedRows({ columns: columns.filter((column) => column.label), rows: rows.filter((row) => row.title) });
}

function Price({ value, notes }: { value?: Cell; notes: PriceNote[] }) {
  if (!value) return <>—</>;
  const dynamic = value.price_type === "dynamic" || value.type === "dynamic";
  const marker = notes.find((note) => note.label === text(value.note))?.stars;
  return <><span className="forfait-price">{dynamic ? <>{euro(value.price_min)} – {euro(value.price_max)}</> : euro(value.price ?? value.amount)}</span>{marker && <sup className="forfait-note-marker" aria-label={`Note ${marker.length}`}>{marker}</sup>}{dynamic && <small className="forfait-dynamic-label">Tarif dynamique</small>}</>;
}

export default function StationForfaitsBlock({ enabled, columns = [], items = [], periods = [], season, source_url, sourceUrl }: Props) {
  const seasonObject = typeof season === "object" && season ? season : null;
  const availablePeriods = periods.length ? periods : seasonObject?.periods || seasonObject?.pricing_periods || [];
  const orderedPeriods = useMemo(() => [...availablePeriods]
    .filter((period) => periodGrid(period).rows.length > 0)
    .sort((a, b) => (Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)) || text(a.start_date || a.startDate).localeCompare(text(b.start_date || b.startDate))), [availablePeriods]);
  const initialPeriod = useMemo(() => {
    const now = new Date();
    return orderedPeriods.findIndex((period) => {
      const start = dateValue(period.start_date || period.startDate);
      const end = dateValue(period.end_date || period.endDate);
      return Boolean(start && end && now >= start && now <= new Date(end.valueOf() + 86_399_999));
    });
  }, [orderedPeriods]);
  const [selectedId, setSelectedId] = useState(() => idOf(orderedPeriods[initialPeriod >= 0 ? initialPeriod : 0]?.id, "0"));
  if (!enabled) return null;
  const selectedIndex = Math.max(0, orderedPeriods.findIndex((period, index) => idOf(period.id, String(index)) === selectedId));
  const selected = orderedPeriods[selectedIndex];
  const legacy = normalizeForfaits(columns, items);
  const grid: Grid = selected ? periodGrid(selected) : onlyPricedRows({ columns: legacy.columns, rows: legacy.items.map((row) => ({ id: row.id, title: row.title, cells: Object.fromEntries(Object.entries(row.prices).map(([category_id, price]) => [category_id, { category_id, price_type: "fixed", price }])) })) });
  if (!grid.columns.length || !grid.rows.length) return null;
  const hasDynamic = grid.rows.some((row) => Object.values(row.cells).some((cell) => cell.price_type === "dynamic" || cell.type === "dynamic"));
  const priceNotes = collectPriceNotes(grid);
  const source = source_url || sourceUrl || selected?.source_url || selected?.sourceUrl || seasonObject?.source_url || seasonObject?.sourceUrl;
  const seasonLabel = typeof season === "string" ? season : text(season?.label || season?.name);
  return <section className="forfaits-card">
    <div className="forfaits-heading"><div><h2>Forfaits</h2>{seasonLabel && <p>Saison {seasonLabel}</p>}</div>{source && <a className="btn btn--secondary" href={source} target="_blank" rel="noopener noreferrer">Voir les tarifs officiels</a>}</div>
    {orderedPeriods.length > 1 && <label className="forfaits-period">Période<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{orderedPeriods.map((period, index) => <option key={idOf(period.id, String(index))} value={idOf(period.id, String(index))}>{periodLabel(period)}</option>)}</select></label>}
    {orderedPeriods.length === 1 && <p className="forfaits-period-label"><strong>Période</strong><span>{periodLabel(orderedPeriods[0])}</span></p>}
    <div className="forfaits-table-wrap" tabIndex={0} aria-label="Tableau des tarifs">
      <table className="forfaits-table"><thead><tr><th scope="col">Forfait</th>{grid.columns.map((column) => <th scope="col" key={column.id}>{column.label}</th>)}</tr></thead><tbody>{grid.rows.map((row) => <tr key={row.id}><th scope="row">{row.title}</th>{grid.columns.map((column) => <td key={column.id} data-label={column.label}><Price value={row.cells[column.id]} notes={priceNotes} /></td>)}</tr>)}</tbody></table>
    </div>
    {priceNotes.length > 0 && <div className="forfaits-price-notes" aria-label="Notes relatives aux tarifs">{priceNotes.map((note) => <p key={note.label}><span className="forfait-note-marker" aria-hidden="true">{note.stars}</span><span>{note.label}</span></p>)}</div>}
    {hasDynamic && <p className="forfaits-dynamic-note">Tarifs dynamiques : le prix peut varier notamment selon la date choisie et le moment de la réservation. Consultez le site officiel de la station pour connaître le tarif disponible au moment de l&apos;achat.</p>}
  </section>;
}
