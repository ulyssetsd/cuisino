// Configuration types
export interface OpenAIConfig {
    apiKey: string;
    model: string;
    maxTokens: number;
}

export interface PathsConfig {
    recipes: string;
    output: string;
    temp: string;
}

export interface ProcessingConfig {
    retryAttempts: number;
    delayBetweenRequests: number;
    maxConcurrent: number;
}

export interface QualityConfig {
    autoCorrection: boolean;
    validationThreshold: number;
}

export interface ImageCompressionConfig {
    quality: number;
    progressive: boolean;
    mozjpeg: boolean;
}

export interface ImagesConfig {
    compression: ImageCompressionConfig;
    maxSize: number;
}

export interface AppConfig {
    openai: OpenAIConfig;
    paths: PathsConfig;
    processing: ProcessingConfig;
    quality: QualityConfig;
    images: ImagesConfig;
    validate(): boolean;
}

// Recipe types
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

// Validation types
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export interface QualityValidationResult {
    passed: boolean;
    score: number;
    issues: string[];
    needsCorrection: boolean;
}

// Statistics types
export interface ProcessingStats {
    totalRecipes: number;
    extractedRecipes: number;
    validatedRecipes: number;
    errorCount: number;
    successRate: string;
    qualityRate: string;
}

export interface AnalysisStats {
    total: number;
    extracted: number;
    validated: number;
    withErrors: number;
    successRate: number;
    qualityRate: number;
    avgIngredientsPerRecipe: number;
    avgCookingTime: number;
    qualityIssues: number;
    topIngredients: Array<{ name: string; count: number }>;
    errors: Array<{
        id: string;
        error: string;
        timestamp?: string | undefined;
    }>;
}

// Analysis report types
export interface AnalysisReport {
    metadata: {
        generatedAt: string;
        version: string;
    };
    summary: {
        totalRecipes: number;
        successfulExtractions: number;
        validatedRecipes: number;
        failedExtractions: number;
        successRate: string;
        qualityRate: string;
    };
    insights: {
        averageIngredientsPerRecipe: number;
        averageCookingTimeMinutes: number;
        qualityIssuesCount: number;
        topIngredients: Array<{ name: string; count: number }>;
    };
    issues: {
        extractionErrors: Array<{
            id: string;
            error: string;
            timestamp?: string;
        }>;
        qualityIssuesCount: number;
    };
}

// Image processing types
export interface ImagePair {
    recto: string;
    verso: string;
}

export interface ImageStats {
    totalImages: number;
    imagePairs: number;
    totalSizeMB: number;
    minSizeKB: number;
    maxSizeKB: number;
    avgSizeKB: number;
    estimatedCost: number;
}

export interface ImageProcessingResult extends Record<string, string | number> {
    'Images processed': number;
    'Size before': string;
    'Size after': string;
    'Compression rate': string;
}

// Test result types
export interface TestResults {
    entityTests: boolean;
    repositoryTests: boolean;
    imagePairingTests: boolean;
    recipesLoaded: number;
}
