import React from "react";
import { ForfaitColumn, ForfaitItem } from "@/types/station";

type DisplayForfaitItem = {
  id: string;
  title: string;
  columns: ForfaitColumn[];
};

type ForfaitGroup = {
  key: string;
  headers: string[];
  rows: DisplayForfaitItem[];
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const normalizeLabel = (value: string) =>
  text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const looksLikePrice = (value: string) => {
  const v = text(value);
  if (!v) return false;

  return (
    /€|\$|£|cad|usd|eur/i.test(v) ||
    /^\d+([.,]\d{1,2})?\s?(€|\$|£)$/i.test(v) ||
    /^\d+\s?(€|\$|£)$/i.test(v)
  );
};

const HEADER_PRIORITY = [
  "duree",
  "periode",
  "adulte",
  "enfant",
  "jeune",
  "senior",
  "etudiant",
  "famille",
  "groupe",
  "prix",
  "tarif",
  "note",
  "lien",
];

const getHeaderOrderScore = (label: string) => {
  const normalized = normalizeLabel(label);
  const index = HEADER_PRIORITY.indexOf(normalized);
  return index === -1 ? 999 : index;
};

const sortHeaders = (headers: string[]) => {
  return [...headers].sort((a, b) => {
    const scoreA = getHeaderOrderScore(a);
    const scoreB = getHeaderOrderScore(b);

    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.localeCompare(b, "fr", { sensitivity: "base" });
  });
};

const normalizeForfaits = (items: ForfaitItem[] | undefined): DisplayForfaitItem[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((rawItem, index) => {
      const rowId = text(rawItem?.id) || `forfait-${index + 1}`;
      const rowTitle = text(rawItem?.title) || `Forfait ${index + 1}`;

      const fromColumns = Array.isArray(rawItem?.columns)
        ? rawItem.columns
            .map((col, colIndex) => ({
              id: text(col?.id) || `${rowId}-col-${colIndex + 1}`,
              label: text(col?.label),
              value: text(col?.value),
            }))
            .filter((col) => col.label || col.value)
        : [];

      if (fromColumns.length > 0) {
        return {
          id: rowId,
          title: rowTitle,
          columns: fromColumns,
        };
      }

      const legacyColumns: ForfaitColumn[] = [];

      if (text(rawItem?.price)) {
        legacyColumns.push({
          id: `${rowId}-legacy-price`,
          label: "Prix",
          value: text(rawItem.price),
        });
      }

      if (text(rawItem?.url)) {
        legacyColumns.push({
          id: `${rowId}-legacy-url`,
          label: "Lien",
          value: text(rawItem.url),
        });
      }

      if (text(rawItem?.note)) {
        legacyColumns.push({
          id: `${rowId}-legacy-note`,
          label: "Note",
          value: text(rawItem.note),
        });
      }

      return {
        id: rowId,
        title: rowTitle,
        columns: legacyColumns,
      };
    })
    .filter((item) => item.columns.length > 0);
};

const getRowHeaders = (row: DisplayForfaitItem): string[] => {
  const headers = row.columns
    .map((col) => text(col.label))
    .filter(Boolean);

  return sortHeaders([...new Set(headers)]);
};

const buildGroupKey = (headers: string[]) => headers.map((h) => normalizeLabel(h)).join("|");

const groupRowsByHeaders = (rows: DisplayForfaitItem[]): ForfaitGroup[] => {
  const map = new Map<string, ForfaitGroup>();

  rows.forEach((row) => {
    const headers = getRowHeaders(row);
    const key = buildGroupKey(headers);

    if (!map.has(key)) {
      map.set(key, {
        key,
        headers,
        rows: [],
      });
    }

    map.get(key)!.rows.push(row);
  });

  return Array.from(map.values()).sort((a, b) => {
    const aMain = a.rows[0]?.title || "";
    const bMain = b.rows[0]?.title || "";
    return aMain.localeCompare(bMain, "fr", { sensitivity: "base" });
  });
};

const getGroupTitle = (group: ForfaitGroup, index: number) => {
  const normalizedHeaders = group.headers.map((h) => normalizeLabel(h));

  if (
    normalizedHeaders.includes("adulte") ||
    normalizedHeaders.includes("enfant") ||
    normalizedHeaders.includes("famille")
  ) {
    return "Tarifs par profil";
  }

  if (normalizedHeaders.includes("duree") && (normalizedHeaders.includes("prix") || normalizedHeaders.includes("tarif"))) {
    return "Tarifs par durée";
  }

  if (normalizedHeaders.includes("periode") && (normalizedHeaders.includes("prix") || normalizedHeaders.includes("tarif"))) {
    return "Tarifs par période";
  }

  if (normalizedHeaders.includes("lien")) {
    return "Liens de réservation";
  }

  return `Tableau des forfaits ${index + 1}`;
};

const getCellAlignment = (header: string, value: string) => {
  const normalizedHeader = normalizeLabel(header);
  const cleanValue = text(value);

  if (normalizedHeader === "prix" || normalizedHeader === "tarif" || looksLikePrice(cleanValue)) {
    return "text-center";
  }

  if (normalizedHeader === "lien") {
    return "text-center";
  }

  return "text-left";
};

const renderCellValue = (value: string) => {
  const cleanValue = text(value);

  if (!cleanValue) {
    return <span className="text-neutral-300">—</span>;
  }

  if (isHttpUrl(cleanValue)) {
    return (
      <a
        href={cleanValue}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50"
      >
        Voir
      </a>
    );
  }

  if (looksLikePrice(cleanValue)) {
    return <span className="font-semibold text-neutral-900">{cleanValue}</span>;
  }

  return <span className="text-neutral-700">{cleanValue}</span>;
};

const DesktopTable: React.FC<{
  headers: string[];
  rows: DisplayForfaitItem[];
}> = ({ headers, rows }) => {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 w-[260px] border-b border-r border-neutral-200 bg-neutral-50 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Type de forfait
            </th>

            {headers.map((header) => (
              <th
                key={header}
                className="min-w-[140px] border-b border-neutral-200 bg-neutral-50 px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => {
            const valuesByLabel = new Map<string, string>();

            row.columns.forEach((col) => {
              const label = text(col.label);
              if (!label) return;
              valuesByLabel.set(label, text(col.value));
            });

            return (
              <tr key={row.id} className={rowIndex % 2 === 0 ? "bg-white" : "bg-neutral-50/40"}>
                <td className="sticky left-0 z-10 border-b border-r border-neutral-200 bg-inherit px-5 py-4 align-middle text-sm font-semibold text-neutral-900">
                  {row.title}
                </td>

                {headers.map((header) => {
                  const value = valuesByLabel.get(header) || "";
                  const alignment = getCellAlignment(header, value);

                  return (
                    <td
                      key={`${row.id}-${header}`}
                      className={`border-b border-neutral-200 px-5 py-4 align-middle text-sm ${alignment}`}
                    >
                      {renderCellValue(value)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const MobileCards: React.FC<{
  headers: string[];
  rows: DisplayForfaitItem[];
}> = ({ headers, rows }) => {
  return (
    <div className="grid gap-4 lg:hidden">
      {rows.map((row) => {
        const valuesByLabel = new Map<string, string>();

        row.columns.forEach((col) => {
          const label = text(col.label);
          if (!label) return;
          valuesByLabel.set(label, text(col.value));
        });

        return (
          <div key={row.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <div className="text-sm font-semibold text-neutral-900">{row.title}</div>
            </div>

            <div className="divide-y divide-neutral-100">
              {headers.map((header) => {
                const value = valuesByLabel.get(header) || "";

                return (
                  <div key={`${row.id}-${header}`} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {header}
                    </div>
                    <div className="text-right text-sm text-neutral-900">{renderCellValue(value)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const StationForfaitsBlock: React.FC<{ items: ForfaitItem[]; enabled?: boolean }> = ({ items, enabled }) => {
  if (!enabled) return null;

  const rows = normalizeForfaits(items);
  const groups = groupRowsByHeaders(rows);

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Forfaits</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Consultez les principaux tarifs et formats disponibles pour la station.
          </p>
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group, index) => (
            <div key={group.key} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-4 sm:px-5">
                <h3 className="text-sm font-semibold text-neutral-800">{getGroupTitle(group, index)}</h3>
              </div>

              <div className="p-3 sm:p-4">
                <DesktopTable headers={group.headers} rows={group.rows} />
                <MobileCards headers={group.headers} rows={group.rows} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-sm text-neutral-500">
          Aucun forfait renseigné.
        </div>
      )}
    </section>
  );
};

export default StationForfaitsBlock;
