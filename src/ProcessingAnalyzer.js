/**
 * Analyseur de traitement incrémental
 * Responsabilité unique : Déterminer quelles recettes doivent être traitées
 */
const path = require('path');

class ProcessingAnalyzer {
    constructor(dataQualityValidator) {
        this.dataQualityValidator = dataQualityValidator;
    }

    /**
     * Détermine quelles images nécessitent un traitement
     */
    async determineImagesToProcess(images, existingRecipes) {
        const imagesToProcess = [];

        for (let i = 0; i < images.length; i++) {
            const { recto, verso } = images[i];
            const existingRecipe = existingRecipes[i];

            // Si pas de recette existante, traiter
            if (!existingRecipe) {
                imagesToProcess.push({
                    imageIndex: i,
                    recto,
                    verso,
                    reason: 'Nouvelle recette'
                });
                continue;
            }

            // Vérifier si retraitement nécessaire
            const shouldReprocess = await this.shouldReprocessRecipe(existingRecipe, recto, verso, i);

            if (shouldReprocess.reprocess) {
                imagesToProcess.push({
                    imageIndex: i,
                    recto,
                    verso,
                    reason: shouldReprocess.reason
                });
            }
        }

        return imagesToProcess;
    }

    /**
     * Détermine si une recette doit être retraitée
     */
    async shouldReprocessRecipe(recipe, rectoPath, versoPath, index) {
        // Vérifier si les fichiers sources correspondent
        const filesMismatch = this.checkFilesMismatch(recipe, rectoPath, versoPath);
        if (filesMismatch.mismatch) {
            return {
                reprocess: true,
                reason: filesMismatch.reason
            };
        }

        // Évaluer la qualité des données
        return this.evaluateDataQuality(recipe, index);
    }

    /**
     * Vérifie si les fichiers sources correspondent
     */
    checkFilesMismatch(recipe, rectoPath, versoPath) {
        if (!recipe.metadata?.originalFiles) {
            return { mismatch: false };
        }

        const currentRecto = path.basename(rectoPath);
        const currentVerso = path.basename(versoPath);
        const existingRecto = recipe.metadata.originalFiles.recto;
        const existingVerso = recipe.metadata.originalFiles.verso;

        if (currentRecto !== existingRecto || currentVerso !== existingVerso) {
            return {
                mismatch: true,
                reason: `Fichiers sources différents (${currentRecto}/${currentVerso} vs ${existingRecto}/${existingVerso})`
            };
        }

        return { mismatch: false };
    }

    /**
     * Évalue la qualité des données
     */
    evaluateDataQuality(recipe, index) {
        console.log(`   🔍 Évaluation qualité recette ${index + 1}: "${recipe.title}"`);

        try {
            const qualityIssues = this.dataQualityValidator.detectDataQualityIssues(recipe);

            if (qualityIssues.length > 0) {
                const totalProblems = qualityIssues.reduce((sum, issue) => sum + issue.problems.length, 0);
                console.log(`   ⚠️ ${qualityIssues.length} ingrédient(s) avec ${totalProblems} problème(s) de qualité`);

                // Afficher quelques exemples de problèmes
                this.logQualityIssues(qualityIssues);

                return {
                    reprocess: true,
                    reason: `Qualité des données insuffisante (${totalProblems} problèmes détectés)`
                };
            } else {
                console.log(`   ✅ Qualité des données satisfaisante`);
                return {
                    reprocess: false,
                    reason: null
                };
            }
        } catch (error) {
            console.log(`   ⚠️ Erreur lors de l'évaluation qualité: ${error.message}`);
            return {
                reprocess: true,
                reason: `Erreur lors de l'évaluation qualité: ${error.message}`
            };
        }
    }

    /**
     * Affiche les problèmes de qualité détectés
     */
    logQualityIssues(qualityIssues) {
        qualityIssues.slice(0, 3).forEach(issue => {
            console.log(`     • "${issue.ingredient.name}": ${issue.problems.join(', ')}`);
        });

        if (qualityIssues.length > 3) {
            console.log(`     • ... et ${qualityIssues.length - 3} autre(s) ingrédient(s)`);
        }
    }
}

module.exports = ProcessingAnalyzer;
