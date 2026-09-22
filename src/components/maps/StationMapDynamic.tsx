import dynamic from "next/dynamic";

const StationMap = dynamic(() => import("./StationMap"), {
  ssr: false,
  loading: () => <div className="station-map__status" role="status">Chargement de la carte…</div>,
});

export default StationMap;
