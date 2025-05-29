#!/usr/bin/env node

/**
 * Test de la normalisation des unités
 * Vérifie que le système normalise correctement les unités vers leurs formats standards
 */

const path = require('path');
const DataQualityValidator = require('./src/DataQualityValidator');

// Configuration fictive pour les tests
const testConfig = {
    dataQuality: {
        enabled: true,
        validateIngredients: true,
        autoCorrection: true
    }
};

async function testUnitNormalization() {
    console.log('🧪 Test de la normalisation des unités\n');
    
    // Créer une instance du validateur (sans OpenAI client pour ce test)
    const validator = new DataQualityValidator(null, testConfig);
    
    // Test des cas de normalisation unitaire
    console.log('📋 Tests de normalisation unitaire :');
    const testCases = [
        // Cuillères
        { input: 'cuillère à soupe', expected: 'cs' },
        { input: 'cuillères à soupe', expected: 'cs' },
        { input: 'c. à soupe', expected: 'cs' },
        { input: 'cuillère à café', expected: 'cc' },
        { input: 'cuillères à café', expected: 'cc' },
        { input: 'c. à café', expected: 'cc' },
        
        // Pièces
        { input: 'pièces', expected: 'pièce' },
        { input: 'pieces', expected: 'pièce' },
        { input: 'pc', expected: 'pièce' },
        { input: 'unité', expected: 'pièce' },
        { input: 'unités', expected: 'pièce' },
        
        // Containers
        { input: 'conserve', expected: 'boîte' },
        { input: 'pot', expected: 'boîte' },
        { input: 'flacon', expected: 'boîte' },
        { input: 'sachets', expected: 'sachet' },
        { input: 'paquet', expected: 'sachet' },
        
        // Végétaux
        { input: 'gousses', expected: 'gousse' },
        { input: 'tiges', expected: 'tige' },
        { input: 'tranches', expected: 'tranche' },
        { input: 'branches', expected: 'tige' },
        { input: 'feuilles', expected: 'tige' },
        
        // Unités déjà standard (doivent rester inchangées)
        { input: 'g', expected: 'g' },
        { input: 'ml', expected: 'ml' },
        { input: 'cs', expected: 'cs' },
        { input: 'pièce', expected: 'pièce' }
    ];
    
    let passed = 0;
    let failed = 0;
    
    testCases.forEach(testCase => {
        const result = validator.normalizeUnit(testCase.input);
        const success = result === testCase.expected;
        
        console.log(`   ${success ? '✅' : '❌'} "${testCase.input}" → "${result}" (attendu: "${testCase.expected}")`);
        
        if (success) {
            passed++;
        } else {
            failed++;
        }
    });
    
    console.log(`\n📊 Résultats : ${passed} réussis, ${failed} échoués\n`);
    
    // Test avec une recette complète
    console.log('🍳 Test de normalisation sur une recette complète :');
    
    const testRecipe = {
        title: "Test de normalisation",
        ingredients: [
            {
                name: "farine",
                quantity: { value: 250, unit: "g" }
            },
            {
                name: "beurre",
                quantity: { value: 2, unit: "cuillères à soupe" }
            },
            {
                name: "ail",
                quantity: { value: 3, unit: "gousses" }
            },
            {
                name: "champignons",
                quantity: { value: 200, unit: "g" }
            },
            {
                name: "jambon",
                quantity: { value: 4, unit: "tranches" }
            },
            {
                name: "persil",
                quantity: { value: 1, unit: "botte" }
            },
            {
                name: "tomates",
                quantity: { value: 1, unit: "conserve" }
            },
            {
                name: "basilic",
                quantity: { value: 2, unit: "feuilles" }
            }
        ]
    };
    
    console.log('   📝 Ingrédients avant normalisation :');
    testRecipe.ingredients.forEach((ing, index) => {
        console.log(`   ${index + 1}. ${ing.name}: ${ing.quantity.value} ${ing.quantity.unit}`);
    });
    
    const normalizedRecipe = validator.normalizeRecipeUnits(testRecipe);
    
    console.log('\n   ✨ Ingrédients après normalisation :');
    normalizedRecipe.ingredients.forEach((ing, index) => {
        const original = testRecipe.ingredients[index];
        const changed = original.quantity.unit !== ing.quantity.unit;
        const symbol = changed ? '📝' : '   ';
        console.log(`   ${symbol} ${index + 1}. ${ing.name}: ${ing.quantity.value} ${ing.quantity.unit}`);
    });
    
    // Vérifier que la validation accepte maintenant toutes les unités
    console.log('\n🔍 Test de validation des unités normalisées :');
    const issues = validator.detectDataQualityIssues(normalizedRecipe);
    
    if (issues.length === 0) {
        console.log('   ✅ Toutes les unités sont maintenant valides après normalisation');
    } else {
        console.log(`   ⚠️  ${issues.length} problème(s) restant(s) après normalisation :`);
        issues.forEach(issue => {
            console.log(`   - ${issue.ingredient.name}: ${issue.problems.join(', ')}`);
        });
    }
    
    console.log('\n🎉 Test de normalisation terminé !');
}

// Exécuter le test
testUnitNormalization().catch(error => {
    console.error('❌ Erreur durant le test :', error);
    process.exit(1);
});
