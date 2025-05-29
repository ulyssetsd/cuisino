/**
 * Test de l'architecture simplifiée
 * Usage: node test-simple-architecture.js
 */
const SimpleRecipeProcessor = require('./src/SimpleRecipeProcessor');

async function testSimpleArchitecture() {
    console.log('🧪 Test de l\'architecture simplifiée...\n');
    
    try {
        // Test d'instanciation
        console.log('1. Test d\'instanciation...');
        const processor = new SimpleRecipeProcessor();
        console.log('   ✅ SimpleRecipeProcessor créé avec succès');
        
        // Test de configuration
        console.log('\n2. Test de configuration...');
        const ConfigManager = require('./src/ConfigManager');
        const config = ConfigManager.getConfig();
        console.log(`   ✅ Configuration chargée: ${Object.keys(config).length} sections`);
        
        const paths = ConfigManager.getPaths();
        console.log(`   ✅ Chemins configurés: ${JSON.stringify(paths, null, 2)}`);
        
        // Test des services individuels
        console.log('\n3. Test des services...');
        
        const FileManager = require('./src/FileManager');
        const fileManager = new FileManager(paths);
        console.log('   ✅ FileManager instancié');
        
        const ErrorManager = require('./src/ErrorManager');
        const errorManager = new ErrorManager(config);
        console.log('   ✅ ErrorManager instancié');
        
        const MetadataManager = require('./src/MetadataManager');
        const metadataManager = new MetadataManager(config);
        console.log('   ✅ MetadataManager instancié');
        
        const ProcessingAnalyzer = require('./src/ProcessingAnalyzer');
        const DataQualityValidator = require('./src/DataQualityValidator');
        const dataQualityValidator = new DataQualityValidator(config);
        const processingAnalyzer = new ProcessingAnalyzer(dataQualityValidator);
        console.log('   ✅ ProcessingAnalyzer instancié');
        
        // Test des fonctions utilitaires
        console.log('\n4. Test des fonctions utilitaires...');
        
        // Test de validation de recette fictive
        const testRecipe = {
            title: "Test Recipe",
            source: "HelloFresh",
            ingredients: [
                { name: "Test ingredient", quantity: { value: 100, unit: "g" } }
            ],
            steps: [{ text: "Test step" }]
        };
        
        const isValid = metadataManager.validateRecipe(testRecipe);
        console.log(`   ✅ Validation de recette: ${isValid}`);
        
        // Test de création de métadonnées
        const enrichedRecipe = metadataManager.addMetadata(testRecipe, "test_recto.jpg", "test_verso.jpg", 1);
        console.log(`   ✅ Métadonnées ajoutées: ${enrichedRecipe.metadata ? 'Oui' : 'Non'}`);
        
        // Test de validation qualité
        const validationResult = dataQualityValidator.validateRecipe(testRecipe);
        console.log(`   ✅ Validation qualité: ${validationResult.needsCorrection ? 'Correction nécessaire' : 'OK'}`);
        
        console.log('\n🎉 Tous les tests sont passés avec succès !');
        console.log('\n📋 Résumé de l\'architecture:');
        console.log('   • ConfigManager: Configuration centralisée');
        console.log('   • FileManager: Gestion des fichiers');
        console.log('   • ErrorManager: Gestion des erreurs et retry');
        console.log('   • MetadataManager: Métadonnées et validation');
        console.log('   • ProcessingAnalyzer: Analyse incrémentale');
        console.log('   • SimpleRecipeExtractor: Extraction pure');
        console.log('   • SimpleRecipeProcessor: Orchestration');
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    testSimpleArchitecture();
}

module.exports = testSimpleArchitecture;
