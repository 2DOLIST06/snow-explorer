import React, { useState } from "react";
import { WebcamItem } from "@/types/station";
import Modal from "@/components/ui/Modal";
import Image from "next/image";

type HeadingLevel = "h2" | "h3";

const StationWebcamsBlock: React.FC<{ items: WebcamItem[]; enabled?: boolean; headingLevel?: HeadingLevel }> = ({ items, enabled, headingLevel = "h2" }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!enabled) return null;
  const Heading = headingLevel;

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <Heading className="mb-3 text-lg font-semibold">Webcams</Heading>
      {!items?.length ? <p className="text-sm text-neutral-500">Aucune webcam renseignée.</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((cam) => (
          <button
            key={cam.id}
            onClick={() => setOpenId(cam.id)}
            className="group overflow-hidden rounded-xl border text-left"
            aria-label={`Ouvrir ${cam.title}`}
          >
            <div className="relative aspect-video w-full">
              <Image src={cam.thumbUrl} alt={cam.title} fill className="object-cover transition-transform group-hover:scale-[1.02]" />
            </div>
            <div className="p-2">
              <p className="text-sm font-medium">{cam.title}</p>
            </div>
          </button>
        ))}
      </div>

      {items.map((cam) => (
        <Modal key={cam.id} open={openId === cam.id} onClose={() => setOpenId(null)} ariaLabel={cam.title}>
          {cam.iframeUrl ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <iframe src={cam.iframeUrl} title={cam.title} className="h-full w-full border-0" allowFullScreen loading="lazy" />
            </div>
          ) : cam.pageUrl ? (
            <div className="p-2">
              <a href={cam.pageUrl} target="_blank" className="underline">Voir la webcam</a>
            </div>
          ) : (
            <p>Flux non configuré.</p>
          )}
        </Modal>
      ))}
    </section>
  );
};

export default StationWebcamsBlock;
