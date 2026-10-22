import Head from "next/head";
import Link from "next/link";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import MemberAuthForm from "./MemberAuthForm";
export default function MemberAuthPage({ mode }: { mode: "login" | "register" }) {
  const { status } = useMemberAuth();
  return <main className="admin-login"><Head><title>{mode === "register" ? "Créer un compte" : "Connexion"} | Snow Explorer</title><meta name="robots" content="noindex,nofollow" /></Head><section className="admin-login-card"><h1>{mode === "register" ? "Créer un compte" : "Connexion"}</h1>{status === "authenticated" ? <Link className="btn btn--primary" href="/mon-compte">Accéder à mon compte</Link> : <MemberAuthForm mode={mode} />}</section></main>;
}
