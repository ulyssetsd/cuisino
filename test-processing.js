require('dotenv').config();
const RecipeProcessor = require('./src/RecipeProcessor');

async function testProcessing() {
    console.log('🧪 Mode test - Traitement de quelques recettes...\n');
    
    if (!process.env.OPENAI_API_KEY) {
        console.log('❌ Erreur: OPENAI_API_KEY non configurée');
        console.log('💡 Solution: Ajoutez votre clé API dans le fichier .env');
        return;
    }
    
    try {
        const processor = new RecipeProcessor();
        
        // Modifier temporairement la configuration pour ne traiter que les 3 premières recettes
        processor.config.processing.testMode = true;
        const originalExtractRecipe = processor.recipeExtractor.extractRecipe;
        
        // Simuler le traitement pour le test (vous pouvez retirer cette partie pour un vrai test)
        processor.recipeExtractor.extractRecipe = async function(rectoPath, versoPath) {
            console.log('   🤖 Mode simulation activé (pas d\'appel API réel)');
            
            const testRecipe = {
                title: `Recette test - ${new Date().getTime()}`,
                subtitle: "Recette de test générée automatiquement",
                duration: "30 min",
                difficulty: 2,
                servings: 2,
                ingredients: [
                    { name: "Ingrédient test", quantity: { value: 100, unit: "g" } }
                ],
                allergens: ["Test"],
                steps: [
                    { text: "Étape de test", image: "step1.jpg" }
                ],
                nutrition: {
                    calories: "500 kcal",
                    lipides: "20g",
                    proteines: "25g"
                },
                tips: ["Conseil de test"],
                tags: ["Test"],
                image: "recipe_main.jpg",
                source: "HelloFresh"
            };
            
            // Simuler un délai d'API
            await new Promise(resolve => setTimeout(resolve, 1000));
            return testRecipe;
        };
        
        // Obtenir les images et ne traiter que les 3 premières paires
        const images = await processor.imageProcessor.getImagePairs(processor.inputDir);
        const testImages = images.slice(0, 3);
        
        console.log(`📸 Test avec ${testImages.length} paires d'images (sur ${images.length} disponibles)`);
        
        const recipes = [];
        
        for (let i = 0; i < testImages.length; i++) {
            const { recto, verso } = testImages[i];
            
            console.log(`\n🔄 Test recette ${i + 1}/${testImages.length}`);
            console.log(`   Recto: ${recto.split('\\').pop()}`);
            console.log(`   Verso: ${verso.split('\\').pop()}`);
            
            try {
                const recipe = await processor.recipeExtractor.extractRecipe(recto, verso);
                
                if (recipe) {
                    recipes.push(recipe);
                    console.log(`   ✅ Recette extraite: "${recipe.title}"`);
                } else {
                    console.log(`   ⚠️ Échec de l'extraction`);
                }
            } catch (error) {
                console.error(`   ❌ Erreur:`, error.message);
            }
            
            // Pause entre les tests
            if (i < testImages.length - 1) {
                console.log(`   ⏱️ Pause de 1s...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`\n✅ Test terminé !`);
        console.log(`📊 ${recipes.length}/${testImages.length} recettes extraites avec succès`);
        console.log('\n💡 Pour lancer le traitement complet avec l\'API OpenAI :');
        console.log('   1. Retirez la simulation dans test-processing.js');
        console.log('   2. Lancez "npm start" pour traiter toutes les recettes');
        
    } catch (error) {
        console.error('\n❌ Erreur lors du test:', error.message);
    }
}

if (require.main === module) {
    testProcessing();
}
