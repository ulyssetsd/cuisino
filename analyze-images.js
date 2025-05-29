require('dotenv').config();
const path = require('path');
const fs = require('fs-extra');

// Import manual du module ImageProcessor
const ImageProcessor = require('./src/ImageProcessor');

async function analyzeImages() {
    console.log('🔍 Analyse des images...\n');
    
    try {
        const imageProcessor = new ImageProcessor();
        const inputDir = process.env.INPUT_DIR || './recipes/compressed';
        
        // Analyser les paires d'images
        const images = await imageProcessor.getImagePairs(inputDir);
        
        console.log('📊 Résumé de l\'analyse:');
        console.log(`   📁 Dossier analysé: ${inputDir}`);
        console.log(`   📸 Total d'images: ${images.length * 2}`);
        console.log(`   🔗 Paires formées: ${images.length}`);
        
        // Afficher des informations sur les fichiers
        console.log('\n📋 Détail des paires:');
        
        for (let i = 0; i < Math.min(images.length, 10); i++) {
            const { recto, verso } = images[i];
            
            // Obtenir les informations des fichiers
            const rectoStats = await fs.stat(recto);
            const versoStats = await fs.stat(verso);
            
            console.log(`\n   Paire ${i + 1}:`);
            console.log(`     📄 Recto: ${path.basename(recto)}`);
            console.log(`       📏 Taille: ${Math.round(rectoStats.size / 1024)}KB`);
            console.log(`       📅 Modifié: ${rectoStats.mtime.toLocaleString('fr-FR')}`);
            console.log(`     📄 Verso: ${path.basename(verso)}`);
            console.log(`       📏 Taille: ${Math.round(versoStats.size / 1024)}KB`);
            console.log(`       📅 Modifié: ${versoStats.mtime.toLocaleString('fr-FR')}`);
        }
        
        if (images.length > 10) {
            console.log(`\n   ... et ${images.length - 10} autres paires`);
        }
        
        // Calculer les statistiques de taille
        let totalSize = 0;
        let minSize = Infinity;
        let maxSize = 0;
        
        for (const { recto, verso } of images) {
            const rectoSize = (await fs.stat(recto)).size;
            const versoSize = (await fs.stat(verso)).size;
            
            totalSize += rectoSize + versoSize;
            minSize = Math.min(minSize, rectoSize, versoSize);
            maxSize = Math.max(maxSize, rectoSize, versoSize);
        }
        
        console.log('\n📈 Statistiques des fichiers:');
        console.log(`   📦 Taille totale: ${Math.round(totalSize / (1024 * 1024))}MB`);
        console.log(`   📏 Taille min: ${Math.round(minSize / 1024)}KB`);
        console.log(`   📏 Taille max: ${Math.round(maxSize / 1024)}KB`);
        console.log(`   📊 Taille moyenne: ${Math.round((totalSize / (images.length * 2)) / 1024)}KB`);
        
        // Estimation du coût (approximatif pour GPT-4 Vision)
        const estimatedTokensPerImage = 1000; // Estimation conservative
        const totalTokens = images.length * 2 * estimatedTokensPerImage;
        const estimatedCost = (totalTokens / 1000) * 0.01; // $0.01 per 1K tokens (estimation)
        
        console.log('\n💰 Estimation des coûts (approximatif):');
        console.log(`   🎯 Tokens estimés: ~${totalTokens.toLocaleString()}`);
        console.log(`   💵 Coût estimé: ~$${estimatedCost.toFixed(2)}`);
        console.log(`   ⚠️  Ces estimations sont approximatives et peuvent varier`);
        
        console.log('\n✅ Analyse terminée !');
        console.log('\n🚀 Prochaines étapes:');
        console.log('   1. npm run test-processing  # Test avec simulation');
        console.log('   2. npm start               # Traitement complet');
        
    } catch (error) {
        console.error('\n❌ Erreur lors de l\'analyse:', error.message);
    }
}

if (require.main === module) {
    analyzeImages();
}
