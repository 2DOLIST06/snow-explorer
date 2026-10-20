# GetYourGuide : intégration indépendante des préférences Snow Explorer

Le conteneur `data-gyg-*` configure le widget et son lien. Le chargeur utilisé est `https://widget.getyourguide.com/dist/pa.umd.production.min.js`. La documentation officielle l’identifie comme Integration Analyzer et annonce qu’il ne dépose pas de cookies tiers : [documentation du fournisseur](https://partner.getyourguide.support/hc/en-us/articles/13980983394333-How-to-install-the-Integration-Analyzer).

Le fonctionnement retenu ne conditionne ni les widgets, ni les bannières, ni les liens affiliés, ni le script GetYourGuide au choix dans la bannière Snow Explorer. Le chargement des partenaires est indépendant des cookies facultatifs propres au site. Les anciens refus enregistrés dans la version 1 de la bannière ne sont plus utilisés.

Les ancres HTTPS du code d’intégration restent aussi accessibles en dehors de l’iframe. Les URL et leurs paramètres ne sont pas réécrits et aucun identifiant partenaire n’est ajouté si le lien original n’en contient pas. Ces liens portent `sponsored noopener noreferrer`. Les scripts inline et accès au parent restent isolés ou incompatibles selon le contrat d’intégration existant ; ces protections techniques ne sont pas des restrictions liées aux cookies.

La précédente tentative d’accès direct au fichier officiel avait renvoyé HTTP 403. Les tests locaux avec partenaires simulés vérifient le fonctionnement de Snow Explorer, sans revendiquer un audit réseau ou stockage du service tiers. Aucun audit supplémentaire ni aucun mécanisme de blocage des partenaires n’est introduit ici.
