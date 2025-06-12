/**
 * Analysis report script
 * Generate comprehensive analysis report
 */
require('dotenv').config();
import config from '../shared/config';
import RecipeRepository from '../recipes/repository';
import AnalysisService from '../analysis/service';
import { section, warning, success, error as _error } from '../shared/logger';

async function generateReport() {
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
        _error('Report generation failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    generateReport();
}
