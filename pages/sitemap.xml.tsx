import type { GetServerSideProps } from "next";
import { fetchActiveResortsServer, type Resort } from "@/lib/api/resorts";
import { fetchRegionsServer } from "@/lib/api/regions";
import { createSitemapXml } from "@/lib/sitemap";
import type { RegionSummary } from "@/lib/regions";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  let resorts: Resort[] = [];
  let regions: RegionSummary[] = [];

  const [resortsResult, regionsResult] = await Promise.allSettled([
    fetchActiveResortsServer(),
    fetchRegionsServer(),
  ]);

  if (resortsResult.status === "fulfilled") resorts = resortsResult.value;
  else {
    console.error(
      "[sitemap] Unable to fetch active resorts; continuing without station URLs",
      resortsResult.reason instanceof Error ? resortsResult.reason.message : "unknown_error",
    );
  }
  if (regionsResult.status === "fulfilled") regions = regionsResult.value;
  else {
    console.error(
      "[sitemap] Unable to fetch regions; continuing without region URLs",
      regionsResult.reason instanceof Error ? regionsResult.reason.message : "unknown_error",
    );
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(createSitemapXml(resorts, regions));
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
