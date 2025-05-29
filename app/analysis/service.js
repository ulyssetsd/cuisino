/**
 * Simplified Analysis Service
 * Clean reporting and statistics generation
 */
const path = require('path');
const FileSystem = require('../shared/filesystem');
const Logger = require('../shared/logger');

class AnalysisService {
    constructor(config) {
        this.config = config;
        this.outputPath = config.paths.output;
    }

    // Generate comprehensive report
    async generateReport(recipes) {
        Logger.section('Generating analysis report');

        const stats = this.calculateStatistics(recipes);
        const report = this.buildReport(stats);

        // Save JSON report
        const jsonPath = path.join(this.outputPath, 'analysis_report.json');
        await FileSystem.writeJson(jsonPath, report);        // Save Markdown report
        const markdownPath = path.join(this.outputPath, 'analysis_report.md');
        const markdown = this.generateMarkdown(report);
        await FileSystem.writeText(markdownPath, markdown);

        Logger.success(`Analysis report saved to ${jsonPath} and ${markdownPath}`);
        this.logSummary(stats);

        return report;
    }

    // Calculate statistics from recipes
    calculateStatistics(recipes) {
        const total = recipes.length;
        const extracted = recipes.filter(r => r.extracted).length;
        const validated = recipes.filter(r => r.validated).length;
        const withErrors = recipes.filter(r => r.hasError()).length;

        // Ingredient analysis
        const allIngredients = recipes
            .filter(r => r.ingredients)
            .flatMap(r => r.ingredients)
            .filter(i => i && i.name);

        const ingredientCounts = this.countOccurrences(allIngredients.map(i => i.name.toLowerCase()));
        const avgIngredientsPerRecipe = allIngredients.length / Math.max(extracted, 1);

        // Cooking time analysis
        const cookingTimes = recipes
            .filter(r => r.cookingTime)
            .map(r => this.extractMinutes(r.cookingTime))
            .filter(t => t > 0);

        const avgCookingTime = cookingTimes.length > 0 
            ? Math.round(cookingTimes.reduce((a, b) => a + b, 0) / cookingTimes.length)
            : 0;

        // Quality analysis
        const qualityIssues = recipes
            .filter(r => r.extracted && !r.validated)
            .length;

        return {
            total,
            extracted,
            validated,
            withErrors,
            successRate: Math.round((extracted / total) * 100),
            qualityRate: Math.round((validated / Math.max(extracted, 1)) * 100),
            avgIngredientsPerRecipe: Math.round(avgIngredientsPerRecipe * 10) / 10,
            avgCookingTime,
            qualityIssues,
            topIngredients: Object.entries(ingredientCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([name, count]) => ({ name, count })),
            errors: recipes
                .filter(r => r.hasError())
                .map(r => ({
                    id: r.id,
                    error: r.error.message,
                    timestamp: r.error.timestamp
                }))
        };
    }

    // Build structured report
    buildReport(stats) {
        return {
            metadata: {
                generatedAt: new Date().toISOString(),
                version: '1.0.0'
            },
            summary: {
                totalRecipes: stats.total,
                successfulExtractions: stats.extracted,
                validatedRecipes: stats.validated,
                failedExtractions: stats.withErrors,
                successRate: `${stats.successRate}%`,
                qualityRate: `${stats.qualityRate}%`
            },
            insights: {
                averageIngredientsPerRecipe: stats.avgIngredientsPerRecipe,
                averageCookingTimeMinutes: stats.avgCookingTime,
                qualityIssuesCount: stats.qualityIssues,
                topIngredients: stats.topIngredients
            },
            issues: {
                extractionErrors: stats.errors,
                qualityIssuesCount: stats.qualityIssues
            }
        };
    }

    // Generate Markdown report
    generateMarkdown(report) {
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
${report.insights.topIngredients.map(ing => `- ${ing.name}: ${ing.count} recipes`).join('\n')}

## Issues

### Extraction Errors
${report.issues.extractionErrors.length > 0 
    ? report.issues.extractionErrors.map(err => `- Recipe ${err.id}: ${err.error}`).join('\n')
    : '- No extraction errors'
}

### Quality Issues
- **Recipes with quality issues**: ${report.issues.qualityIssuesCount}

---
*Report generated by Cuisino Recipe Processor*`;
    }

    // Count occurrences in array
    countOccurrences(items) {
        return items.reduce((acc, item) => {
            acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {});
    }

    // Extract minutes from cooking time string
    extractMinutes(timeStr) {
        if (!timeStr) return 0;
        
        const str = timeStr.toString().toLowerCase();
        const minuteMatch = str.match(/(\d+)\s*min/);
        const hourMatch = str.match(/(\d+)\s*h/);
        
        let minutes = 0;
        if (minuteMatch) minutes += parseInt(minuteMatch[1]);
        if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
        
        return minutes;
    }

    // Log summary to console
    logSummary(stats) {
        Logger.result({
            'Total recipes': stats.total,
            'Successful extractions': stats.extracted,
            'Validation rate': `${stats.qualityRate}%`,
            'Average cooking time': `${stats.avgCookingTime} min`,
            'Average ingredients': stats.avgIngredientsPerRecipe
        });
    }
}

module.exports = AnalysisService;
