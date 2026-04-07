import React from "react";

type LegacyForfaitColumn = {
  id?: string;
  label?: string;
  value?: string;
};

type ForfaitColumn = {
  id: string;
  label: string;
};

type ForfaitItem = {
  id: string;
  title: string;
  prices?: Record<string, string>;

  // ancien format
  columns?: LegacyForfaitColumn[];
  price?: string;
  url?: string | null;
  note?: string | null;
};

type Props = {
  enabled?: boolean;
  columns?: ForfaitColumn[];
  items?: ForfaitItem[];
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const normalizeLabelKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

const normalizeForfaits = (
  rawColumns: ForfaitColumn[] | undefined,
  rawItems: ForfaitItem[] | undefined
): { columns: ForfaitColumn[]; items: Array<{ id: string; title: string; prices: Record<string, string> }> } => {
  const columnMap = new Map<string, ForfaitColumn>();

  const ensureColumn = (rawLabel: unknown, rawId?: unknown): string => {
    const label = text(rawLabel);

    if (!label) {
      const fallbackId =
        typeof rawId === "string" && rawId.trim() !== ""
          ? rawId.trim()
          : `fc-${Math.random().toString(36).slice(2, 8)}`;

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

  if (Array.isArray(rawColumns)) {
    rawColumns.forEach((col) => {
      ensureColumn(col?.label, col?.id);
    });
  }

  const normalizedItems = Array.isArray(rawItems)
    ? rawItems.map((rawItem, index) => {
        const rowId =
          typeof rawItem?.id === "string" && rawItem.id.trim() !== ""
            ? rawItem.id
            : `f-${index + 1}`;

        let rowTitle = text(rawItem?.title);
        const prices: Record<string, string> = {};

        // nouveau format
        if (rawItem?.prices && typeof rawItem.prices === "object" && !Array.isArray(rawItem.prices)) {
          Object.entries(rawItem.prices).forEach(([key, value]) => {
            const rawValue = text(value);

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

        // ancien format : item.columns
        if (Array.isArray(rawItem?.columns)) {
          let genericTitle = "";
          let genericPrice = "";

          rawItem.columns.forEach((rawCol) => {
            const label = text(rawCol?.label);
            const value = text(rawCol?.value);

            if (!label) return;

            const normalizedLabel = normalizeLabelKey(label);

            if (normalizedLabel === "title") {
              genericTitle = value;
              return;
            }

            if (normalizedLabel === "price") {
              genericPrice = value;
              return;
            }

            const colId = ensureColumn(label, rawCol?.id);
            prices[colId] = value;
          });

          if (genericTitle) {
            rowTitle = genericTitle;
          }

          if (genericPrice) {
            const prixId = ensureColumn("Prix", "prix");
            prices[prixId] = genericPrice;
          }
        }

        // ancien format ultra simple : price / url / note
        if (text(rawItem?.price)) {
          const prixId = ensureColumn("Prix", "prix");
          prices[prixId] = text(rawItem.price);
        }
        if (text(rawItem?.url)) {
          const urlId = ensureColumn("URL", "url");
          prices[urlId] = text(rawItem.url);
        }
        if (text(rawItem?.note)) {
          const noteId = ensureColumn("Note", "note");
          prices[noteId] = text(rawItem.note);
        }

        return {
          id: rowId,
          title: rowTitle,
          prices,
        };
      })
    : [];

  return {
    columns: Array.from(columnMap.values()),
    items: normalizedItems,
  };
};

export default function StationForfaitsBlock({ enabled, columns, items }: Props) {
  if (!enabled) return null;

  const normalized = normalizeForfaits(columns, items);
  const finalColumns = normalized.columns.filter((col) => text(col.label));
  const finalItems = normalized.items.filter((item) => text(item.title));

  if (finalColumns.length === 0 || finalItems.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: 16,
        background: "#fff",
        padding: 16,
      }}
    >
      <h2
        style={{
          margin: "0 0 12px",
          fontSize: 20,
          fontWeight: 800,
          color: "#0f172a",
        }}
      >
        Forfaits
      </h2>

      <div
        style={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          border: "1px solid #d1d9e6",
          borderRadius: 12,
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: 720,
            borderCollapse: "separate",
            borderSpacing: 0,
            background: "#fff",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0f172a",
                  background: "#e8eef6",
                  borderBottom: "1px solid #cbd5e1",
                  whiteSpace: "nowrap",
                }}
              >
                Forfait
              </th>

              {finalColumns.map((column) => (
                <th
                  key={column.id}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0f172a",
                    background: "#e8eef6",
                    borderBottom: "1px solid #cbd5e1",
                    whiteSpace: "nowrap",
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {finalItems.map((row, rowIndex) => (
              <tr key={row.id}>
                <th
                  scope="row"
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0f172a",
                    background: rowIndex % 2 === 0 ? "#ffffff" : "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.title}
                </th>

                {finalColumns.map((column) => (
                  <td
                    key={`${row.id}-${column.id}`}
                    style={{
                      padding: "14px 16px",
                      fontSize: 14,
                      color: "#334155",
                      background: rowIndex % 2 === 0 ? "#ffffff" : "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {text(row.prices?.[column.id]) || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
