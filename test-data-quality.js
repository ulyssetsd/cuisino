require('dotenv').config();
const RecipeProcessor = require('./src/RecipeProcessor');

async function testDataQuality() {
    console.log('🧪 Test de la vérification qualité des données...\n');
    
    if (!process.env.OPENAI_API_KEY) {
        console.log('❌ Erreur: OPENAI_API_KEY non configurée');
        console.log('💡 Solution: Ajoutez votre clé API dans le fichier .env');
        return;
    }
    
    try {
        const processor = new RecipeProcessor();
        
        // Vérifier la configuration de qualité des données
        console.log('📋 Configuration qualité des données:');
        const dataQualityConfig = processor.config.dataQuality;
        console.log(`   Validation activée: ${dataQualityConfig?.enabled ? '✅' : '❌'}`);
        console.log(`   Validation ingrédients: ${dataQualityConfig?.validateIngredients ? '✅' : '❌'}`);
        console.log(`   Auto-correction: ${dataQualityConfig?.autoCorrection ? '✅' : '❌'}`);
        
        // Obtenir les images et ne traiter que la première paire pour le test
        const images = await processor.imageProcessor.getImagePairs(processor.inputDir);
        
        if (images.length === 0) {
            console.log('\n⚠️  Aucune image trouvée pour le test');
            return;
        }
        
        const testImage = images[0];
        console.log(`\n🔄 Test avec la première recette:`);
        console.log(`   Recto: ${testImage.recto.split('\\').pop()}`);
        console.log(`   Verso: ${testImage.verso.split('\\').pop()}`);
          try {
            console.log('\n🤖 Extraction avec vérification qualité...');
            
            // Utiliser processRecipeWithRetry pour s'assurer que toute la chaîne fonctionne
            const recipe = await processor.processRecipeWithRetry(
                testImage.recto, 
                testImage.verso, 
                1
            );
            
            if (recipe) {
                console.log(`\n✅ Recette extraite: "${recipe.title}"`);
                
                // Analyser la qualité des ingrédients résultants
                console.log('\n📊 Analyse de la qualité des ingrédients:');
                console.log(`   Nombre d'ingrédients: ${recipe.ingredients.length}`);
                
                let completeIngredients = 0;
                let incompleteIngredients = 0;
                
                recipe.ingredients.forEach((ingredient, i) => {
                    const hasName = ingredient.name && ingredient.name.trim() !== '';
                    const hasValidQuantity = ingredient.quantity && 
                        (ingredient.quantity.value !== null || ingredient.quantity.unit === '');
                    const hasUnit = ingredient.quantity && ingredient.quantity.unit !== undefined;
                    
                    if (hasName && hasValidQuantity && hasUnit) {
                        completeIngredients++;
                    } else {
                        incompleteIngredients++;
                        console.log(`   ⚠️  Ingrédient ${i + 1}: "${ingredient.name}" - ${ingredient.quantity?.value} ${ingredient.quantity?.unit}`);
                    }
                });
                
                console.log(`   Ingrédients complets: ${completeIngredients}/${recipe.ingredients.length}`);
                console.log(`   Ingrédients incomplets: ${incompleteIngredients}/${recipe.ingredients.length}`);
                
                if (incompleteIngredients === 0) {
                    console.log('   🎉 Tous les ingrédients sont de qualité optimale !');
                } else {
                    console.log('   📝 Des améliorations de qualité ont été apportées ou sont nécessaires');
                }
                
            } else {
                console.log('\n❌ Échec de l\'extraction');
            }
            
        } catch (error) {
            console.error('\n❌ Erreur lors de l\'extraction:', error.message);
        }
        
        console.log('\n✅ Test de qualité des données terminé !');
        console.log('🚀 Pour traiter toutes les recettes avec validation: npm start');
        
    } catch (error) {
        console.error('\n❌ Erreur lors du test:', error.message);
    }
}

if (require.main === module) {
    testDataQuality();
}

module.exports = { testDataQuality };
