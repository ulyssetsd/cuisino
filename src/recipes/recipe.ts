/**
 * Simplified Recipe Entity
 * Core recipe data structure with essential methods
 */
import type {
    RecipeData,
    RecipeIngredient,
    NutritionalInfo,
    RecipeMetadata,
    ValidationResult,
} from '../types/index.js';

class Recipe implements RecipeData {
    public id: string;
    public rectoPath?: string;
    public versoPath?: string;

    // Recipe data
    public title?: string;
    public subtitle?: string;
    public cookingTime?: string;
    public difficulty?: string;
    public servings?: string | number;
    public ingredients: RecipeIngredient[];
    public instructions: string[];
    public nutritionalInfo: NutritionalInfo;
    public allergens: string[];
    public tips: string[];
    public tags: string[];
    public image: string;
    public source?: string;
    public metadata: RecipeMetadata;

    // Status tracking
    public extracted: boolean;
    public validated: boolean;
    public extractedAt?: string;
    public error?: string;

    constructor(id: string, rectoPath?: string, versoPath?: string) {
        this.id = id;
        this.rectoPath = rectoPath;
        this.versoPath = versoPath;

        // Recipe data
        this.title = undefined;
        this.subtitle = undefined;
        this.cookingTime = undefined;
        this.difficulty = undefined;
        this.servings = undefined;
        this.ingredients = [];
        this.instructions = [];
        this.nutritionalInfo = {};
        this.allergens = [];
        this.tips = [];
        this.tags = [];
        this.image = '';
        this.source = undefined;
        this.metadata = {};

        // Status tracking
        this.extracted = false;
        this.validated = false;
        this.extractedAt = undefined;
        this.error = undefined;
    }

    // Factory method from image paths
    static fromImagePaths(
        id: string,
        rectoPath: string,
        versoPath: string
    ): Recipe {
        return new Recipe(id, rectoPath, versoPath);
    }

    // Factory method from JSON
    static fromJson(data: any): Recipe {
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
                ? data.steps.map((step: any) => step.text)
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
    updateFromExtraction(data: any): void {
        this.title = data.title;
        this.subtitle = data.subtitle;
        this.cookingTime = data.cookingTime || data.duration;
        this.difficulty = data.difficulty;
        this.servings = data.servings;
        this.ingredients = data.ingredients || [];
        this.instructions = data.instructions || [];
        this.nutritionalInfo = data.nutritionalInfo || data.nutrition || {};
        this.allergens = data.allergens || [];
        this.tips = data.tips || [];
        this.tags = data.tags || [];
        this.image = data.image || '';
        this.source = data.source || 'Extracted';

        this.extracted = true;
        this.extractedAt = new Date().toISOString();
    }

    // Mark as error
    setError(error: Error): void {
        this.error = error.message;
        this.extracted = false;
        this.validated = false;
    }

    // Check if needs extraction
    needsExtraction(): boolean {
        return !this.extracted && !this.hasError();
    }

    // Check if has error
    hasError(): boolean {
        return Boolean(this.error);
    }

    // Basic validation
    isValid(): ValidationResult {
        const errors: string[] = [];

        if (!this.title) errors.push('Missing title');
        if (!this.ingredients || this.ingredients.length === 0)
            errors.push('Missing ingredients');
        if (!this.instructions || this.instructions.length === 0)
            errors.push('Missing instructions');

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    // Export to JSON (maintaining HelloFresh format)
    toJson(): any {
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
