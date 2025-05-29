---
mode: 'agent'
---

Je travaille sur un projet Node où je veux structurer automatiquement des fiches de recettes à partir de photos **recto/verso**. J’ai d’abord pris toutes les pages recto (titre, image, ingrédients), puis toutes les verso (instructions, quantités, nutrition…). Les photos sont triées par ordre chronologique, donc la première recto correspond à la première verso.

Je veux que tu m’aides à extraire les données des paires d’images et les convertir en JSON selon ce schéma :

```json
{
  "title": "...",
  "subtitle": "...",
  "duration": "...",
  "difficulty": 2,
  "servings": 2,
  "ingredients": [
    { "name": "...", "quantity": { "value": ..., "unit": "..." } }
  ],
  "allergens": ["..."],
  "steps": [
    {
      "text": "...",
      "image": "step1.jpg"
    }
  ],
  "nutrition": {
    "calories": "...",
    "lipides": "...",
    "acides_gras_satures": "...",
    "glucides": "...",
    "sucres": "...",
    "fibres": "...",
    "proteines": "...",
    "sel": "..."
  },
  "tips": ["..."],
  "tags": ["..."],
  "image": "...",
  "source": "HelloFresh"
}
```

Pour les ingrédients, sépare bien la quantité en `value` (un nombre) et `unit` (ex: `"g"`, `"pièce"`, `"cc"`…). Si une valeur est absente ou floue, mets `"value": null` mais indique l’unité si elle est connue.

Pour les étapes, associe chaque texte d’instruction à son image (étape 1 → step1.jpg, etc.).

Je travaille en Node.js et j’utilise le paquet openai pour interagir avec ChatGPT et analyser les images. Le traitement est entièrement automatisé : les images sont envoyées à l’API en séquence pour extraire les données de chaque recette.
Pour l’instant, le projet est vide. J’aimerais que tu m’aides à initialiser la structure du projet et à poser les premières bases du traitement (lecture des images, appel API, génération du JSON).

ajoute également dans le gitignore pour ne pas inclure les images non compressées recipes/uncrompressed

s'il te plait utilise les commandes npm pour initialiser le projet et installer les dépendances nécessaires