import ProHeader from "@/components/layout/ProHeader";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const showHeader = !router.pathname.startsWith("/admin") && !router.pathname.startsWith("/api");

  return (
    <>
      {showHeader && <ProHeader />}
      <Component {...pageProps} />
    </>
  );
}
