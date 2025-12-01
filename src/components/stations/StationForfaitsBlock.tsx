import React from "react";
import { ForfaitItem } from "@/types/station";
import Link from "next/link";

const Row: React.FC<{ item: ForfaitItem }> = ({ item }) => (
  <div className="grid grid-cols-1 items-center gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_auto]">
    <div>
      <p className="font-medium">{item.title}</p>
      {item.note ? <p className="text-xs text-neutral-500">{item.note}</p> : null}
    </div>
    <div className="flex items-center gap-3 justify-self-start sm:justify-self-end">
      <span className="text-base font-semibold">{item.price}</span>
      {item.url ? (
        <Link href={item.url} target="_blank" className="rounded-lg border px-3 py-1 text-sm hover:bg-neutral-50">
          Acheter
        </Link>
      ) : null}
    </div>
  </div>
);

const StationForfaitsBlock: React.FC<{ items: ForfaitItem[]; enabled?: boolean }> = ({ items, enabled }) => {
  if (!enabled) return null;

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Forfaits</h2>
      {items?.length ? (
        <div className="space-y-2">{items.map((it) => <Row key={it.id} item={it} />)}</div>
      ) : (
        <p className="text-sm text-neutral-500">Aucun forfait renseigné.</p>
      )}
    </section>
  );
};

export default StationForfaitsBlock;
