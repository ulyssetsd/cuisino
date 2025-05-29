/**
 * Clean metadata duplication script
 * Removes duplicated file paths from recipe metadata
 */
require('dotenv').config();
const config = require('../shared/config');
const RecipeRepository = require('../recipes/repository');
const Logger = require('../shared/logger');

async function cleanMetadata() {
    try {
        console.log('🧹 Starting metadata cleanup...');
        Logger.section('🧹 Cleaning Metadata Duplication');
        
        const recipeRepo = new RecipeRepository(config);
        
        // Load existing recipes
        console.log('Loading existing recipes...');
        const recipes = await recipeRepo.loadExistingRecipes();
        Logger.info(`Loaded ${recipes.length} existing recipes`);
        
        let cleanedCount = 0;
        
        // Clean each recipe's metadata
        for (const recipe of recipes) {
            let needsCleaning = false;
            
            // Check for duplication
            if (recipe.metadata?.originalFiles && 
                (recipe.metadata.rectoPath !== undefined || recipe.metadata.versoPath !== undefined)) {
                
                Logger.info(`Cleaning metadata for recipe ${recipe.id}: "${recipe.title}"`);
                
                // Remove duplicated properties
                delete recipe.metadata.rectoPath;
                delete recipe.metadata.versoPath;
                
                needsCleaning = true;
                cleanedCount++;
            }
            
            // Also clean any null values in originalFiles
            if (recipe.metadata?.originalFiles) {
                const originalFiles = recipe.metadata.originalFiles;
                if (originalFiles.recto === null || originalFiles.verso === null) {
                    Logger.info(`Fixing null values in originalFiles for recipe ${recipe.id}`);
                    
                    // If we have rectoPath/versoPath, use those instead
                    if (recipe.rectoPath && !originalFiles.recto) {
                        originalFiles.recto = recipe.rectoPath;
                        needsCleaning = true;
                    }
                    if (recipe.versoPath && !originalFiles.verso) {
                        originalFiles.verso = recipe.versoPath;
                        needsCleaning = true;
                    }
                }
            }
        }
        
        if (cleanedCount > 0) {
            // Save cleaned recipes
            await recipeRepo.saveRecipes(recipes);
            Logger.success(`Cleaned metadata for ${cleanedCount} recipes`);
        } else {
            Logger.info('No metadata cleaning needed');
        }
        
        // Show sample of clean metadata
        if (recipes.length > 0) {
            const sampleRecipe = recipes[0];
            Logger.info('Sample cleaned metadata:');
            console.log(JSON.stringify(sampleRecipe.metadata, null, 2));
        }
        
    } catch (error) {
        Logger.error('Metadata cleaning failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    cleanMetadata();
}

module.exports = cleanMetadata;
