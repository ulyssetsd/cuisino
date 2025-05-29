/**
 * Simple Architecture Test
 * Quick validation of all domains
 */
const Logger = require('./shared/logger');

async function runQuickValidation() {
    Logger.info('🔹 Quick Architecture Validation');
    Logger.info('──────────────────────────────────────────────────');
    
    const results = {};
    
    try {
        // Test Recipes Domain
        Logger.info('Testing Recipes...');
        const { runRecipesTests } = require('./recipes/test');
        const recipeResults = await runRecipesTests();
        results.recipes = recipeResults.entityTests && recipeResults.repositoryTests;
        console.log(`📦 Recipes: ${results.recipes ? '✅ PASS' : '❌ FAIL'}`);
        
        // Test Quality Domain
        Logger.info('Testing Quality...');
        const QualityValidator = require('./quality/validator');
        const config = require('./shared/config');
        const validator = new QualityValidator(config);
        
        const testRecipe = {
            id: 'test',
            title: 'Test Recipe',
            ingredients: ['flour', 'eggs'],
            instructions: ['mix', 'cook'],
            cookingTime: '30 min',
            servings: 4
        };
        
        const score = validator.calculateQualityScore(testRecipe);
        results.quality = score.overall > 0;
        console.log(`🔍 Quality: ${results.quality ? '✅ PASS' : '❌ FAIL'} (Score: ${score.overall})`);
        
        // Test Analysis Domain
        Logger.info('Testing Analysis...');
        const AnalysisService = require('./analysis/service');
        const analysisService = new AnalysisService(config);
        
        const testRecipes = [testRecipe];
        const analysis = analysisService.generateAnalysis(testRecipes);
        results.analysis = analysis.totalRecipes === 1;
        console.log(`📊 Analysis: ${results.analysis ? '✅ PASS' : '❌ FAIL'}`);
        
        // Test Images Domain
        Logger.info('Testing Images...');
        const ImageProcessor = require('./images/processor');
        const imageProcessor = new ImageProcessor(config);
        
        const costEstimate = imageProcessor.estimateCosts(['test.jpg'], { averageSizeKB: 1000 });
        results.images = costEstimate.totalCost > 0;
        console.log(`🖼️  Images: ${results.images ? '✅ PASS' : '❌ FAIL'}`);
        
        // Overall result
        const allPassed = Object.values(results).every(Boolean);
        
        Logger.info('──────────────────────────────────────────────────');
        console.log(`🏗️  Overall Architecture: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
        
        if (allPassed) {
            Logger.success('🎉 All domains are working correctly!');
            Logger.info('The vertical slice architecture is fully functional.');
        } else {
            Logger.warn('⚠️  Some domains need attention.');
        }
        
        return { ...results, overall: allPassed };
        
    } catch (error) {
        Logger.error('Validation failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    runQuickValidation()
        .then(results => {
            process.exit(results.overall ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Validation failed:', error);
            process.exit(1);
        });
}

module.exports = { runQuickValidation };
