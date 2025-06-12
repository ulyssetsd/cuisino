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
    ExtractedRecipeData,
} from './types.js';

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
    static fromJson(data: Record<string, unknown>): Recipe {
        const recipe = new Recipe(
            data.id as string,
            data.rectoPath as string,
            data.versoPath as string
        );

        // Handle different JSON formats
        if (data.steps) {
            // HelloFresh format from all_recipes.json
            recipe.title = (data.title as string) || 'Unknown Recipe';
            recipe.subtitle = data.subtitle as string;
            recipe.cookingTime = data.duration as string;
            recipe.difficulty = data.difficulty as string;
            recipe.servings = data.servings as string | number;
            recipe.ingredients = (data.ingredients as RecipeIngredient[]) || [];
            recipe.instructions = data.steps
                ? (data.steps as Array<{ text: string }>).map(
                      (step) => step.text
                  )
                : [];
            recipe.nutritionalInfo = (data.nutrition as NutritionalInfo) || {};
            recipe.allergens = (data.allergens as string[]) || [];
            recipe.tips = (data.tips as string[]) || [];
            recipe.tags = (data.tags as string[]) || [];
            recipe.image = data.image as string;
            recipe.source = data.source as string;
            recipe.metadata = (data.metadata as RecipeMetadata) || {};
            recipe.extracted = true;
            recipe.validated = false;
            recipe.extractedAt =
                ((data.metadata as RecipeMetadata)?.processedAt as string) ||
                new Date().toISOString();
        } else if (data.title) {
            // New format or already converted
            Object.assign(recipe, data);
        } else {
            // Legacy format - convert from old structure
            recipe.title = (data.title as string) || 'Unknown Recipe';
            recipe.cookingTime =
                (data.duration as string) || (data.cookingTime as string);
            recipe.servings = data.servings as string | number;
            recipe.ingredients = (data.ingredients as RecipeIngredient[]) || [];
            recipe.instructions = (data.instructions as string[]) || [];
            recipe.nutritionalInfo =
                (data.nutritionalInfo as NutritionalInfo) || {};
            recipe.extracted = true;
            recipe.validated = false;
            recipe.extractedAt = new Date().toISOString();
        }

        return recipe;
    }

    // Update with extraction data
    updateFromExtraction(data: ExtractedRecipeData): void {
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
    toJson(): Record<string, unknown> {
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
