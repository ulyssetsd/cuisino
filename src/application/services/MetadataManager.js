/**
 * Gestionnaire de métadonnées et validation
 * Responsabilité unique : Enrichissement et validation des recettes
 */
const path = require('path');

class MetadataManager {
    constructor(config) {
        this.config = config;
    }

    /**
     * Ajoute les métadonnées à une recette
     */
    addMetadata(recipe, rectoPath, versoPath, recipeIndex) {
        if (!this.config.extraction.includeOriginalFilenames) {
            return recipe;
        }

        return {
            ...recipe,
            metadata: {
                originalFiles: {
                    recto: path.basename(rectoPath),
                    verso: path.basename(versoPath)
                },
                processedAt: new Date().toISOString(),
                recipeIndex
            }
        };
    }

    /**
     * Valide une recette selon les critères de base
     */
    validateRecipe(recipe) {
        if (!this.config.extraction.validateJson) {
            return true;
        }

        const requiredFields = ['title', 'source'];
        const missingFields = requiredFields.filter(field => !recipe[field]);

        if (missingFields.length > 0) {
            throw new Error(`Champs requis manquants: ${missingFields.join(', ')}`);
        }

        if (recipe.ingredients && !Array.isArray(recipe.ingredients)) {
            throw new Error('Le champ ingredients doit être un tableau');
        }

        if (recipe.steps && !Array.isArray(recipe.steps)) {
            throw new Error('Le champ steps doit être un tableau');
        }

        return true;
    }

    /**
     * Crée une recette de fallback en cas d'erreur
     */
    createFallbackRecipe(rectoPath, versoPath, error) {
        if (!this.config.extraction.fallbackOnError) {
            throw error;
        }

        console.log('   🛡️ Création d\'une recette de fallback...');

        return {
            title: `Recette non extraite - ${path.basename(rectoPath)}`,
            subtitle: "",
            duration: "",
            difficulty: null,
            servings: null,
            ingredients: [],
            allergens: [],
            steps: [],
            nutrition: {},
            tips: [],
            tags: ["Erreur d'extraction"],
            image: "",
            source: "HelloFresh",
            extractionError: {
                message: error.message,
                timestamp: new Date().toISOString(),
                originalFiles: {
                    recto: path.basename(rectoPath),
                    verso: path.basename(versoPath)
                }
            }
        };
    }

    /**
     * Crée un résumé de traitement
     */
    createProcessingSummary(recipes, errors, processingTime, totalImages) {
        return {
            recipes,
            metadata: {
                totalRecipes: recipes.length,
                totalErrors: errors.length,
                successRate: `${Math.round((recipes.length / totalImages) * 100)}%`,
                processingTimeSeconds: processingTime,
                processedAt: new Date().toISOString(),
                source: 'HelloFresh',
                errors
            }
        };
    }
}

module.exports = MetadataManager;
