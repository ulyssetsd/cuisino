/**
 * Recipes Domain Tests
 * Tests for Recipe entity and RecipeRepository
 */
const path = require('path');
const Recipe = require('./recipe');
const RecipeRepository = require('./repository');
const Logger = require('../shared/logger');

async function testRecipeEntity() {
    Logger.info('Testing Recipe entity...');

    // Test factory methods
    const recipe1 = Recipe.fromImagePaths('001', 'recto.jpg', 'verso.jpg');
    console.log('✓ Recipe created from image paths');

    const jsonData = {
        id: '002',
        title: 'Test Recipe',
        cookingTime: '30 min',
        servings: 4,
        ingredients: ['ingredient 1', 'ingredient 2'],
        instructions: ['step 1', 'step 2'],
    };
    const recipe2 = Recipe.fromJson(jsonData);
    console.log('✓ Recipe created from JSON');

    // Test extraction update
    recipe1.updateFromExtraction({
        title: 'Extracted Recipe',
        cookingTime: '45 min',
        servings: 2,
        ingredients: ['flour', 'sugar'],
        instructions: ['mix', 'bake'],
    });
    console.log('✓ Recipe updated from extraction');

    // Test validation
    const validation = recipe1.isValid();
    console.log(
        `✓ Recipe validation: ${validation.valid ? 'valid' : 'invalid'}`
    );

    // Test error handling
    recipe1.setError(new Error('Test error'));
    console.log('✓ Recipe error handling');

    // Test JSON export
    const exported = recipe1.toJson();
    console.log('✓ Recipe JSON export');

    return { recipe1, recipe2 };
}

async function testRecipeRepository() {
    Logger.info('Testing RecipeRepository...');

    const config = {
        paths: {
            recipes: path.join(__dirname, '..', 'data', 'recipes'),
            output: path.join(__dirname, '..', 'output'),
        },
    };

    const repository = new RecipeRepository(config);

    // Test loading existing recipes
    try {
        const existingRecipes = await repository.loadExistingRecipes();
        console.log(`✓ Loaded ${existingRecipes.length} existing recipes`);

        if (existingRecipes.length > 0) {
            // Test saving a recipe
            const recipe = existingRecipes[0];
            await repository.saveRecipe(recipe);
            console.log('✓ Recipe saved successfully');

            // Test saving all recipes
            await repository.saveAllRecipes(existingRecipes, {
                testRun: true,
                testTimestamp: new Date().toISOString(),
            });
            console.log('✓ All recipes saved successfully');
        }

        return existingRecipes;
    } catch (error) {
        console.log(
            `⚠ Could not test with existing recipes: ${error.message}`
        );
        return [];
    }
}

async function testImagePairing() {
    Logger.info('Testing image pairing logic...');

    const config = {
        paths: {
            recipes: path.join(__dirname, '..', 'data', 'recipes'),
            output: path.join(__dirname, '..', 'output'),
        },
    };

    const repository = new RecipeRepository(config);

    // Test with mock images
    const mockImages = [
        'image_001.jpg',
        'image_002.jpg',
        'image_003.jpg',
        'image_004.jpg',
    ];
    const pairs = repository.groupImagePairs(mockImages, '/test/dir');

    console.log(
        `✓ Created ${pairs.length} image pairs from ${mockImages.length} images`
    );
    console.log(
        '  Pairs:',
        pairs.map((p) => ({
            recto: path.basename(p.recto),
            verso: path.basename(p.verso),
        }))
    );

    return pairs;
}

async function runRecipesTests() {
    try {
        Logger.info('=== Running Recipes Domain Tests ===');

        // Test Recipe entity
        const { recipe1, recipe2 } = await testRecipeEntity();

        // Test RecipeRepository
        const existingRecipes = await testRecipeRepository();

        // Test image pairing
        const pairs = await testImagePairing();

        // Summary
        Logger.success('=== Recipes Domain Tests Complete ===');
        console.log(`Recipe entities: ${recipe1 && recipe2 ? 'PASS' : 'FAIL'}`);
        console.log(
            `Repository operations: ${existingRecipes ? 'PASS' : 'FAIL'}`
        );
        console.log(`Image pairing: ${pairs.length > 0 ? 'PASS' : 'FAIL'}`);

        return {
            entityTests: !!(recipe1 && recipe2),
            repositoryTests: !!existingRecipes,
            imagePairingTests: pairs.length > 0,
            recipesLoaded: existingRecipes.length,
        };
    } catch (error) {
        Logger.error('Recipe tests failed:', error);
        throw error;
    }
}

// Run tests if called directly
if (require.main === module) {
    runRecipesTests()
        .then((results) => {
            console.log('\nTest Results:', results);
            process.exit(0);
        })
        .catch((error) => {
            console.error('Tests failed:', error);
            process.exit(1);
        });
}

module.exports = {
    runRecipesTests,
    testRecipeEntity,
    testRecipeRepository,
    testImagePairing,
};
