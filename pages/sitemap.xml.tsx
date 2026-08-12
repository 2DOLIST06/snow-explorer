import type { GetServerSideProps } from "next";
import { fetchActiveResortsServer, type Resort } from "@/lib/api/resorts";
import { createSitemapXml } from "@/lib/sitemap";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  let resorts: Resort[] = [];

  try {
    resorts = await fetchActiveResortsServer();
  } catch (error) {
    console.error(
      "[sitemap] Unable to fetch active resorts; serving static public URLs only",
      error instanceof Error ? error.message : "unknown_error",
    );
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(createSitemapXml(resorts));
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
