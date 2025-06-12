/**
 * Recipe Repository - Simplified data access
 * Handles loading and saving recipes with minimal complexity
 */
const path = require('path');
const Recipe = require('./recipe');
const FileSystem = require('../shared/filesystem');
const Logger = require('../shared/logger');

class RecipeRepository {
    constructor(config) {
        this.config = config;
        this.recipesPath = config.paths.recipes;
        this.outputPath = config.paths.output;
    }

    // Load recipes from image pairs
    async loadFromImages() {
        const compressedDir = path.join(this.recipesPath, 'compressed');
        const images = await FileSystem.listFiles(compressedDir, '.jpg');

        // Group images into pairs (assuming they come in recto/verso pairs)
        const pairs = this.groupImagePairs(images, compressedDir);

        Logger.info(`Found ${pairs.length} image pairs in ${compressedDir}`);

        return pairs.map((pair, index) =>
            Recipe.fromImagePaths(
                String(index + 1).padStart(3, '0'),
                pair.recto,
                pair.verso
            )
        );
    } // Load existing recipes from consolidated JSON file
    async loadExistingRecipes() {
        const recipes = [];

        // Load from consolidated file only
        const consolidatedPath = path.join(this.outputPath, 'all_recipes.json');
        const consolidatedData = await FileSystem.readJson(consolidatedPath);

        if (consolidatedData && consolidatedData.recipes) {
            for (let i = 0; i < consolidatedData.recipes.length; i++) {
                const data = consolidatedData.recipes[i];
                // Generate ID from index if not present
                data.id = data.id || String(i + 1).padStart(3, '0');

                recipes.push(Recipe.fromJson(data));
            }
        }

        Logger.info(
            `Loaded ${recipes.length} existing recipes from consolidated file`
        );
        return recipes;
    } // Save single recipe - updates the consolidated file
    async saveRecipe(recipe) {
        // Load all existing recipes
        const existingRecipes = await this.loadExistingRecipes();

        // Find and update the recipe, or add it if new
        const existingIndex = existingRecipes.findIndex(
            (r) => r.id === recipe.id
        );

        if (existingIndex >= 0) {
            existingRecipes[existingIndex] = recipe;
        } else {
            existingRecipes.push(recipe);
        }

        // Save all recipes back to consolidated file
        return await this.saveAllRecipes(existingRecipes);
    }

    // Save multiple recipes efficiently (batch update)
    async saveRecipes(recipes) {
        // Load all existing recipes
        const existingRecipes = await this.loadExistingRecipes();
        const existingMap = new Map(existingRecipes.map((r) => [r.id, r]));

        // Update existing recipes and add new ones
        for (const recipe of recipes) {
            existingMap.set(recipe.id, recipe);
        }

        const updatedRecipes = Array.from(existingMap.values());
        Logger.info(`Batch saving ${recipes.length} recipes`);

        return await this.saveAllRecipes(updatedRecipes);
    } // Save all recipes as consolidated file
    async saveAllRecipes(recipes, stats = {}) {
        const data = {
            metadata: {
                totalRecipes: recipes.length,
                generatedAt: new Date().toISOString(),
                ...stats,
            },
            recipes: recipes.map((r) => r.toJson()),
        };

        const filePath = path.join(this.outputPath, 'all_recipes.json');
        await FileSystem.writeJson(filePath, data);

        Logger.success(
            `Saved ${recipes.length} recipes to consolidated file: ${filePath}`
        );
        return filePath;
    }

    // Group images into recto/verso pairs
    groupImagePairs(images, baseDir) {
        const pairs = [];
        const sortedImages = images.sort();

        for (let i = 0; i < sortedImages.length; i += 2) {
            if (i + 1 < sortedImages.length) {
                pairs.push({
                    recto: path.join(baseDir, sortedImages[i]),
                    verso: path.join(baseDir, sortedImages[i + 1]),
                });
            }
        }

        return pairs;
    }

    // Ensure output directory exists
    async ensureDirectories() {
        await FileSystem.ensureDir(this.outputPath);
    }
}

module.exports = RecipeRepository;
