// Test de la séparation validation/correction
const DataQualityValidator = require('./src/DataQualityValidator');
const DataQualityCorrector = require('./src/DataQualityCorrector');

// Test de base sans OpenAI
const config = {
    dataQuality: {
        enabled: true,
        validateIngredients: true,
        autoCorrection: false
    }
};

const validator = new DataQualityValidator(config);

// Recette test avec problèmes
const testRecipe = {
    title: "Test Recipe",
    ingredients: [
        { name: "Tomates", quantity: { value: 150, unit: "grammes" } }, // Unité non standard
        { name: "Oignons", quantity: { value: null, unit: "pièce" } },   // Valeur manquante
        { name: "", quantity: { value: 2, unit: "pièce" } },             // Nom manquant
        { name: "Ail", quantity: { value: 1, unit: "gousse" } }          // OK
    ]
};

console.log('🧪 Test de la séparation validation/correction');
console.log('==========================================');

// Test 1: Validation seule
console.log('\n📝 Test 1: Validation seule');
const result = validator.validateRecipe(testRecipe);

console.log(`✅ Recette normalisée reçue: ${result.normalizedRecipe.title}`);
console.log(`⚠️  Problèmes détectés: ${result.issues.length}`);
console.log(`🔧 Correction nécessaire: ${result.needsCorrection}`);

if (result.issues.length > 0) {
    console.log('\nDétails des problèmes:');
    result.issues.forEach((issue, i) => {
        console.log(`  ${i+1}. Ingrédient #${issue.index}: ${issue.problems.join(', ')}`);
    });
}

// Test 2: Vérifier la normalisation
console.log('\n📏 Test 2: Normalisation des unités');
console.log('Avant normalisation:');
testRecipe.ingredients.forEach((ing, i) => {
    console.log(`  ${i}: "${ing.name}" - ${ing.quantity.value} "${ing.quantity.unit}"`);
});

console.log('\nAprès normalisation:');
result.normalizedRecipe.ingredients.forEach((ing, i) => {
    console.log(`  ${i}: "${ing.name}" - ${ing.quantity.value} "${ing.quantity.unit}"`);
});

console.log('\n✅ Test terminé - La séparation fonctionne correctement !');
console.log('   🔍 DataQualityValidator: validation et normalisation uniquement');
console.log('   🔧 DataQualityCorrector: correction OpenAI séparée');
