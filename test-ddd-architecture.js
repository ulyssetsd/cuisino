/**
 * Test de l'architecture DDD sans API OpenAI
 * Valide le chargement des recettes et l'analyse
 */
const RecipeRepository = require('./src/infrastructure/RecipeRepository');
const ConfigManager = require('./src/ConfigManager');
const Recipe = require('./src/domain/Recipe');

async function testArchitecture() {
    try {
        console.log('🧪 Test de l\'architecture DDD');
        console.log('==============================\n');

        // 1. Tester ConfigManager
        console.log('📋 Test ConfigManager...');
        const config = ConfigManager.getConfig();
        const paths = ConfigManager.getPaths();
        console.log(`   ✅ Configuration chargée`);
        console.log(`   📁 Dossier input: ${paths.input}`);
        console.log(`   📁 Dossier output: ${paths.output}\n`);

        // 2. Tester RecipeRepository
        console.log('🗄️  Test RecipeRepository...');
        const repository = new RecipeRepository(paths);
        await repository.ensureDirectories();
        console.log('   ✅ Dossiers vérifiés');

        // Charger les recettes existantes
        const recipes = await repository.loadAllRecipes();
        console.log(`   ✅ ${recipes.length} recettes chargées\n`);

        // 3. Analyser les recettes
        console.log('🔍 Analyse des recettes...');
        let needsExtraction = 0;
        let needsValidation = 0;
        let upToDate = 0;

        recipes.forEach(recipe => {
            if (recipe.needsExtraction()) {
                needsExtraction++;
            } else if (recipe._needsQualityCheck) {
                needsValidation++;
            } else {
                upToDate++;
            }
        });

        console.log(`   🔄 ${needsExtraction} recettes à extraire`);
        console.log(`   🔍 ${needsValidation} recettes à valider`);
        console.log(`   ✅ ${upToDate} recettes à jour\n`);

        // 4. Tester la création de Recipe
        console.log('🍳 Test création Recipe...');
        if (recipes.length > 0) {
            const firstRecipe = recipes[0];
            console.log(`   📝 Première recette: "${firstRecipe.title}"`);
            console.log(`   🏷️  ID: ${firstRecipe.id}`);
            console.log(`   ✅ State extracted: ${firstRecipe.isExtracted()}`);
            console.log(`   ⚠️  Needs extraction: ${firstRecipe.needsExtraction()}`);
            
            // Tester validation de base
            const validation = firstRecipe.isValid();
            console.log(`   ✅ Validation: ${validation.valid ? 'OK' : 'Erreurs: ' + validation.errors.join(', ')}`);
        }

        // 5. Test factory methods
        console.log('\n🏭 Test Factory Methods...');
        const testRecipeFromJson = Recipe.fromJson({
            id: 999,
            title: 'Test Recipe',
            ingredients: ['Test ingredient']
        });
        console.log(`   ✅ Recipe.fromJson: "${testRecipeFromJson.title}"`);

        const testRecipeFromImages = Recipe.fromImages('/test/recto.jpg', '/test/verso.jpg', 999);
        console.log(`   ✅ Recipe.fromImages: ID ${testRecipeFromImages.id}`);
        console.log(`   ⚠️  Needs extraction: ${testRecipeFromImages.needsExtraction()}`);

        console.log('\n🎉 Architecture DDD validée avec succès !');
        console.log('✨ Tous les composants fonctionnent correctement');
        
        return {
            totalRecipes: recipes.length,
            needsExtraction,
            needsValidation,
            upToDate,
            success: true
        };

    } catch (error) {
        console.error('\n💥 Erreur dans l\'architecture:', error.message);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        return { success: false, error: error.message };
    }
}

// Lancer le test
if (require.main === module) {
    testArchitecture();
}

module.exports = testArchitecture;
