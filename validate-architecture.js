/**
 * Complete Architecture Validation
 * Tests all vertical domains and their integration
 */
const path = require('path');
const Logger = require('./shared/logger');

// Import all domain test modules
const { runRecipesTests } = require('./recipes/test');
const { testQualityDomain } = require('./quality/test');

async function validateCompleteArchitecture() {
    Logger.info('🏗️  === Complete Architecture Validation ===');
    
    const results = {
        recipes: false,
        quality: false,
        shared: false,
        integration: false,
        performance: { startTime: Date.now() }
    };
    
    try {
        // Test 1: Recipes Domain
        Logger.info('🔹 Testing Recipes Domain');
        const recipeResults = await runRecipesTests();
        results.recipes = recipeResults.entityTests && recipeResults.repositoryTests;
        Logger.success(`Recipes Domain: ${results.recipes ? 'PASS' : 'FAIL'}`);
        
        // Test 2: Quality Domain
        Logger.info('🔹 Testing Quality Domain');
        try {
            await testQualityDomain();
            results.quality = true;
            Logger.success('Quality Domain: PASS');
        } catch (error) {
            Logger.error('Quality Domain: FAIL', error.message);
            results.quality = false;
        }
        
        // Test 3: Shared Utilities
        Logger.info('🔹 Testing Shared Utilities');
        results.shared = await testSharedUtilities();
        Logger.success(`Shared Utilities: ${results.shared ? 'PASS' : 'FAIL'}`);
        
        // Test 4: Integration
        Logger.info('🔹 Testing Cross-Domain Integration');
        results.integration = await testIntegration();
        Logger.success(`Integration: ${results.integration ? 'PASS' : 'FAIL'}`);
        
        // Performance metrics
        results.performance.endTime = Date.now();
        results.performance.totalTime = results.performance.endTime - results.performance.startTime;
        
        // Final Report
        generateValidationReport(results);
        
        return results;
        
    } catch (error) {
        Logger.error('Architecture validation failed:', error);
        throw error;
    }
}

async function testSharedUtilities() {
    const Config = require('./shared/config');
    const FileSystem = require('./shared/filesystem');
    
    // Test Config
    const config = Config.load();
    if (!config || !config.paths) {
        throw new Error('Config loading failed');
    }
    console.log('✓ Config utility working');
    
    // Test FileSystem
    const testDir = path.join(__dirname, 'temp', 'test');
    await FileSystem.ensureDir(testDir);
    
    const testFile = path.join(testDir, 'test.json');
    const testData = { test: true, timestamp: new Date().toISOString() };
    
    await FileSystem.writeJson(testFile, testData);
    const loadedData = await FileSystem.readJson(testFile);
    
    if (!loadedData || loadedData.test !== true) {
        throw new Error('FileSystem JSON operations failed');
    }
    console.log('✓ FileSystem utility working');
    
    return true;
}

async function testIntegration() {
    const Recipe = require('./recipes/recipe');
    const QualityValidator = require('./quality/validator');
    const config = require('./shared/config').load();
    
    // Create a test recipe
    const recipe = Recipe.fromJson({
        id: 'test-001',
        title: 'Integration Test Recipe',
        cookingTime: '30 min',
        servings: 4,
        ingredients: ['flour', 'sugar', 'eggs'],
        instructions: ['mix ingredients', 'bake for 30 minutes']
    });
    
    // Validate with quality system
    const validator = new QualityValidator(config);
    const qualityResult = validator.validateRecipe(recipe);
    
    if (!qualityResult || typeof qualityResult.score !== 'number') {
        throw new Error('Quality validation integration failed');
    }
    
    console.log(`✓ Recipe-Quality integration working (score: ${qualityResult.score})`);
    
    // Test recipe serialization/deserialization
    const exported = recipe.toJson();
    const imported = Recipe.fromJson(exported);
    
    if (imported.title !== recipe.title || imported.id !== recipe.id) {
        throw new Error('Recipe serialization integration failed');
    }
    
    console.log('✓ Recipe serialization integration working');
    
    return true;
}

function generateValidationReport(results) {
    Logger.info('📊 === Architecture Validation Report ===');
    
    const domains = [
        { name: 'Recipes Domain', status: results.recipes },
        { name: 'Quality Domain', status: results.quality },
        { name: 'Shared Utilities', status: results.shared },
        { name: 'Cross-Domain Integration', status: results.integration }
    ];
    
    const passCount = domains.filter(d => d.status).length;
    const totalCount = domains.length;
    const passRate = ((passCount / totalCount) * 100).toFixed(1);
    
    console.log('\n🔍 Domain Status:');
    domains.forEach(domain => {
        const status = domain.status ? '✅ PASS' : '❌ FAIL';
        console.log(`   ${domain.name}: ${status}`);
    });
    
    console.log(`\n📈 Overall Results:`);
    console.log(`   Pass Rate: ${passRate}% (${passCount}/${totalCount})`);
    console.log(`   Execution Time: ${results.performance.totalTime}ms`);
    
    const overallSuccess = passCount === totalCount;
    console.log(`\n🎯 Architecture Status: ${overallSuccess ? '✅ HEALTHY' : '⚠️  NEEDS ATTENTION'}`);
    
    if (overallSuccess) {
            if (overallSuccess) {
        Logger.success('🎉 All systems operational! Architecture is ready for production.');
    } else {
        Logger.warn('⚠️  Some components need attention before production deployment.');
    }
    
    return results;
}

// Run validation if called directly
if (require.main === module) {
    validateCompleteArchitecture()
        .then(results => {
            const success = Object.values(results).filter(v => typeof v === 'boolean').every(v => v);
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Validation failed:', error);
            process.exit(1);
        });
}

module.exports = { validateCompleteArchitecture };
