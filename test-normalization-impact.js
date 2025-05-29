#!/usr/bin/env node

/**
 * Test de normalisation sur toute la base de données existante
 * Analyse l'impact de la normalisation sur tous les fichiers JSON existants
 */

const fs = require('fs');
const path = require('path');

try {
    console.log('📊 Analyse de l\'impact de la normalisation sur la base de données\n');
    
    const DataQualityValidator = require('./src/DataQualityValidator');
    
    // Configuration fictive pour les tests
    const testConfig = {
        dataQuality: {
            enabled: true,
            validateIngredients: true,
            autoCorrection: true
        }
    };

    const validator = new DataQualityValidator(null, testConfig);
    const outputDir = './output';
    
    console.log('📁 Lecture du dossier output...');
    
    // Charger tous les fichiers de recettes
    const recipeFiles = fs.readdirSync(outputDir)
        .filter(file => file.startsWith('recipe_') && file.endsWith('.json'))
        .sort();
    
    console.log(`📁 ${recipeFiles.length} fichiers de recettes trouvés\n`);
    
    let totalRecipes = 0;
    let totalIngredients = 0;
    let totalNormalizations = 0;
    const unitStats = {};
    const normalizationStats = {};
    
    for (const file of recipeFiles.slice(0, 5)) { // Limiter à 5 pour le test
        console.log(`📖 Traitement de ${file}...`);
        
        const filePath = path.join(outputDir, file);
        const recipeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        totalRecipes++;
        console.log(`   Titre: "${recipeData.title}"`);
        
        if (recipeData.ingredients && Array.isArray(recipeData.ingredients)) {
            totalIngredients += recipeData.ingredients.length;
            
            // Analyser les unités avant normalisation
            let recipeNormalizations = 0;
            
            recipeData.ingredients.forEach(ingredient => {
                if (ingredient.quantity && ingredient.quantity.unit) {
                    const originalUnit = ingredient.quantity.unit;
                    const normalizedUnit = validator.normalizeUnit(originalUnit);
                    
                    // Statistiques des unités
                    unitStats[originalUnit] = (unitStats[originalUnit] || 0) + 1;
                    
                    // Si normalisation nécessaire
                    if (originalUnit !== normalizedUnit) {
                        recipeNormalizations++;
                        totalNormalizations++;
                        
                        const mapping = `${originalUnit} → ${normalizedUnit}`;
                        normalizationStats[mapping] = (normalizationStats[mapping] || 0) + 1;
                        
                        console.log(`   📝 ${ingredient.name}: "${originalUnit}" → "${normalizedUnit}"`);
                    }
                }
            });
            
            if (recipeNormalizations === 0) {
                console.log('   ✅ Aucune normalisation nécessaire');
            } else {
                console.log(`   ✨ ${recipeNormalizations} normalisation(s) effectuée(s)`);
            }
        }
        
        console.log('');
    }
    
    // Afficher les statistiques globales
    console.log('📈 STATISTIQUES (échantillon)\n');
    console.log(`📊 Résumé :`);
    console.log(`   • ${totalRecipes} recettes analysées`);
    console.log(`   • ${totalIngredients} ingrédients total`);
    console.log(`   • ${totalNormalizations} normalisations effectuées`);
    
    if (totalIngredients > 0) {
        console.log(`   • ${(totalNormalizations / totalIngredients * 100).toFixed(1)}% d'ingrédients normalisés\n`);
    }
    
    console.log('🎉 Analyse terminée !');
    
} catch (error) {
    console.error('❌ Erreur :', error.message);
    console.error(error.stack);
}
