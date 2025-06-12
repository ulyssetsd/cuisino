/**
 * Analysis Domain Types
 * Interfaces for analysis reports and statistics
 */

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
