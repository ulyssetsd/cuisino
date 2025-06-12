/**
 * Recipe Domain Types
 * Interfaces for recipe entities and related data structures
 */

export interface RecipeIngredient {
    name: string;
    quantity?: string;
    unit?: string;
}

export interface RecipeInstruction {
    text: string;
    step?: number;
}

export interface NutritionalInfo {
    calories?: number;
    carbs?: string;
    protein?: string;
    fat?: string;
    fiber?: string;
    sugar?: string;
}

export interface RecipeMetadata {
    extracted?: boolean;
    validated?: boolean;
    extractedAt?: string;
    error?: string;
    originalFiles?: {
        recto?: string;
        verso?: string;
    };
    [key: string]: any;
}

export interface RecipeData {
    id: string;
    title?: string;
    subtitle?: string;
    cookingTime?: string;
    difficulty?: string;
    servings?: string | number;
    ingredients: RecipeIngredient[];
    instructions: string[];
    nutritionalInfo: NutritionalInfo;
    allergens: string[];
    tips: string[];
    tags: string[];
    image: string;
    source?: string;
    metadata: RecipeMetadata;
    extracted: boolean;
    validated: boolean;
    extractedAt?: string;
    error?: string;
    rectoPath?: string;
    versoPath?: string;
}

export interface ProcessingStats {
    totalRecipes: number;
    extractedRecipes: number;
    validatedRecipes: number;
    errorCount: number;
    successRate: string;
    qualityRate: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
