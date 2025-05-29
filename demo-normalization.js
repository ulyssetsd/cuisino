#!/usr/bin/env node

/**
 * Démonstration de normalisation avec des données brutes typiques
 * Simule des données extraites avec des unités non standardisées
 */

const DataQualityValidator = require('./src/DataQualityValidator');

const testConfig = {
    dataQuality: {
        enabled: true,
        validateIngredients: true,
        autoCorrection: true
    }
};

console.log('📊 Démonstration de normalisation avec données brutes\n');

const validator = new DataQualityValidator(null, testConfig);

// Simulation de données brutes typiques (comme elles pourraient sortir de l'OCR)
const rawRecipes = [
    {
        title: "Recette simulée #1 - Pâtes à la sauce tomate",
        ingredients: [
            { name: "pâtes", quantity: { value: 500, unit: "g" } },
            { name: "tomates", quantity: { value: 1, unit: "conserve" } },
            { name: "ail", quantity: { value: 2, unit: "gousses" } },
            { name: "huile d'olive", quantity: { value: 3, unit: "cuillères à soupe" } },
            { name: "basilic", quantity: { value: 10, unit: "feuilles" } },
            { name: "parmesan", quantity: { value: 100, unit: "g" } }
        ]
    },
    {
        title: "Recette simulée #2 - Salade de légumes",
        ingredients: [
            { name: "tomates cerises", quantity: { value: 200, unit: "g" } },
            { name: "concombre", quantity: { value: 1, unit: "pièces" } },
            { name: "radis", quantity: { value: 6, unit: "pieces" } },
            { name: "persil", quantity: { value: 1, unit: "botte" } },
            { name: "ciboulette", quantity: { value: 3, unit: "tiges" } },
            { name: "vinaigrette", quantity: { value: 2, unit: "cuillères à café" } },
            { name: "fromage de chèvre", quantity: { value: 1, unit: "pot" } }
        ]
    },
    {
        title: "Recette simulée #3 - Soupe de légumes",
        ingredients: [
            { name: "bouillon de légumes", quantity: { value: 1, unit: "cube" } },
            { name: "eau", quantity: { value: 1, unit: "l" } },
            { name: "carottes", quantity: { value: 2, unit: "pièce(s)" } },
            { name: "poireaux", quantity: { value: 1, unit: "pièce" } },
            { name: "persil", quantity: { value: 5, unit: "branches" } },
            { name: "épices", quantity: { value: 1, unit: "sachet(s)" } },
            { name: "crème fraîche", quantity: { value: 1, unit: "flacon" } }
        ]
    }
];

console.log('🧪 Test avec données brutes contenant des unités non standardisées :\n');

let totalIngredients = 0;
let totalNormalizations = 0;

rawRecipes.forEach((recipe, recipeIndex) => {
    console.log(`📖 ${recipe.title}`);
    
    // Avant normalisation
    console.log('   📝 Ingrédients avant normalisation :');
    recipe.ingredients.forEach((ing, index) => {
        console.log(`   ${index + 1}. ${ing.name}: ${ing.quantity.value} ${ing.quantity.unit}`);
    });
    
    // Normalisation
    const normalizedRecipe = validator.normalizeRecipeUnits(recipe);
    let recipeNormalizations = 0;
    
    normalizedRecipe.ingredients.forEach((ing, index) => {
        const original = recipe.ingredients[index];
        if (original.quantity.unit !== ing.quantity.unit) {
            recipeNormalizations++;
        }
    });
    
    totalIngredients += recipe.ingredients.length;
    totalNormalizations += recipeNormalizations;
    
    // Après normalisation
    console.log('   ✨ Ingrédients après normalisation :');
    normalizedRecipe.ingredients.forEach((ing, index) => {
        const original = recipe.ingredients[index];
        const changed = original.quantity.unit !== ing.quantity.unit;
        const symbol = changed ? '📝' : '   ';
        console.log(`   ${symbol} ${index + 1}. ${ing.name}: ${ing.quantity.value} ${ing.quantity.unit}`);
    });
    
    // Validation
    const issues = validator.detectDataQualityIssues(normalizedRecipe);
    if (issues.length === 0) {
        console.log('   ✅ Toutes les unités sont maintenant valides');
    } else {
        console.log(`   ⚠️  ${issues.length} problème(s) restant(s)`);
    }
    
    console.log('');
});

console.log('📈 RÉSULTATS GLOBAUX');
console.log(`   • ${rawRecipes.length} recettes simulées`);
console.log(`   • ${totalIngredients} ingrédients total`);
console.log(`   • ${totalNormalizations} normalisations effectuées`);
console.log(`   • ${(totalNormalizations / totalIngredients * 100).toFixed(1)}% d'ingrédients normalisés`);

console.log('\n🔍 EXEMPLES DE MAPPINGS UTILISÉS :');
const exampleMappings = [
    'conserve → boîte',
    'gousses → gousse', 
    'cuillères à soupe → cs',
    'feuilles → tige',
    'pièces → pièce',
    'pieces → pièce',
    'tiges → tige',
    'cuillères à café → cc',
    'pot → boîte',
    'pièce(s) → pièce',
    'branches → tige',
    'sachet(s) → sachet',
    'flacon → boîte'
];

exampleMappings.forEach(mapping => {
    console.log(`   📝 ${mapping}`);
});

console.log('\n🎉 Démonstration terminée !');
console.log('\n💡 La normalisation permet de :');
console.log('   • Standardiser les unités pour une base de données cohérente');
console.log('   • Éviter les doublons d\'unités (cs vs cuillère à soupe)');
console.log('   • Faciliter les recherches et analyses ultérieures');
console.log('   • Optimiser l\'espace de stockage avec des unités courtes');
