/**
 * Point d'entrée principal - Architecture DDD
 * Nouvelle version simplifiée utilisant RecipeService
 */
const RecipeService = require('./services/RecipeService');
const ConfigManager = require('./ConfigManager');

async function main() {
    try {        console.log('🍳 Cuisino Recipe Processor - Architecture DDD');
        console.log('================================================\n');

        // Vérifier la configuration (le ConfigManager se charge automatiquement)
        const config = ConfigManager.getConfig();
        console.log('📋 Configuration chargée');
        
        // Créer et lancer le service principal
        const recipeService = new RecipeService();
        await recipeService.processAllRecipes();

        console.log('\n✨ Traitement terminé avec succès !');
        
    } catch (error) {
        console.error('\n💥 Erreur fatale:', error.message);
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

// Lancer le programme
if (require.main === module) {
    main();
}

module.exports = main;
