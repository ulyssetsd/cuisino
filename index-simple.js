/**
 * Exemple d'utilisation de la nouvelle architecture simplifiée
 * Point d'entrée pour remplacer index.js
 */
const SimpleRecipeProcessor = require('./src/SimpleRecipeProcessor');

async function main() {
    console.log('🍳 Cuisino - Extracteur de recettes HelloFresh');
    console.log('📋 Architecture simplifiée v2.0\n');
    
    try {
        // Créer le processeur (toute la configuration est gérée automatiquement)
        const processor = new SimpleRecipeProcessor();
        
        // Lancer le traitement
        const recipes = await processor.processAllRecipes();
        
        console.log(`\n🎯 Traitement terminé: ${recipes.length} recettes extraites`);
        
    } catch (error) {
        console.error('❌ Erreur lors du traitement:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    main();
}

module.exports = main;
