import type { GetServerSideProps } from "next";

const RETIRED_SECTIONS = new Set(["meteo-neige", "webcams", "forfaits", "plan-des-pistes"]);

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = String(params?.slug || "");
  const section = String(params?.section || "");
  if (!slug || !RETIRED_SECTIONS.has(section)) return { notFound: true };
  return {
    redirect: {
      destination: `/stations/${encodeURIComponent(slug)}`,
      permanent: true,
    },
  };
};

export default function RetiredStationSectionRoute() {
  return null;
}
