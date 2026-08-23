import { useAdminAuth } from "@/contexts/AdminAuthContext";
import Link from "next/link";
export default function AdminBar() { const { user, logout } = useAdminAuth(); return <header className="admin-bar"><strong>Administration</strong><nav><Link href="/admin/stations">Stations</Link><Link href="/admin/regions">Régions & SEO</Link><Link href="/admin/indexnow">IndexNow</Link></nav><span>{user?.email}</span><button type="button" onClick={() => void logout()}>Se déconnecter</button></header>; }
