require('dotenv').config();
const RecipeProcessor = require('./src/RecipeProcessor');

async function testSetup() {
    console.log('🧪 Test de la configuration...\n');
    
    // Vérifier les variables d'environnement
    console.log('📋 Configuration:');
    console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Configurée' : '❌ Manquante'}`);
    console.log(`   INPUT_DIR: ${process.env.INPUT_DIR || './recipes/uncompressed'}`);
    console.log(`   OUTPUT_DIR: ${process.env.OUTPUT_DIR || './output'}`);
    console.log(`   OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'gpt-4o'}`);
    
    if (!process.env.OPENAI_API_KEY) {
        console.log('\n❌ Erreur: OPENAI_API_KEY non configurée');
        console.log('💡 Solution: Copiez .env.example vers .env et ajoutez votre clé API');
        return;
    }
    
    try {
        const processor = new RecipeProcessor();
        
        // Test de lecture des images
        console.log('\n📂 Test de lecture des images...');
        const images = await processor.imageProcessor.getImagePairs(processor.inputDir);
        
        if (images.length === 0) {
            console.log('⚠️  Aucune image trouvée dans le dossier d\'entrée');
            console.log(`   Vérifiez que des images sont présentes dans: ${processor.inputDir}`);
        } else {
            console.log(`✅ ${images.length} paires d'images détectées`);
            
            // Afficher les premières paires
            images.slice(0, 3).forEach((pair, i) => {
                console.log(`   Paire ${i + 1}:`);
                console.log(`     Recto: ${pair.recto.split('\\').pop()}`);
                console.log(`     Verso: ${pair.verso.split('\\').pop()}`);
            });
            
            if (images.length > 3) {
                console.log(`   ... et ${images.length - 3} autres paires`);
            }
        }
        
        console.log('\n✅ Configuration OK - Prêt pour le traitement !');
        console.log('🚀 Lancez "npm start" pour commencer le traitement des recettes.');
        
    } catch (error) {
        console.error('\n❌ Erreur lors du test:', error.message);
    }
}

if (require.main === module) {
    testSetup();
}
