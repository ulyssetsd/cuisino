---
mode: 'agent'
---
Mon projet Node.js commence à devenir gros. Je veux :

Organiser le projet en domaines verticaux autonomes (à toi de les identifier à partir du code)

Chaque domaine doit :

Avoir son propre dossier (/quality, /extraction, /images, etc.)

Être indépendant, sans dépendances croisées

Inclure ses tests et sa documentation dans son dossier

Avoir ses propres scripts dans le package.json (domaine:run, domaine:test, etc.)

Pour l’instant, je veux le moins de changements possibles dans le code. Ne touche pas encore au langage ou aux types.

Le but est simplement de poser une structure claire et évolutive, pour ensuite migrer proprement.