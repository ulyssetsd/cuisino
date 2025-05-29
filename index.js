require('dotenv').config();
const RecipeProcessor = require('./src/RecipeProcessor');

async function main() {
    try {
        console.log('🍳 Démarrage du traitement des recettes...');
        
        const processor = new RecipeProcessor();
        await processor.processAllRecipes();
        
        console.log('✅ Traitement terminé avec succès !');
    } catch (error) {
        console.error('❌ Erreur lors du traitement :', error);
        process.exit(1);
    }
}

// Exécution du programme principal
if (require.main === module) {
    main();
}

module.exports = { main };
