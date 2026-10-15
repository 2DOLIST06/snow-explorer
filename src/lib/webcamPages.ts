import type { GetServerSidePropsContext } from "next";
import { fetchActiveResortsServer } from "@/lib/api/resorts";
import type { WebcamsDirectoryProps } from "@/components/webcams/WebcamsDirectory";

/** The existing active directory also supplies the header; no Windy request during SSR. */
export async function getWebcamsPageProps(context: GetServerSidePropsContext) {
  const initialStations = await fetchActiveResortsServer();
  if (!initialStations.length) {
    context.res.statusCode = 503;
    context.res.setHeader("Retry-After", "300");
    return { props: { initialStations: [], station: null, unavailable: true } satisfies WebcamsDirectoryProps };
  }
  const slug = context.params?.slug;
  const station = typeof slug === "string" ? initialStations.find(item => item.slug === slug) : null;
  if (slug && !station) return { notFound: true as const };
  return { props: { initialStations, station: station || null } satisfies WebcamsDirectoryProps };
}
