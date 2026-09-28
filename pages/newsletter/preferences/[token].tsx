import Head from "next/head";
import { useRouter } from "next/router";
import NewsletterPreferences from "@/components/newsletter/NewsletterPreferences";

export default function NewsletterPreferencesPage() {
  const router = useRouter(); const token = Array.isArray(router.query.token) ? router.query.token[0] : router.query.token;
  return <><Head><title>Newsletter | Snow Explorer</title><meta name="robots" content="noindex,nofollow" /></Head>{token ? <NewsletterPreferences token={token} /> : null}</>;
}
