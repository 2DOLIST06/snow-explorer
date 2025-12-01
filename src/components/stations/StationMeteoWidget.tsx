import React from "react";

const StationMeteoWidget: React.FC<{ iframeUrl?: string; enabled?: boolean }> = ({ iframeUrl, enabled }) => {
  if (!enabled) return null;
  if (!iframeUrl) return <section className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="mb-3 text-lg font-semibold">Météo</h2><p className="text-sm text-neutral-500">Widget non configuré.</p></section>;

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Météo</h2>
      <div className="aspect-[16/10] w-full overflow-hidden rounded-xl">
        <iframe src={iframeUrl} title="Météo" className="h-full w-full border-0" loading="lazy" />
      </div>
    </section>
  );
};

export default StationMeteoWidget;
