import React from "react";

const StationSnowWidget: React.FC<{ iframeUrl?: string; enabled?: boolean }> = ({ iframeUrl, enabled }) => {
  if (!enabled) return null;

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Enneigement</h2>
      {iframeUrl ? (
        <div className="aspect-[16/10] w-full overflow-hidden rounded-xl">
          <iframe src={iframeUrl} title="Enneigement" className="h-full w-full border-0" loading="lazy" />
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Widget non configuré.</p>
      )}
    </section>
  );
};

export default StationSnowWidget;
