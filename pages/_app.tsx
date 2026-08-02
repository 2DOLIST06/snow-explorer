import Footer from "@/components/layout/Footer";
import ProHeader from "@/components/layout/ProHeader";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { AdminAuthProvider, AdminRoute } from "@/contexts/AdminAuthContext";
import AdminBar from "@/components/admin/AdminBar";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const showHeader = !router.pathname.startsWith("/admin") && !router.pathname.startsWith("/api");
  const showFooter = !router.pathname.startsWith("/api");

  return (
    <>
      {showHeader && <ProHeader />}
      <AdminAuthProvider>{router.pathname.startsWith("/admin") ? <AdminRoute>{router.pathname !== "/admin/login" && <AdminBar />}<Component {...pageProps} /></AdminRoute> : <Component {...pageProps} />}</AdminAuthProvider>
      {showFooter && <Footer />}
    </>
  );
}
