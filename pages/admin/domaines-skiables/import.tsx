import Link from "next/link";
import CatalogImportPanel from "@/components/admin/catalog/CatalogImportPanel";
export default function CatalogImportPage(){return <main className="admin-page"><header className="admin-page-heading"><div><p className="eyebrow">Domaines skiables</p><h1>Importer les domaines</h1><p>Prévisualisez les effets calculés par la base avant toute écriture.</p></div><Link className="btn btn--secondary" href="/admin/domaines-skiables">Retour aux domaines</Link></header><CatalogImportPanel/></main>}
