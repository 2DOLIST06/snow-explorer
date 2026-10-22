import Link from "next/link";
import { useState } from "react";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import MemberAuthForm from "../member/MemberAuthForm";
import styles from "./AccountMenu.module.css";

export default function AccountMenu({ onClose }: { onClose: () => void }) {
  const { status, user, logout } = useMemberAuth(); const [error, setError] = useState("");
  return <div id="header-account-menu" className={`account-menu ${styles.menu}`} data-clarity-mask="true">
    {status === "loading" ? <p role="status">Vérification de la session…</p>
      : status === "authenticated" && user ? <>
        <p className="eyebrow">Mon compte</p><p>{user.email}</p>
        <Link className="btn btn--secondary" href="/mon-compte" onClick={onClose}>Aller à mon compte</Link>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <button type="button" className="btn btn--ghost" onClick={() => void logout().then(onClose).catch(cause => setError(cause instanceof Error ? cause.message : "Déconnexion impossible."))}>Se déconnecter</button>
      </> : <><p className="eyebrow">Espace membre</p><MemberAuthForm onComplete={onClose} /></>}
  </div>;
}
