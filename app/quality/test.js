/**
 * Quality domain tests
 */
const QualityValidator = require('./validator');

function testQualityDomain() {
    console.log('🧪 Testing Quality Domain...');

    const config = {
        quality: { validationThreshold: 0.8 },
    };

    const validator = new QualityValidator(config);

    // Test good recipe
    const goodRecipe = {
        title: 'Delicious Pasta',
        cookingTime: '25 min',
        servings: '4 portions',
        ingredients: [
            { name: 'Pasta', quantity: '400g', unit: 'g' },
            { name: 'Tomatoes', quantity: '2', unit: 'pieces' },
            { name: 'Garlic', quantity: '3', unit: 'cloves' },
        ],
        instructions: [
            'Boil water in a large pot',
            'Add pasta and cook for 10 minutes',
            'Prepare the sauce with tomatoes and garlic',
            'Mix pasta with sauce and serve hot',
        ],
        extracted: true,
        validated: false,
    };

    const goodResult = validator.validateRecipe(goodRecipe);
    if (!goodResult.passed) {
        throw new Error('Good recipe should pass validation');
    }

    // Test bad recipe
    const badRecipe = {
        title: 'Bad',
        cookingTime: null,
        servings: null,
        ingredients: [],
        instructions: ['Step'],
        extracted: true,
        validated: false,
    };

    const badResult = validator.validateRecipe(badRecipe);
    if (badResult.passed) {
        throw new Error('Bad recipe should fail validation');
    }

    if (badResult.issues.length === 0) {
        throw new Error('Bad recipe should have issues');
    }

    console.log('✅ Quality domain tests passed');
}

if (require.main === module) {
    try {
        testQualityDomain();
    } catch (error) {
        console.error('❌ Quality domain tests failed:', error.message);
        process.exit(1);
    }
}

module.exports = { testQualityDomain };
