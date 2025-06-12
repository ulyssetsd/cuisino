/**
 * Quality validation script
 * Process only the quality validation phase
 */
require('dotenv').config();
import config from '../shared/config';
import RecipeRepository from '../recipes/repository';
import QualityValidator from '../quality/validator';
import { section, warning, success, error as _error } from '../shared/logger';

async function validateQuality() {
    try {
        section('🔍 Quality Validation Mode');

        const recipeRepo = new RecipeRepository(config);
        const validator = new QualityValidator(config);

        const recipes = await recipeRepo.loadExistingRecipes();

        if (recipes.length === 0) {
            warning('No existing recipes found. Run extraction first.');
            return;
        }
        validator.validateRecipes(recipes);

        // Save updated recipes in batch
        await recipeRepo.saveRecipes(recipes);

        success('Quality validation completed!');
    } catch (error) {
        _error('Quality validation failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    validateQuality();
}
