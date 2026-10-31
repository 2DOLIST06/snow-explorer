# Inscription newsletter et page de compte

Après une inscription depuis le footer ou une fiche station, `NewsletterEnrollment` redirige vers `/mon-compte`. Il n’affiche plus de confirmation ni de préférences dans son emplacement initial. Le footer n’affiche pas son formulaire d’inscription sur la page de compte.

La page de compte affiche le message vert « Votre inscription a bien été prise en compte. Vous pouvez modifier vos préférences. » puis le composant habituel `MemberNewsletter`, qui utilise l’unique `NewsletterIntentForm`. Les connexions par mot de passe ou lien email arrivent sur cette même page.

## Accès et identité

- Compte connecté avec la même adresse : les préférences complètes sont lues et enregistrées via `/newsletter/settings`.
- Nouvelle inscription : la capacité de personnalisation existante permet de modifier immédiatement les choix depuis le même éditeur, via `/newsletter/draft`. Elle ne donne pas accès aux données d’un autre compte ni à la définition d’un mot de passe.
- Adresse déjà inscrite et non connectée : la page de compte affiche la connexion avec l’adresse préremplie, par lien ou mot de passe. Aucune préférence existante n’est lue ou remplacée par la simple saisie de l’adresse.
- La définition d’un mot de passe nécessite une connexion au compte par le lien reçu ou par un mot de passe existant. L’onglet reste dans la page de compte.
- Le bouton « Inscrire une autre adresse email » ouvre le champ email vide dans la page de compte, sans déconnecter le compte courant. La personnalisation de cette autre adresse ne peut pas accéder aux réglages du compte courant.

La capacité temporaire reste en mémoire dans le contexte React pendant la navigation. Elle n’est placée ni dans l’URL ni dans le stockage du navigateur. Elle expire après quinze minutes ; après rechargement complet ou expiration, l’accès ultérieur passe par la connexion au même compte. Les préférences déjà enregistrées restent en base.

Aucune migration SQL, modification API ni configuration supplémentaire. L’API doit inclure la route `/newsletter/settings` ajoutée dans snow-explorer-api #151.

## Vérifications

Les tests de composants couvrent la redirection après inscription, le message vert dans le compte, la sauvegarde limitée d’une nouvelle inscription, l’absence de lecture des réglages d’une adresse existante avant connexion, la séparation d’une seconde adresse, la connexion avec l’adresse préremplie et l’absence de formulaire newsletter dans le footer du compte. La comparaison des contrôles de l’éditeur entre nouvelle inscription et comptes existants reste couverte.
