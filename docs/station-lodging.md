# Hébergements des stations

Le composant `StationLodgingOptions` affiche un panneau natif `details` fermé par défaut.
Le bouton « Voir les logements disponibles » révèle deux liens externes : Booking
(hôtels) et Abritel (appartements et chalets), avec une mention « Lien partenaire »
pour chacun. Aucun script de widget ni appel réseau n'est ajouté avant le clic.

## Destinations et suivi

- Booking conserve le lien CJ `click-101532582-11795698` et la recherche `ss` existante.
- Abritel utilise le camref Partnerize `1011l5gxsq` fourni par Nicolas dans son widget.
- La destination est construite avec le nom de la station, le département (ou la
  région) et France. Aucun identifiant géographique, séjour ou disponibilité n'est inventé.
- Les URL de destination sont encodées dans les liens affiliés. Les liens portent
  `rel="sponsored noopener noreferrer"` et s'ouvrent dans un nouvel onglet.

## Sources et vérification du 20 octobre 2026

Le [guide officiel Vrbo/Partnerize](https://cdn.expediapartnersolutions.com/ean-rapid-site/Vrbo_Partnerize_Linking_Guide.pdf)
décrit la structure `/click/camref:.../destination:...`.
La configuration et le code publics du [widget Expedia Group](https://creator.expediagroup.com/products/widgets/search-widget?program=abritel&lobs=stays&network=pz&camref=1011l5gxsq)
confirment le domaine `vrbo.prf.hn`, le chemin Abritel `/search`, les paramètres
`destination`, `siteid=9003013` et `langid=1036`.

Un appel HTTP réel sur le lien Méribel a reçu une redirection 302 vers Abritel avec
le paramètre `utm_campaign=2dolist-5g3g_1100l264` et des identifiants de clic.
La page finale a répondu 200 et son champ de destination était résolu en
« Méribel, Les Allues, Savoie (département), France » (regionId 8725).
Cela vérifie la redirection et les paramètres de suivi, pas l'attribution d'une
réservation ni l'enregistrement des commissions dans Partnerize.

Tests : encodage et campagnes des deux liens pour cinq stations, noms absents,
rendu du panneau et des mentions, absence de widget et de requête réseau.
