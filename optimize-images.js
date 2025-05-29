const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Script d'optimisation d'images : rotation + compression pour réduire les coûts API
async function optimizeImagesForAPI() {
    console.log('🚀 Optimisation des images pour l\'API (rotation + compression)');
    
    const inputDir = 'recipes/uncompressed';
    const outputDir = 'recipes/compressed';
    
    // Configuration de compression optimisée pour OCR
    const compressionConfig = {
        quality: 85,        // Qualité réduite mais suffisante pour OCR
        progressive: true,  // JPEG progressif pour meilleur affichage
        mozjpeg: true      // Compression mozjpeg plus efficace
    };
    
    // Créer le dossier de sortie
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log('📁 Dossier créé:', outputDir);
    }
    
    // Lire les fichiers images
    const files = fs.readdirSync(inputDir).filter(file => 
        file.toLowerCase().endsWith('.jpg') || 
        file.toLowerCase().endsWith('.jpeg')
    );
      console.log(`📸 ${files.length} images trouvées`);
    
    let rotated = 0;
    let copied = 0;
    let errors = 0;
    let totalSizeBefore = 0;
    let totalSizeAfter = 0;
    
    for (let i = 0; i < files.length; i++) {
        const filename = files[i];
        const inputPath = path.join(inputDir, filename);
        const outputPath = path.join(outputDir, filename);
        
        console.log(`[${i + 1}/${files.length}] ${filename}`);
          try {
            // Taille du fichier original
            const originalStats = fs.statSync(inputPath);
            totalSizeBefore += originalStats.size;
            
            // Lire les métadonnées
            const metadata = await sharp(inputPath).metadata();
            console.log(`   📊 ${metadata.width}x${metadata.height}, EXIF: ${metadata.orientation || 'Aucune'}, Taille: ${(originalStats.size / 1024 / 1024).toFixed(1)}MB`);
              // Déterminer si rotation nécessaire
            if (metadata.orientation === 6 || metadata.orientation === 8) {
                console.log('   🔄 Rotation + compression...');
                
                await sharp(inputPath)
                    .rotate() // Applique EXIF
                    .rotate(-90) // Rotation counter-clockwise
                    .jpeg(compressionConfig)
                    .toFile(outputPath);
                
                console.log('   ✅ Image pivotée et compressée');
                rotated++;
                
            } else if (metadata.height > metadata.width) {
                console.log('   🔄 Rotation + compression...');
                
                await sharp(inputPath)
                    .rotate(-90)
                    .jpeg(compressionConfig)
                    .toFile(outputPath);
                
                console.log('   ✅ Image pivotée et compressée');
                rotated++;
                
            } else {
                console.log('   📦 Compression sans rotation...');
                
                await sharp(inputPath)
                    .jpeg(compressionConfig)
                    .toFile(outputPath);
                
                console.log('   ✅ Image compressée');
                copied++;
            }
            
            // Calculer la taille après traitement
            const processedStats = fs.statSync(outputPath);
            totalSizeAfter += processedStats.size;
            
            const compressionRatio = ((originalStats.size - processedStats.size) / originalStats.size * 100).toFixed(1);
            console.log(`   💾 Compression: ${compressionRatio}% (${(processedStats.size / 1024 / 1024).toFixed(1)}MB)`);
            
        } catch (error) {
            console.log(`   ❌ Erreur: ${error.message}`);
            errors++;
        }
        
        // Pause entre les images pour éviter la surcharge
        if (i < files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
      console.log('\n📊 RÉSUMÉ');
    console.log(`═══════════════════════`);
    console.log(`📸 Images traitées: ${files.length}`);
    console.log(`🔄 Images pivotées: ${rotated}`);
    console.log(`📦 Images compressées: ${copied}`);
    console.log(`❌ Erreurs: ${errors}`);
    console.log(`\n💾 COMPRESSION`);
    console.log(`Taille avant: ${(totalSizeBefore / 1024 / 1024).toFixed(1)}MB`);
    console.log(`Taille après: ${(totalSizeAfter / 1024 / 1024).toFixed(1)}MB`);
    console.log(`Économie: ${((totalSizeBefore - totalSizeAfter) / 1024 / 1024).toFixed(1)}MB (${((totalSizeBefore - totalSizeAfter) / totalSizeBefore * 100).toFixed(1)}%)`);
    console.log(`\n🎉 Terminé ! Résultats dans: ${outputDir}`);
}

// Exécuter si c'est le script principal
if (require.main === module) {
    optimizeImagesForAPI().catch(error => {
        console.error('❌ Erreur fatale:', error.message);
        process.exit(1);
    });
}

module.exports = optimizeImagesForAPI;
