const fs = require('fs-extra');
const path = require('path');

async function cleanOutput() {
    const outputDir = './output';
    const tempDir = './temp';
    
    console.log('🧹 Nettoyage des dossiers de sortie...\n');
    
    try {
        // Nettoyer le dossier output
        if (await fs.pathExists(outputDir)) {
            const files = await fs.readdir(outputDir);
            if (files.length > 0) {
                console.log(`📁 Suppression de ${files.length} fichiers dans ${outputDir}/`);
                await fs.emptyDir(outputDir);
                console.log('✅ Dossier output nettoyé');
            } else {
                console.log('📁 Dossier output déjà vide');
            }
        }
        
        // Nettoyer le dossier temp
        if (await fs.pathExists(tempDir)) {
            const files = await fs.readdir(tempDir);
            if (files.length > 0) {
                console.log(`📁 Suppression de ${files.length} fichiers dans ${tempDir}/`);
                await fs.emptyDir(tempDir);
                console.log('✅ Dossier temp nettoyé');
            } else {
                console.log('📁 Dossier temp déjà vide');
            }
        }
        
        console.log('\n🎉 Nettoyage terminé !');
        console.log('🚀 Prêt pour un nouveau traitement');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error.message);
    }
}

if (require.main === module) {
    cleanOutput();
}

module.exports = { cleanOutput };
