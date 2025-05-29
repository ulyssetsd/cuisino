/**
 * Point d'entrée principal - Architecture DDD
 * Remplace l'ancienne architecture monolithique par la nouvelle architecture modulaire
 */
require('dotenv').config();
const RecipeService = require('./src/services/RecipeService');

async function main() {
    try {
        console.log('🍳 Cuisino Recipe Processor - Architecture DDD');
        console.log('================================================\n');
        
        const recipeService = new RecipeService();
        await recipeService.processAllRecipes();
        
        console.log('\n✨ Traitement terminé avec succès !');
    } catch (error) {
        console.error('\n💥 Erreur lors du traitement:', error.message);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Gestion des signaux
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt demandé par l\'utilisateur');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Rejection non gérée:', reason);
    process.exit(1);
});

// Exécution du programme principal
if (require.main === module) {
    main();
}

module.exports = { main };
