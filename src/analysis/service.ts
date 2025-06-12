/**
 * Simplified Analysis Service
 * Clean reporting and statistics generation
 */
import { join } from 'path';
import { writeJson, writeText } from '../shared/filesystem.js';
import { section, success, result } from '../shared/logger.js';
import type { AppConfig } from '../shared/types.js';
import type { AnalysisStats, AnalysisReport } from './types.js';
import type { RecipeIngredient } from '../recipes/types.js';
import type Recipe from '../recipes/recipe.js';

class AnalysisService {
    private readonly config: AppConfig;
    private readonly outputPath: string;

    constructor(config: AppConfig) {
        this.config = config;
        this.outputPath = config.paths.output;
    }

    // Generate comprehensive report
    async generateReport(recipes: Recipe[]): Promise<AnalysisReport> {
        section('Generating analysis report');

        const stats = this.calculateStatistics(recipes);
        const report = this.buildReport(stats);

        // Save JSON report
        const jsonPath = join(this.outputPath, 'analysis_report.json');
        await writeJson(jsonPath, report);

        // Save Markdown report
        const markdownPath = join(this.outputPath, 'analysis_report.md');
        const markdown = this.generateMarkdown(report);
        await writeText(markdownPath, markdown);

        success(`Analysis report saved to ${jsonPath} and ${markdownPath}`);
        this.logSummary(stats);

        return report;
    }

    // Calculate statistics from recipes
    calculateStatistics(recipes: Recipe[]): AnalysisStats {
        const total = recipes.length;
        const extracted = recipes.filter((r) => r.extracted).length;
        const validated = recipes.filter((r) => r.validated).length;
        const withErrors = recipes.filter((r) => r.hasError()).length;

        // Ingredient analysis
        const allIngredients = recipes
            .filter((r) => r.ingredients)
            .flatMap((r) => r.ingredients)
            .filter((i): i is RecipeIngredient => Boolean(i && i.name));

        const ingredientCounts = this.countOccurrences(
            allIngredients.map((i) => i.name.toLowerCase())
        );
        const avgIngredientsPerRecipe =
            allIngredients.length / Math.max(extracted, 1);

        // Cooking time analysis
        const cookingTimes = recipes
            .filter((r) => r.cookingTime)
            .map((r) => r.cookingTime ? this.extractMinutes(r.cookingTime) : 0)
            .filter((t) => t > 0);

        const avgCookingTime =
            cookingTimes.length > 0
                ? Math.round(
                      cookingTimes.reduce((a, b) => a + b, 0) /
                          cookingTimes.length
                  )
                : 0;

        // Quality analysis
        const qualityIssues = recipes.filter(
            (r) => r.extracted && !r.validated
        ).length;

        return {
            total,
            extracted,
            validated,
            withErrors,
            successRate: Math.round((extracted / total) * 100),
            qualityRate: Math.round((validated / Math.max(extracted, 1)) * 100),
            avgIngredientsPerRecipe:
                Math.round(avgIngredientsPerRecipe * 10) / 10,
            avgCookingTime,
            qualityIssues,
            topIngredients: Object.entries(ingredientCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([name, count]) => ({ name, count })),
            errors: recipes
                .filter((r) => r.hasError())
                .map((r) => ({
                    id: r.id,
                    error: r.error || 'Unknown error',
                    timestamp: r.extractedAt,
                })),
        };
    }

    // Build structured report
    private buildReport(stats: AnalysisStats): AnalysisReport {
        return {
            metadata: {
                generatedAt: new Date().toISOString(),
                version: '1.0.0',
            },
            summary: {
                totalRecipes: stats.total,
                successfulExtractions: stats.extracted,
                validatedRecipes: stats.validated,
                failedExtractions: stats.withErrors,
                successRate: `${stats.successRate}%`,
                qualityRate: `${stats.qualityRate}%`,
            },
            insights: {
                averageIngredientsPerRecipe: stats.avgIngredientsPerRecipe,
                averageCookingTimeMinutes: stats.avgCookingTime,
                qualityIssuesCount: stats.qualityIssues,
                topIngredients: stats.topIngredients,
            },
            issues: {
                extractionErrors: stats.errors,
                qualityIssuesCount: stats.qualityIssues,
            },
        };
    }

    // Generate Markdown report
    private generateMarkdown(report: AnalysisReport): string {
        return `# Recipe Analysis Report

Generated on: ${new Date(report.metadata.generatedAt).toLocaleString()}

## Summary

- **Total Recipes**: ${report.summary.totalRecipes}
- **Successful Extractions**: ${report.summary.successfulExtractions}
- **Validated Recipes**: ${report.summary.validatedRecipes}
- **Failed Extractions**: ${report.summary.failedExtractions}
- **Success Rate**: ${report.summary.successRate}
- **Quality Rate**: ${report.summary.qualityRate}

## Insights

### Recipe Characteristics
- **Average Ingredients per Recipe**: ${report.insights.averageIngredientsPerRecipe}
- **Average Cooking Time**: ${report.insights.averageCookingTimeMinutes} minutes
- **Quality Issues**: ${report.insights.qualityIssuesCount}

### Top Ingredients
${report.insights.topIngredients.map((ing) => `- ${ing.name}: ${ing.count} recipes`).join('\n')}

## Issues

### Extraction Errors
${
    report.issues.extractionErrors.length > 0
        ? report.issues.extractionErrors
              .map((err) => `- Recipe ${err.id}: ${err.error}`)
              .join('\n')
        : '- No extraction errors'
}

### Quality Issues
- **Recipes with quality issues**: ${report.issues.qualityIssuesCount}

---
*Report generated by Cuisino Recipe Processor*`;
    }

    // Count occurrences in array
    private countOccurrences(items: string[]): Record<string, number> {
        const counts: Record<string, number> = {};

        for (const item of items) {
            counts[item] = (counts[item] || 0) + 1;
        }

        return counts;
    }

    // Extract minutes from cooking time string
    private extractMinutes(timeStr: string): number {
        const match = timeStr.match(/(\d+)/);
        if (!match || !match[1]) return 0;

        const value = parseInt(match[1], 10);

        if (timeStr.toLowerCase().includes('h')) {
            return value * 60;
        }

        return value; // Assume minutes
    }

    // Log summary to console
    private logSummary(stats: AnalysisStats): void {
        result({
            'Total recipes': stats.total,
            'Successful extractions': stats.extracted,
            'Validation rate': `${stats.qualityRate}%`,
            'Average cooking time': `${stats.avgCookingTime} min`,
            'Average ingredients': stats.avgIngredientsPerRecipe,
        });
    }
}

export default AnalysisService;
