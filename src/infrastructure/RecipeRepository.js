/**
 * RecipeRepository - Couche d'accès aux données
 * Responsabilité: Charger les recettes depuis différentes sources (JSON + Images)
 */
const fs = require('fs-extra');
const path = require('path');
const Recipe = require('../domain/Recipe');

class RecipeRepository {
    constructor(paths) {
        this.paths = paths;
    }

    /**
     * Charge toutes les recettes depuis toutes les sources disponibles
     * Combine les recettes JSON existantes et les nouvelles images
     */
    async loadAllRecipes() {
        console.log('📊 Chargement des recettes depuis toutes les sources...');

        // 1. Charger les paires d'images disponibles
        const imagePairs = await this.loadImagePairs();
        console.log(`📸 ${imagePairs.length} paires d'images trouvées`);

        // 2. Charger les recettes JSON existantes
        const existingRecipes = await this.loadExistingRecipesFromJson();
        console.log(`📚 ${existingRecipes.length} recettes JSON existantes`);

        // 3. Fusionner et créer les objets Recipe
        const recipes = this.mergeRecipeSources(imagePairs, existingRecipes);
        
        console.log(`🔄 ${recipes.length} recettes totales chargées`);
        return recipes;
    }

    /**
     * Charge les paires d'images depuis le dossier
     */
    async loadImagePairs() {
        const inputDir = this.paths.input;
        
        if (!fs.existsSync(inputDir)) {
            console.log(`⚠️ Dossier d'images non trouvé: ${inputDir}`);
            return [];
        }

        // Lire tous les fichiers images
        const files = await fs.readdir(inputDir);
        const imageFiles = files
            .filter(file => this.isImageFile(file))
            .sort(); // Tri par nom de fichier (ordre chronologique)

        // Vérifier que le nombre d'images est pair
        if (imageFiles.length % 2 !== 0) {
            throw new Error(`Nombre impair d'images trouvées (${imageFiles.length}). Il faut un nombre pair pour former des paires recto/verso.`);
        }

        // Créer les paires : la première moitié = recto, la seconde moitié = verso
        const halfCount = imageFiles.length / 2;
        const rectoImages = imageFiles.slice(0, halfCount);
        const versoImages = imageFiles.slice(halfCount);

        const pairs = [];
        for (let i = 0; i < halfCount; i++) {
            pairs.push({
                index: i + 1,
                recto: path.join(inputDir, rectoImages[i]),
                verso: path.join(inputDir, versoImages[i])
            });
        }

        return pairs;
    }

    /**
     * Charge les recettes existantes depuis le fichier JSON
     */
    async loadExistingRecipesFromJson() {
        const allRecipesPath = path.join(this.paths.output, 'all_recipes.json');
        
        if (!fs.existsSync(allRecipesPath)) {
            return [];
        }

        try {
            const data = await fs.readJson(allRecipesPath);
            return data.recipes || [];
        } catch (error) {
            console.log(`⚠️ Erreur lors du chargement des recettes JSON: ${error.message}`);
            return [];
        }
    }

    /**
     * Fusionne les sources (images + JSON) en objets Recipe
     */
    mergeRecipeSources(imagePairs, existingJsonRecipes) {
        const recipes = [];

        // Pour chaque paire d'images, créer une recette
        imagePairs.forEach((pair, index) => {
            const existingJson = existingJsonRecipes[index];

            if (existingJson) {
                // Recipe existante: combiner JSON + chemins d'images
                const recipe = Recipe.fromJson(existingJson);
                recipe.id = pair.index;
                recipe._imagePaths = { recto: pair.recto, verso: pair.verso };
                recipes.push(recipe);
            } else {
                // Nouvelle recipe: juste les chemins d'images
                const recipe = Recipe.fromImages(pair.recto, pair.verso, pair.index);
                recipes.push(recipe);
            }
        });

        return recipes;
    }

    /**
     * Sauvegarde une recette individuelle
     */
    async saveRecipe(recipe, prettyPrint = true) {
        const filename = `recipe_${String(recipe.id).padStart(3, '0')}.json`;
        const filepath = path.join(this.paths.output, filename);
        const jsonOptions = prettyPrint ? { spaces: 2 } : {};
        
        await fs.writeJson(filepath, recipe.toJson(), jsonOptions);
        return filename;
    }

    /**
     * Sauvegarde toutes les recettes dans le fichier consolidé
     */
    async saveAllRecipes(recipes, summary, prettyPrint = true) {
        const recipesJson = recipes.map(recipe => recipe.toJson());
        
        const data = {
            recipes: recipesJson,
            metadata: summary
        };

        const allRecipesPath = path.join(this.paths.output, 'all_recipes.json');
        const jsonOptions = prettyPrint ? { spaces: 2 } : {};
        await fs.writeJson(allRecipesPath, data, jsonOptions);
        
        return allRecipesPath;
    }

    /**
     * Charge les erreurs existantes depuis le fichier JSON
     */
    async loadExistingErrors() {
        const allRecipesPath = path.join(this.paths.output, 'all_recipes.json');
        
        if (!fs.existsSync(allRecipesPath)) {
            return [];
        }

        try {
            const data = await fs.readJson(allRecipesPath);
            return data.metadata?.errors || [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Filtre les recettes qui ont besoin d'extraction
     */
    getRecipesNeedingExtraction(recipes) {
        return recipes.filter(recipe => recipe.needsExtraction());
    }

    /**
     * Filtre les recettes qui ont besoin de vérification qualité
     */
    getRecipesNeedingQualityCheck(recipes) {
        return recipes.filter(recipe => 
            recipe.isExtracted() && recipe._needsQualityCheck
        );
    }

    /**
     * Vérifie si un fichier est une image
     */
    isImageFile(filename) {
        const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(filename).toLowerCase();
        return supportedExtensions.includes(ext);
    }

    /**
     * Créer les dossiers nécessaires
     */
    async ensureDirectories() {
        await fs.ensureDir(this.paths.output);
        await fs.ensureDir(this.paths.temp);
    }
}

module.exports = RecipeRepository;
