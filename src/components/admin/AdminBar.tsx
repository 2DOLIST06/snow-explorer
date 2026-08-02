import { useAdminAuth } from "@/contexts/AdminAuthContext";
export default function AdminBar() { const { user, logout } = useAdminAuth(); return <header className="admin-bar"><strong>Administration</strong><span>{user?.email}</span><button type="button" onClick={() => void logout()}>Se déconnecter</button></header>; }
