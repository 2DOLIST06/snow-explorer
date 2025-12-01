import React from "react";

const StationDescriptionBlock: React.FC<{ html?: string; enabled?: boolean }> = ({ html, enabled }) => {
  if (!enabled) return null;
  if (!html) return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Description</h2>
      <p className="text-sm text-neutral-500">Description à venir.</p>
    </section>
  );

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Description</h2>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
};

export default StationDescriptionBlock;
