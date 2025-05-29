/**
 * Extraction-only script
 * Process only the extraction phase
 */
require('dotenv').config();
const config = require('../shared/config');
const RecipeRepository = require('../recipes/repository');
const ExtractionOrchestrator = require('../extraction/orchestrator');
const Logger = require('../shared/logger');

async function extractOnly() {
    try {
        Logger.section('🤖 Extraction Only Mode');
        
        const recipeRepo = new RecipeRepository(config);
        const extractor = new ExtractionOrchestrator(config);
        
        await recipeRepo.ensureDirectories();
        const recipes = await recipeRepo.loadFromImages();
        
        await extractor.extractRecipes(recipes);
        
        // Save results
        for (const recipe of recipes) {
            if (recipe.extracted || recipe.hasError()) {
                await recipeRepo.saveRecipe(recipe);
            }
        }
        
        Logger.success('Extraction completed!');
        
    } catch (error) {
        Logger.error('Extraction failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    extractOnly();
}
