/**
 * Quality validation script
 * Process only the quality validation phase
 */
require('dotenv').config();
const config = require('../shared/config');
const RecipeRepository = require('../recipes/repository');
const QualityValidator = require('../quality/validator');
const Logger = require('../shared/logger');

async function validateQuality() {
    try {
        Logger.section('🔍 Quality Validation Mode');
        
        const recipeRepo = new RecipeRepository(config);
        const validator = new QualityValidator(config);
        
        const recipes = await recipeRepo.loadExistingRecipes();
        
        if (recipes.length === 0) {
            Logger.warning('No existing recipes found. Run extraction first.');
            return;
        }
        
        validator.validateRecipes(recipes);
        
        // Save updated recipes
        for (const recipe of recipes) {
            await recipeRepo.saveRecipe(recipe);
        }
        
        Logger.success('Quality validation completed!');
        
    } catch (error) {
        Logger.error('Quality validation failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    validateQuality();
}
