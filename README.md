# Cuisino 🍳

Extracteur automatique de recettes HelloFresh à partir de photos recto/verso.

## Description

Ce projet permet d'automatiser l'extraction de données de recettes à partir de photos de fiches HelloFresh. Il prend en charge les images recto (titre, image, ingrédients) et verso (instructions, quantités, nutrition) pour générer des fichiers JSON structurés.

## Fonctionnalités

- ✅ Lecture automatique des paires d'images recto/verso
- ✅ Extraction de données via l'API OpenAI GPT-4 Vision
- ✅ Génération de JSON structuré pour chaque recette
- ✅ Support des ingrédients avec quantités et unités
- ✅ Extraction des étapes de préparation
- ✅ Informations nutritionnelles complètes
- ✅ Gestion des allergènes et conseils

## Structure des données

```json
{
  "title": "Nom de la recette",
  "subtitle": "Sous-titre optionnel",
  "duration": "Temps de préparation",
  "difficulty": 2,
  "servings": 2,
  "ingredients": [
    { "name": "Ingrédient", "quantity": { "value": 150, "unit": "g" } }
  ],
  "allergens": ["Gluten", "Lactose"],
  "steps": [
    { "text": "Instruction étape 1" }
  ],
  "nutrition": {
    "calories": "650 kcal",
    "lipides": "45g",
    "proteines": "25g"
  },
  "tips": ["Conseil utile"],
  "tags": ["Italien", "Végétarien"],
  "source": "HelloFresh"
}
```

## Installation

1. Cloner le projet
2. Installer les dépendances :
   ```bash
   npm install
   ```

3. Configurer l'API OpenAI :
   ```bash
   cp .env.example .env
   ```
   Puis éditer `.env` et ajouter votre clé API OpenAI.

## Utilisation

### Organisation des images

1. Placez toutes les images **recto** (titre, ingrédients) en premier, triées par ordre chronologique
2. Placez ensuite toutes les images **verso** (instructions, nutrition) dans le même ordre
3. Les images doivent être dans le dossier `recipes/compressed/` (optimisées pour l'API)

### Optimisation des images (recommandé)

Si vous avez des images non optimisées dans `recipes/uncompressed/` :

```bash
# Optimiser les images (rotation + compression)
npm run optimize

# Économie : ~54% de réduction de taille
# Avantage : Division par 2 des coûts API OpenAI
```

### Scripts disponibles

```bash
# Traitement principal
npm start                    # Extraire toutes les recettes

# Optimisation des images
npm run optimize            # Rotation + compression (économise 54% API)

# Analyse et tests
npm run analyze             # Analyser les images sans traitement
npm run clean               # Nettoyer les fichiers temporaires

# Tests et configuration
npm run test-setup          # Tester la configuration
npm run test-processing     # Test de traitement (mode simulation)
```

### Workflow recommandé

1. **Vérification** : `npm run test-setup`
2. **Analyse** : `npm run analyze` 
3. **Test** : `npm run test-processing`
4. **Production** : `npm start`

Les résultats seront générés dans le dossier `output/` :
- `recipe_001.json`, `recipe_002.json`, etc. : recettes individuelles
- `all_recipes.json` : fichier consolidé avec toutes les recettes
- `processing_summary.md` : résumé du traitement

## Configuration

Variables d'environnement dans `.env` :

- `OPENAI_API_KEY` : Clé API OpenAI (obligatoire)
- `INPUT_DIR` : Dossier des images source (défaut: `./recipes/compressed`)
- `OUTPUT_DIR` : Dossier de sortie (défaut: `./output`)
- `OPENAI_MODEL` : Modèle OpenAI à utiliser (défaut: `gpt-4o`)
- `MAX_TOKENS` : Limite de tokens (défaut: `4096`)

## Structure du projet

```
cuisino/
├── src/
│   ├── RecipeProcessor.js    # Orchestrateur principal
│   ├── ImageProcessor.js     # Gestion des images et paires
│   └── RecipeExtractor.js    # Extraction via OpenAI
├── recipes/
│   ├── uncompressed/         # Images originales (backup)
│   └── compressed/           # Images optimisées ✅ UTILISER
├── output/                   # Résultats JSON
├── temp/                     # Fichiers temporaires
├── index.js                  # Point d'entrée
├── .env.example              # Configuration exemple
└── README.md
```

## Prérequis

- Node.js 14+
- Clé API OpenAI avec accès à GPT-4 Vision
- Images de recettes HelloFresh au format JPG/PNG

## Support

Ce projet est optimisé pour les fiches de recettes HelloFresh mais peut être adapté pour d'autres formats de recettes avec des modifications du prompt système.
