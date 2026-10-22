import { MemberAuthProvider } from "@/contexts/MemberAuthContext";
import { CookiePreferencesProvider } from "@/contexts/CookiePreferencesContext";
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
  const privateMemberPage = ["/connexion", "/connexion/lien", "/inscription", "/mon-compte"].includes(router.pathname);
  const showFooter = !router.pathname.startsWith("/api");
  const stationDirectory = pageProps.stationDirectory ?? pageProps.initialStations;

  return (
    <CookiePreferencesProvider publicPage={showHeader && !privateMemberPage}>
      <MemberAuthProvider><AdminAuthProvider>
        {showHeader && <ProHeader initialStations={stationDirectory} />}
        {router.pathname.startsWith("/admin") ? <AdminRoute>{!["/admin/login", "/admin/login-link"].includes(router.pathname) && <AdminBar />}<Component {...pageProps} /></AdminRoute> : <Component {...pageProps} />}</AdminAuthProvider></MemberAuthProvider>
      {showFooter && <Footer />}
    </CookiePreferencesProvider>
  );
}
