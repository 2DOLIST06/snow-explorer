import CachePurgeButton from "@/components/admin/CachePurgeButton";

export default function AdminCache() {
  return <main className="admin-cache-page">
    <header className="admin-cache-page__header">
      <p className="eyebrow">Administration</p>
      <h1>Gestion du cache public</h1>
      <p>Déclenchez une régénération des données publiques sans modifier les données métier.</p>
    </header>

    <section className="admin-cache-card" aria-labelledby="directory-cache-title">
      <div>
        <h2 id="directory-cache-title">Annuaire des stations</h2>
        <p>Vide uniquement le cache utilisé par l’annuaire public des stations.</p>
      </div>
      <CachePurgeButton
        endpoint="/api/admin/cache/resorts/purge"
        label="Vider le cache de l’annuaire"
        successMessage="Cache de l’annuaire vidé. Les données seront régénérées au prochain affichage."
      />
    </section>

    <section className="admin-cache-card admin-cache-card--danger" aria-labelledby="public-cache-title">
      <div>
        <h2 id="public-cache-title">Tout le cache public</h2>
        <p>Cette action invalide l’ensemble des données publiques mises en cache.</p>
      </div>
      <CachePurgeButton
        endpoint="/api/admin/cache/public/purge"
        label="Vider tout le cache public"
        confirmation="Confirmez-vous la purge de tout le cache public ?"
        successMessage="Cache public vidé. Les données seront régénérées progressivement."
      />
    </section>
  </main>;
}
