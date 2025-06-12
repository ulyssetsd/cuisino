/**
 * Analysis report script
 * Generate comprehensive analysis report
 */
require('dotenv').config();
const config = require('../shared/config');
const RecipeRepository = require('../recipes/repository');
const AnalysisService = require('../analysis/service');
const Logger = require('../shared/logger');

async function generateReport() {
    try {
        Logger.section('📊 Analysis Report Generation');

        const recipeRepo = new RecipeRepository(config);
        const analysisService = new AnalysisService(config);

        const recipes = await recipeRepo.loadExistingRecipes();

        if (recipes.length === 0) {
            Logger.warning('No recipes found. Process some recipes first.');
            return;
        }

        await analysisService.generateReport(recipes);

        Logger.success('Analysis report generated!');
    } catch (error) {
        Logger.error('Report generation failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    generateReport();
}
