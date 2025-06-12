/**
 * Simplified Recipe Entity
 * Core recipe data structure with essential methods
 */
class Recipe {
    constructor(id, rectoPath = null, versoPath = null) {
        this.id = id;
        this.rectoPath = rectoPath;
        this.versoPath = versoPath;

        // Recipe data
        this.title = null;
        this.subtitle = null;
        this.cookingTime = null;
        this.difficulty = null;
        this.servings = null;
        this.ingredients = [];
        this.instructions = [];
        this.nutritionalInfo = {};
        this.allergens = [];
        this.tips = [];
        this.tags = [];
        this.image = '';
        this.source = null;
        this.metadata = {};

        // Status tracking
        this.extracted = false;
        this.validated = false;
        this.extractedAt = null;
        this.error = null;
    }

    // Factory method from image paths
    static fromImagePaths(id, rectoPath, versoPath) {
        return new Recipe(id, rectoPath, versoPath);
    } // Factory method from JSON
    static fromJson(data) {
        const recipe = new Recipe(data.id, data.rectoPath, data.versoPath);

        // Handle different JSON formats
        if (data.steps) {
            // HelloFresh format from all_recipes.json
            recipe.title = data.title || 'Unknown Recipe';
            recipe.subtitle = data.subtitle;
            recipe.cookingTime = data.duration;
            recipe.difficulty = data.difficulty;
            recipe.servings = data.servings;
            recipe.ingredients = data.ingredients || [];
            recipe.instructions = data.steps
                ? data.steps.map((step) => step.text)
                : [];
            recipe.nutritionalInfo = data.nutrition || {};
            recipe.allergens = data.allergens || [];
            recipe.tips = data.tips || [];
            recipe.tags = data.tags || [];
            recipe.image = data.image;
            recipe.source = data.source;
            recipe.metadata = data.metadata || {};
            recipe.extracted = true;
            recipe.validated = false;
            recipe.extractedAt =
                data.metadata?.processedAt || new Date().toISOString();
        } else if (data.title) {
            // New format or already converted
            Object.assign(recipe, data);
        } else {
            // Legacy format - convert from old structure
            recipe.title = data.title || 'Unknown Recipe';
            recipe.cookingTime = data.duration || data.cookingTime;
            recipe.servings = data.servings;
            recipe.ingredients = data.ingredients || [];
            recipe.instructions = data.instructions || [];
            recipe.nutritionalInfo = data.nutritionalInfo || {};
            recipe.extracted = true;
            recipe.validated = false;
            recipe.extractedAt = new Date().toISOString();
        }

        return recipe;
    }

    // Update with extraction data
    updateFromExtraction(data) {
        this.title = data.title;
        this.cookingTime = data.cookingTime;
        this.servings = data.servings;
        this.ingredients = data.ingredients || [];
        this.instructions = data.instructions || [];
        this.nutritionalInfo = data.nutritionalInfo || {};
        this.extracted = true;
        this.extractedAt = new Date().toISOString();
        this.error = null;
    }

    // Mark as error
    setError(error) {
        this.error = {
            message: error.message,
            timestamp: new Date().toISOString(),
        };
        this.extracted = false;
    }

    // Check if needs extraction
    needsExtraction() {
        return !this.extracted && !this.error;
    }

    // Check if has error
    hasError() {
        return !!this.error;
    }

    // Basic validation
    isValid() {
        const errors = [];

        if (!this.title) errors.push('Missing title');
        if (!this.ingredients || this.ingredients.length === 0)
            errors.push('Missing ingredients');
        if (!this.instructions || this.instructions.length === 0)
            errors.push('Missing instructions');

        return {
            valid: errors.length === 0,
            errors,
        };
    } // Export to JSON (maintaining HelloFresh format)
    toJson() {
        // Prepare clean metadata without duplication
        const cleanMetadata = { ...this.metadata };

        // Only add file paths if they don't already exist in originalFiles
        if (
            !cleanMetadata.originalFiles &&
            (this.rectoPath || this.versoPath)
        ) {
            cleanMetadata.originalFiles = {
                recto: this.rectoPath,
                verso: this.versoPath,
            };
        }

        // Remove duplicated properties (prefer originalFiles over rectoPath/versoPath)
        if (cleanMetadata.originalFiles) {
            delete cleanMetadata.rectoPath;
            delete cleanMetadata.versoPath;
        }

        // Add current status
        cleanMetadata.extracted = this.extracted;
        cleanMetadata.validated = this.validated;
        cleanMetadata.extractedAt = this.extractedAt;
        cleanMetadata.error = this.error;

        return {
            id: this.id,
            title: this.title,
            subtitle: this.subtitle,
            duration: this.cookingTime,
            difficulty: this.difficulty,
            servings: this.servings,
            ingredients: this.ingredients,
            steps: this.instructions.map((instruction) => ({
                text: instruction,
            })),
            nutrition: this.nutritionalInfo,
            allergens: this.allergens || [],
            tips: this.tips || [],
            tags: this.tags || [],
            image: this.image || '',
            source: this.source || 'Extracted',
            metadata: cleanMetadata,
        };
    }
}

export default Recipe;
export const fromImagePaths = Recipe.fromImagePaths;
export const fromJson = Recipe.fromJson;
