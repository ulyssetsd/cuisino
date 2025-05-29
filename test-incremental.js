// Test du système de traitement incrémental
const fs = require('fs-extra');
const path = require('path');

// Mock de RecipeProcessor pour les tests sans OpenAI
class MockRecipeProcessor {
    constructor() {
        this.inputDir = './recipes/compressed';
        this.outputDir = './output';
        this.config = {
            dataQuality: {
                enabled: true,
                validateIngredients: true,
                autoCorrection: false
            }
        };
    }

    async loadExistingRecipes() {
        const allRecipesPath = path.join(this.outputDir, 'all_recipes.json');
        if (await fs.pathExists(allRecipesPath)) {
            const data = await fs.readJson(allRecipesPath);
            return data.recipes || [];
        }
        return [];
    }    scanForImagePairs(inputDir) {
        const files = fs.readdirSync(inputDir)
            .filter(file => file.toLowerCase().endsWith('.jpg'))
            .sort();
        
        if (files.length % 2 !== 0) {
            throw new Error(`Nombre impair d'images trouvées (${files.length}). Il faut un nombre pair.`);
        }
        
        // Créer les paires : la première moitié = recto, la seconde moitié = verso
        const halfCount = files.length / 2;
        const rectoImages = files.slice(0, halfCount);
        const versoImages = files.slice(halfCount);
        
        const pairs = [];
        for (let i = 0; i < halfCount; i++) {
            pairs.push({
                recto: rectoImages[i],
                verso: versoImages[i],
                rectoPath: path.join(inputDir, rectoImages[i]),
                versoPath: path.join(inputDir, versoImages[i])
            });
        }
        
        return pairs;
    }determineImagesToProcess(imagePairs, existingRecipes) {
        const processedImages = new Set();
        
        // Marquer les images déjà traitées
        existingRecipes.forEach(recipe => {
            if (recipe.metadata?.originalFiles) {
                const rectoFile = recipe.metadata.originalFiles.recto;
                const versoFile = recipe.metadata.originalFiles.verso;
                processedImages.add(rectoFile);
                processedImages.add(versoFile);
            }
        });

        // Filtrer les paires non traitées
        return imagePairs.filter(pair => {
            return !processedImages.has(pair.recto) || !processedImages.has(pair.verso);
        });
    }

    shouldReprocessRecipe(recipe) {
        // Simuler la validation de qualité
        if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
            return true;
        }

        // Vérifier la qualité basique
        for (const ingredient of recipe.ingredients) {
            if (!ingredient.name || !ingredient.quantity) {
                return true; // Nécessite un retraitement
            }
            
            const { value, unit } = ingredient.quantity;
            if (value === null && unit && unit !== '') {
                return true; // Données incomplètes
            }
        }
        
        return false; // OK
    }
}

async function testIncrementalProcessing() {
    console.log('🧪 Test du système de traitement incrémental');
    console.log('===========================================');

    const config = {
        dataQuality: {
            enabled: true,
            validateIngredients: true,
            autoCorrection: false // Pas de correction pour le test
        },
        processing: {
            simulation: true // Mode simulation pour éviter les appels OpenAI
        }
    };    const processor = new MockRecipeProcessor();

    try {
        console.log('\n📊 Étape 1: Chargement des recettes existantes');
        const existingRecipes = await processor.loadExistingRecipes();
        console.log(`   📚 ${existingRecipes.length} recettes existantes trouvées`);

        console.log('\n📸 Étape 2: Scan des images disponibles');
        const imagePairs = processor.scanForImagePairs('./recipes/compressed');
        console.log(`   🖼️  ${imagePairs.length} paires d'images trouvées`);

        console.log('\n🎯 Étape 3: Détermination des images à traiter');
        const imagesToProcess = processor.determineImagesToProcess(imagePairs, existingRecipes);
        console.log(`   ⚡ ${imagesToProcess.length} images nécessitent un traitement`);
        console.log(`   💾 ${imagePairs.length - imagesToProcess.length} images déjà traitées (ignorées)`);

        if (imagesToProcess.length > 0) {
            console.log('\n📋 Détails des images à traiter:');
            imagesToProcess.slice(0, 5).forEach((pair, i) => {
                console.log(`   ${i + 1}. ${pair.recto} / ${pair.verso}`);
            });
            if (imagesToProcess.length > 5) {
                console.log(`   ... et ${imagesToProcess.length - 5} autres`);
            }
        }

        console.log('\n🔍 Étape 4: Test de validation de qualité sur recettes existantes');
        let recipesNeedingReprocessing = 0;
        
        // Tester quelques recettes existantes pour voir si elles ont besoin de retraitement
        const samplesToTest = Math.min(existingRecipes.length, 5);
        console.log(`   🧪 Test sur ${samplesToTest} recettes existantes...`);
        
        for (let i = 0; i < samplesToTest; i++) {
            const recipe = existingRecipes[i];
            const needsReprocessing = processor.shouldReprocessRecipe(recipe);
            
            if (needsReprocessing) {
                recipesNeedingReprocessing++;
                console.log(`   ⚠️  "${recipe.title}" nécessite un retraitement`);
            } else {
                console.log(`   ✅ "${recipe.title}" - qualité OK`);
            }
        }

        console.log('\n📈 Résumé du traitement incrémental:');
        console.log(`   📚 Recettes existantes: ${existingRecipes.length}`);
        console.log(`   🖼️  Paires d'images disponibles: ${imagePairs.length}`);
        console.log(`   🆕 Nouvelles images à traiter: ${imagesToProcess.length}`);
        console.log(`   🔧 Recettes existantes à retraiter: ${recipesNeedingReprocessing}/${samplesToTest} testées`);
        
        const totalWorkload = imagesToProcess.length + recipesNeedingReprocessing;
        const efficiency = Math.round(((imagePairs.length - totalWorkload) / imagePairs.length) * 100);
        
        console.log(`   ⚡ Charge de travail totale: ${totalWorkload}`);
        console.log(`   🎯 Efficacité du système incrémental: ${efficiency}% de réduction`);

        console.log('\n✅ Test du système incrémental terminé !');
        
        if (efficiency > 50) {
            console.log('🎉 Le système incrémental est très efficace !');
        } else if (efficiency > 0) {
            console.log('👍 Le système incrémental apporte une amélioration.');
        } else {
            console.log('⚠️  Le système incrémental n\'apporte pas d\'avantage dans ce contexte.');
        }

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        process.exit(1);
    }
}

// Lancer le test
testIncrementalProcessing();
