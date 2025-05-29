---
mode: 'agent'
---

Je veux que tu intègres une vérification automatique de la qualité des données extraites, directement dans le pipeline actuel.
Plus précisément, pour chaque ingrédient du tableau ingredients, il faut valider que :

name est une chaîne non vide

quantity.value est un nombre (ou null si vraiment absent)

quantity.unit est renseigné et cohérent (g, ml, pièce, cs, cc, etc.)

Si l’un de ces champs est manquant ou vide, l’agent doit automatiquement :

Relancer un appel à l’API OpenAI avec l’image source

Formuler un prompt plus précis pour obtenir les informations manquantes uniquement

Mettre à jour l’output existant, sans écraser les champs déjà valides

Si les données sont déjà complètes et cohérentes, aucun appel à l’API n’est fait.
L’objectif est d’assurer une qualité fiable du tableau ingredients sans appels superflus.