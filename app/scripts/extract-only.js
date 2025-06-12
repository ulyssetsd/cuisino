/**
 * Extraction-only script
 * Process only the extraction phase
 */
require('dotenv').config();
import config from '../shared/config';
import RecipeRepository from '../recipes/repository';
import ExtractionOrchestrator from '../extraction/orchestrator';
import { section, success, error as _error } from '../shared/logger';

async function extractOnly() {
    try {
        section('🤖 Extraction Only Mode');

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

        success('Extraction completed!');
    } catch (error) {
        _error('Extraction failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    extractOnly();
}
