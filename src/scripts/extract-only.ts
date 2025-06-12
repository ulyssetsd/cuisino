/**
 * Extraction-only script
 * Process only the extraction phase
 */
import 'dotenv/config';
import config from '../shared/config.js';
import RecipeRepository from '../recipes/repository.js';
import ExtractionOrchestrator from '../extraction/orchestrator.js';
import { section, success, error as _error } from '../shared/logger.js';

async function extractOnly(): Promise<void> {
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
        _error('Extraction failed:', (error as Error).message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    extractOnly();
}
