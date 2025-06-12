/**
 * Analysis report script
 * Generate comprehensive analysis report
 */
import 'dotenv/config';
import config from '../shared/config.js';
import RecipeRepository from '../recipes/repository.js';
import AnalysisService from '../analysis/service.js';
import {
    section,
    warning,
    success,
    error as _error,
} from '../shared/logger.js';

async function generateReport(): Promise<void> {
    try {
        section('📊 Analysis Report Generation');

        const recipeRepo = new RecipeRepository(config);
        const analysisService = new AnalysisService(config);

        const recipes = await recipeRepo.loadExistingRecipes();

        if (recipes.length === 0) {
            warning('No recipes found. Process some recipes first.');
            return;
        }

        await analysisService.generateReport(recipes);

        success('Analysis report generated!');
    } catch (error) {
        _error('Report generation failed:', (error as Error).message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    generateReport();
}
